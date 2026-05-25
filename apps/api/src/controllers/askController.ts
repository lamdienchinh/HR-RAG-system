import { type Request, type Response } from "express";
import { sanitizeInput } from "../lib/sanitize.js";
import { analyzeQuery } from "../lib/agent/query-analyzer.js";
import { getGreetingResponse } from "../lib/greeting.js";
import { retrieveChunks } from "../lib/reindex.js";
import { answerQuestion } from "../lib/answer.js";
import { runAgent, type AgentOptions } from "../lib/agent/index.js";
import {
  sendError,
  sendStreamEvent,
  parseAskBody,
  streamAnswerTokens,
  AskBody,
} from "../helpers/apiHelpers.js";

export const askStandard = async (
  request: Request<Record<string, never>, unknown, AskBody>,
  response: Response,
) => {
  try {
    const body = parseAskBody(request.body);
    const sanitizeResult = sanitizeInput(body.question);
    if (!sanitizeResult.safe) {
      sendError(response, new Error("Câu hỏi không hợp lệ."), 400);
      return;
    }

    const analysis = await analyzeQuery(sanitizeResult.cleaned);
    if (analysis.intent === "greeting") {
      response.json({
        question: body.question,
        answer: getGreetingResponse(),
        mode: "gemini",
        model: "greeting-detector",
        warning: null,
        confidence: null,
        citations: [],
        retrievedChunks: [],
        externalSources: [],
        notFound: false,
      });
      return;
    }
    if (analysis.intent === "off_topic") {
      response.json({
        question: body.question,
        answer:
          "Tôi chỉ hỗ trợ về chính sách nhân sự. Bạn có câu hỏi nào về HR không?",
        mode: "gemini",
        model: "intent-classifier",
        warning: null,
        confidence: null,
        citations: [],
        retrievedChunks: [],
        externalSources: [],
        notFound: false,
      });
      return;
    }
    if (analysis.intent === "injection") {
      sendError(response, new Error("Câu hỏi không được phép."), 400);
      return;
    }

    const isAdmin = request.user?.role === "admin";
    const { chunks: retrievedChunks } = await retrieveChunks(
      sanitizeResult.cleaned,
      body.topK,
      isAdmin,
    );
    const result = await answerQuestion(
      sanitizeResult.cleaned,
      retrievedChunks,
      body.options,
    );
    response.json(result);
  } catch (error) {
    sendError(response, error);
  }
};

export const askStream = async (
  request: Request<Record<string, never>, unknown, AskBody>,
  response: Response,
) => {
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  try {
    const body = parseAskBody(request.body);
    const sanitizeResult = sanitizeInput(body.question);
    if (!sanitizeResult.safe) {
      sendStreamEvent(response, "error", { error: "Câu hỏi không hợp lệ." });
      response.end();
      return;
    }

    const analysis = await analyzeQuery(sanitizeResult.cleaned);
    if (analysis.intent === "greeting") {
      const greetingAnswer = getGreetingResponse();
      sendStreamEvent(response, "evidence", {
        question: body.question,
        mode: "gemini",
        model: "greeting-detector",
        warning: null,
        citations: [],
        retrievedChunks: [],
        externalSources: [],
      });
      await streamAnswerTokens(response, greetingAnswer);
      sendStreamEvent(response, "done", {
        result: {
          question: body.question,
          answer: greetingAnswer,
          mode: "gemini",
          model: "greeting-detector",
          warning: null,
          confidence: null,
          citations: [],
          retrievedChunks: [],
          externalSources: [],
          notFound: false,
        },
      });
      return;
    }

    if (analysis.intent === "off_topic") {
      const offTopicAnswer =
        "Tôi chỉ hỗ trợ về chính sách nhân sự. Bạn có câu hỏi nào về HR không?";
      sendStreamEvent(response, "evidence", {
        question: body.question,
        mode: "gemini",
        model: "intent-classifier",
        warning: null,
        citations: [],
        retrievedChunks: [],
        externalSources: [],
      });
      await streamAnswerTokens(response, offTopicAnswer);
      sendStreamEvent(response, "done", {
        result: {
          question: body.question,
          answer: offTopicAnswer,
          mode: "gemini",
          model: "intent-classifier",
          warning: null,
          confidence: null,
          citations: [],
          retrievedChunks: [],
          externalSources: [],
          notFound: false,
        },
      });
      return;
    }

    if (analysis.intent === "injection") {
      sendStreamEvent(response, "error", { error: "Câu hỏi không được phép." });
      response.end();
      return;
    }

    const isAdmin = request.user?.role === "admin";
    const { chunks: retrievedChunks } = await retrieveChunks(
      sanitizeResult.cleaned,
      body.topK,
      isAdmin,
    );
    const result = await answerQuestion(
      sanitizeResult.cleaned,
      retrievedChunks,
      body.options,
    );
    sendStreamEvent(response, "evidence", {
      question: result.question,
      mode: result.mode,
      model: result.model,
      warning: result.warning,
      citations: result.citations,
      retrievedChunks: result.retrievedChunks,
      externalSources: result.externalSources,
    });
    await streamAnswerTokens(response, result.answer);
    sendStreamEvent(response, "done", { result });
  } catch (error) {
    sendStreamEvent(response, "error", {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    response.end();
  }
};

export const askAgent = async (
  request: Request<Record<string, never>, unknown, AskBody>,
  response: Response,
) => {
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  try {
    const body = parseAskBody(request.body);
    const sanitizeResult = sanitizeInput(body.question);
    if (!sanitizeResult.safe) {
      sendStreamEvent(response, "error", { error: "Câu hỏi không hợp lệ." });
      response.end();
      return;
    }

    const isAdmin = request.user?.role === "admin";
    const agentOptions: AgentOptions = {
      minScore: body.options.minScore,
      allowExternalSearch: body.options.allowExternalSearch,
      topK: body.topK,
      geminiModel: body.options.geminiModel,
      isAdmin,
    };

    const result = await runAgent(sanitizeResult.cleaned, {
      ...agentOptions,
      onAnalysis: (analysis) => {
        sendStreamEvent(response, "agent_analysis", {
          queryAnalysis: analysis,
          strategy: analysis.suggestedStrategy,
        });
      },
      onStep: (step) => {
        sendStreamEvent(response, "agent_step", { ...step } as Record<
          string,
          unknown
        >);
      },
    });

    sendStreamEvent(response, "evidence", {
      question: result.question,
      mode: result.mode,
      model: result.model,
      warning: result.warning,
      citations: result.citations,
      retrievedChunks: result.retrievedChunks,
      externalSources: [],
    });
    await streamAnswerTokens(response, result.answer, 10);
    sendStreamEvent(response, "done", {
      result: {
        question: result.question,
        answer: result.answer,
        mode: result.mode,
        model: result.model,
        warning: result.warning,
        confidence: null,
        citations: result.citations,
        retrievedChunks: result.retrievedChunks,
        externalSources: [],
        agentTrace: result.agentTrace,
        iterations: result.iterations,
        strategy: result.strategy,
        queryAnalysis: result.queryAnalysis,
      },
    });
  } catch (error) {
    sendStreamEvent(response, "error", {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    response.end();
  }
};
