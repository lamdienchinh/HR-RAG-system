import { answerQuestion, answerQuestionStream, type AnswerOptions, type AnswerStreamOptions } from "../answer.js";
import type { RetrievedChunk } from "../types.js";
import { analyzeQuery, type QueryAnalysis } from "./query-analyzer.js";
import { executeRetrieval } from "./retrieval-engine.js";

// --- Types ---

export interface AgentTraceStep {
  readonly type: "analyze" | "retrieve" | "generate";
  readonly label: string;
  readonly detail: string;
  readonly duration: number;
  readonly timestamp: number;
}

export interface AgentTrace {
  readonly steps: readonly AgentTraceStep[];
  readonly totalDuration: number;
}

export interface AgentResult {
  readonly question: string;
  readonly answer: string;
  readonly mode: "gemini";
  readonly model: string;
  readonly warning: string | null;
  readonly citations: readonly RetrievedChunk[];
  readonly retrievedChunks: readonly RetrievedChunk[];
  readonly agentTrace: AgentTrace;
  readonly iterations: number;
  readonly strategy: string;
  readonly queryAnalysis: QueryAnalysis;
}

type OnStepCallback = (step: AgentTraceStep) => void;
type OnAnalysisCallback = (analysis: QueryAnalysis) => void;

// --- Helpers ---

const createTraceStep = (
  type: AgentTraceStep["type"],
  label: string,
  detail: string,
  durationMs: number,
): AgentTraceStep => ({
  type,
  label,
  detail,
  duration: Math.max(1, Math.round(durationMs)),
  timestamp: Date.now(),
});

// --- Orchestrator ---

export interface AgentOptions {
  readonly minScore: number;
  readonly allowExternalSearch: boolean;
  readonly topK: number;
  readonly geminiModel?: string;
  readonly isAdmin?: boolean;
  readonly conversationHistory?: readonly {
    readonly role: string;
    readonly content: string;
  }[];
  readonly onStep?: OnStepCallback;
  readonly onAnalysis?: OnAnalysisCallback;
  readonly onToken?: (text: string) => void;
}

/**
 * Agentic RAG pipeline: analyze → retrieve → answer.
 * Non-policy intents (greeting, meta, off_topic, injection) are handled
 * by the caller (api.ts) before reaching this function.
 */
export const runAgent = async (
  question: string,
  options: AgentOptions,
): Promise<AgentResult> => {
  const traceSteps: AgentTraceStep[] = [];
  const totalStart = Date.now();
  const { onStep, onAnalysis } = options;

  const emit = (step: AgentTraceStep): void => {
    traceSteps.push(step);
    onStep?.(step);
  };

  // Step 1: Analyze query (intent, complexity, strategy)
  const analyzeStart = Date.now();
  const queryAnalysis = await analyzeQuery(question);
  const analyzeDuration = Date.now() - analyzeStart;
  onAnalysis?.(queryAnalysis);
  emit(
    createTraceStep(
      "analyze",
      "Query Analysis",
      `Intent: ${queryAnalysis.intent}, Complexity: ${queryAnalysis.complexity}, Strategy: ${queryAnalysis.suggestedStrategy}. ${queryAnalysis.reasoning}`,
      analyzeDuration,
    ),
  );

  // Step 2: Retrieve (strategy-based: direct, decompose, multi_retrieve)
  const answerOptions: AnswerOptions = {
    minScore: options.minScore,
    allowExternalSearch: options.allowExternalSearch,
    topK: options.topK,
    geminiModel: options.geminiModel,
    conversationHistory: options.conversationHistory,
  };

  const retrieveStart = Date.now();
  const retrievalResult = await executeRetrieval(queryAnalysis, question, {
    topK: options.topK,
    isAdmin: options.isAdmin,
  });
  emit(
    createTraceStep(
      "retrieve",
      "Retrieval",
      `Strategy: ${retrievalResult.strategy}, Queries: [${retrievalResult.queries.map((q) => `"${q.slice(0, 50)}"`).join(", ")}], Chunks: ${retrievalResult.chunks.length}`,
      Date.now() - retrieveStart,
    ),
  );

  // Step 3: Generate answer (streaming if onToken provided)
  const scoreStart = Date.now();

  if (options.onToken) {
    // Real streaming path
    let answerText = "";
    let answerResult: Omit<AgentResult, "answer" | "agentTrace" | "iterations" | "strategy" | "queryAnalysis"> = {
      question,
      mode: "gemini" as const,
      model: "",
      warning: null,
      citations: [],
      retrievedChunks: retrievalResult.chunks,
    };

    const streamOptions: AnswerStreamOptions = {
      ...answerOptions,
      onToken: options.onToken,
    };

    for await (const event of answerQuestionStream(question, retrievalResult.chunks, streamOptions)) {
      if (event.type === "token" && event.text) {
        answerText += event.text;
      } else if (event.type === "done" && event.result) {
        answerResult = {
          question,
          mode: event.result.mode,
          model: event.result.model,
          warning: event.result.warning,
          citations: event.result.citations,
          retrievedChunks: event.result.retrievedChunks,
        };
      }
    }

    emit(
      createTraceStep(
        "generate",
        "Answer",
        `${answerResult.citations.length} citations, Mode: ${answerResult.mode}, Model: ${answerResult.model}`,
        Date.now() - scoreStart,
      ),
    );

    const agentTrace: AgentTrace = {
      steps: traceSteps,
      totalDuration: Date.now() - totalStart,
    };

    return {
      question,
      answer: answerText,
      mode: answerResult.mode,
      model: answerResult.model,
      warning: answerResult.warning,
      citations: answerResult.citations,
      retrievedChunks: answerResult.retrievedChunks,
      agentTrace,
      iterations: 1,
      strategy: retrievalResult.strategy,
      queryAnalysis,
    };
  }

  // Non-streaming path (original)
  const answerResult = await answerQuestion(
    question,
    retrievalResult.chunks,
    answerOptions,
  );
  emit(
    createTraceStep(
      "generate",
      "Answer",
      `${answerResult.citations.length} citations, Mode: ${answerResult.mode}, Model: ${answerResult.model}`,
      Date.now() - scoreStart,
    ),
  );

  // Build final result
  const agentTrace: AgentTrace = {
    steps: traceSteps,
    totalDuration: Date.now() - totalStart,
  };

  return {
    question,
    answer: answerResult.answer,
    mode: answerResult.mode,
    model: answerResult.model,
    warning: answerResult.warning,
    citations: answerResult.citations,
    retrievedChunks: retrievalResult.chunks,
    agentTrace,
    iterations: 1,
    strategy: retrievalResult.strategy,
    queryAnalysis,
  };
};
