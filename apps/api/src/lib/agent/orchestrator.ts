import {
  answerQuestion,
  answerQuestionStream,
  type AnswerOptions,
  type AnswerStreamOptions,
} from "../answer.js";
import type { RetrievedChunk } from "../types.js";
import { config } from "../../config.js";
import { runGeminiAgenticStep, type AgenticStepMessage } from "./gemini-client.js";
import { executeTool } from "./tools.js";
import type { QueryAnalysis } from "./query-analyzer.js";

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

export interface AgentOptions {
  readonly minScore: number;
  readonly allowExternalSearch: boolean;
  readonly topK: number;
  readonly geminiModel?: string;
  readonly isAdmin?: boolean;
  readonly currentUserId?: string; // Mã số nhân viên đang thực hiện trò chuyện
  readonly skipReranker?: boolean; // Tắt Rerank để tối ưu hóa độ trễ
  readonly embeddingProvider?: "local" | "cloud"; // Lựa chọn nhà cung cấp embeddings
  readonly conversationHistory?: readonly {
    readonly role: string;
    readonly content: string;
  }[];
  readonly onStep?: OnStepCallback;
  readonly onAnalysis?: OnAnalysisCallback;
  readonly onToken?: (text: string) => void;
}

/**
 * Agentic RAG Loop Orchestrator (ReAct Loop)
 * Loops up to 3 times calling a cheap Reasoning Model (Gemma 4 MoE) to select
 * tools and analyze results, then uses the main Answering Model (Gemini)
 * to format and present the final answer with citations.
 */
export const runAgent = async (question: string, options: AgentOptions): Promise<AgentResult> => {
  const traceSteps: AgentTraceStep[] = [];
  const totalStart = Date.now();
  const { onStep, onAnalysis } = options;

  const emit = (step: AgentTraceStep): void => {
    traceSteps.push(step);
    onStep?.(step);
  };

  // 1. Initialize ReAct Scratchpad (including history)
  const messages: AgenticStepMessage[] = [];
  if (options.conversationHistory) {
    for (const turn of options.conversationHistory) {
      messages.push({
        role: turn.role === "assistant" ? "model" : "user",
        parts: [{ text: turn.content }],
      });
    }
  }
  messages.push({
    role: "user",
    parts: [{ text: question }],
  });

  let iterations = 0;
  let allRetrievedChunks: RetrievedChunk[] = [];
  let finalAnswerModel = config.geminiModel;
  let hasCalledPoliciesTool = false;
  let finalAnswerText = "";
  const executedToolSummaries = new Map<string, string>();

  const systemInstruction =
    "You are a professional HR assistant. Help the employee with their queries. " +
    "Use your tools to lookup information. Always search policies if they ask about rules, allowances, or entitlements. " +
    "Do not assume or guess if you lack information.";

  // 2. Core ReAct loop (Max 3 steps to conserve tokens and reduce latency)
  while (iterations < 3) {
    iterations++;
    const stepStart = Date.now();

    const agentResult = await runGeminiAgenticStep(
      messages,
      systemInstruction,
      config.geminiModel, // Sử dụng mô hình chính xác đã cấu hình (ví dụ: gemini-3.5-flash) để tránh thử/sai gây chậm trễ
      0.15, // Low temperature for high precision and strict reasoning
    );

    const stepDuration = Date.now() - stepStart;
    finalAnswerModel = agentResult.model;

    if (agentResult.functionCalls && agentResult.functionCalls.length > 0) {
      // LLM wants to call one or more tools
      const callDescriptions = agentResult.functionCalls
        .map((fc) => `${fc.name}(${JSON.stringify(fc.args)})`)
        .join(", ");

      emit(
        createTraceStep(
          "analyze",
          `Lý luận Agent (Lượt ${iterations})`,
          `Quyết định gọi công cụ: ${callDescriptions}`,
          stepDuration,
        ),
      );

      // Record function calls to model history
      messages.push({
        role: "model",
        parts: agentResult.functionCalls.map((fc) => ({
          functionCall: { name: fc.name, args: fc.args },
        })),
      });

      // Execute tools locally and append results
      const responseParts = [];
      for (const fc of agentResult.functionCalls) {
        const toolStart = Date.now();
        const toolResult = await executeTool(fc.name, fc.args, {
          currentUserId: options.currentUserId,
          topK: options.topK,
          minScore: options.minScore,
          isAdmin: options.isAdmin,
          skipReranker: options.skipReranker,
          embeddingProvider: options.embeddingProvider,
          originalQuestion: question,
        });
        const toolDuration = Date.now() - toolStart;

        if (fc.name === "calculate_leave_balance") {
          executedToolSummaries.set(
            "calculate_leave_balance",
            `- Số ngày phép năm của nhân viên (Mã: ${toolResult.employeeId}, Tên: ${toolResult.employeeName}): ` +
              `Tổng số ngày phép: ${toolResult.totalLeaveDays} ngày, ` +
              `Đã nghỉ: ${toolResult.usedLeaveDays} ngày, ` +
              `Còn lại (Khả dụng): ${toolResult.remainingLeaveDays} ngày.`,
          );
        } else if (fc.name === "get_current_date") {
          executedToolSummaries.set(
            "get_current_date",
            `- Ngày hiện tại từ hệ thống: ${toolResult.currentDate}.`,
          );
        }

        if (fc.name === "search_hr_policies") {
          hasCalledPoliciesTool = true;
          // Accumulate chunks
          if (toolResult.chunks) {
            allRetrievedChunks.push(...toolResult.chunks);
          }
        }

        // Xây dựng bản báo cáo kiểm toán chi tiết cho từng công cụ để hiển thị lên Dialog Modal
        let toolDetail = "";
        if (fc.name === "search_hr_policies") {
          const chunksList = toolResult.chunks || [];
          toolDetail =
            `[CÔNG CỤ TÌM KIẾM CHÍNH SÁCH: search_hr_policies]\n` +
            `• Từ khóa truy vấn: "${fc.args.query}"\n` +
            `• Số lượng tài liệu tìm thấy: ${chunksList.length} chunks\n\n` +
            `--- DANH SÁCH CÁC CHUNK TÀI LIỆU TRUY XUẤT ---\n\n` +
            chunksList
              .map((c: any, i: number) => {
                return (
                  `[CHUNK TÀI LIỆU #${i + 1}]\n` +
                  `- ID: ${c.id}\n` +
                  `- Chính sách: ${c.title} (v${c.version})\n` +
                  `- Trạng thái: ${c.status === "current" ? "Đang áp dụng (current)" : c.status}\n` +
                  `- Độ tương đồng (Similarity Score): ${Math.round(c.score * 100)}%\n` +
                  `- Tính bảo mật: ${c.isPrivate ? "Bảo mật (Confidential)" : "Nội bộ (Internal)"}\n` +
                  `- Nội dung chi tiết:\n` +
                  `========================================================================\n` +
                  `${c.content}\n` +
                  `========================================================================`
                );
              })
              .join("\n\n");
        } else if (fc.name === "get_current_date") {
          toolDetail =
            `[CÔNG CỤ THỜI GIAN: get_current_date]\n` +
            `• Kết quả trả về từ hệ thống: "${toolResult.currentDate}"`;
        } else if (fc.name === "calculate_leave_balance") {
          toolDetail =
            `[CÔNG CỤ TRA CỨU PHÉP NĂM: calculate_leave_balance]\n` +
            `• Mã nhân viên: ${toolResult.employeeId}\n` +
            `• Họ và tên: ${toolResult.employeeName}\n` +
            `• Tổng số ngày phép: ${toolResult.totalLeaveDays} ngày\n` +
            `• Đã nghỉ: ${toolResult.usedLeaveDays} ngày\n` +
            `• Còn lại (Khả dụng): ${toolResult.remainingLeaveDays} ngày`;
        } else {
          toolDetail = `Kết quả: ${JSON.stringify(toolResult, null, 2)}`;
        }

        emit(createTraceStep("retrieve", `Thực thi Công cụ: ${fc.name}`, toolDetail, toolDuration));

        responseParts.push({
          functionResponse: { name: fc.name, response: toolResult },
        });
      }

      messages.push({
        role: "user",
        parts: responseParts,
      });
    } else {
      // LLM generated a text response directly (no tools needed)
      finalAnswerText = agentResult.text ?? "";
      emit(
        createTraceStep(
          "analyze",
          `Lý luận Agent (Lượt ${iterations})`,
          `Đã có câu trả lời trực tiếp hoặc thông tin tự suy luận: "${finalAnswerText.slice(0, 100)}..."`,
          stepDuration,
        ),
      );
      break; // Exit ReAct loop
    }
  }

  // 3. Generate Final Answer (Dual-Model Strategy)
  const answerOptions: AnswerOptions = {
    minScore: options.minScore,
    allowExternalSearch: options.allowExternalSearch,
    topK: options.topK,
    geminiModel: options.geminiModel, // Main model chosen by user (e.g., Gemini 2.5 Flash)
    conversationHistory: options.conversationHistory,
  };

  // Simulated QueryAnalysis to keep front-end happy and preserve schema compatibility
  const simulatedAnalysis: QueryAnalysis = {
    intent: hasCalledPoliciesTool ? "policy_lookup" : "greeting",
    complexity: "simple",
    subQueries: [],
    suggestedStrategy: "direct",
    keyEntities: [],
    reasoning: `Xử lý tự động qua Agentic Loop (${iterations} lượt).`,
  };
  onAnalysis?.(simulatedAnalysis);

  const scoreStart = Date.now();

  // Deduplicate and sort all retrieved chunks across all iterations by score
  if (allRetrievedChunks.length > 0) {
    const bestChunksMap = new Map<string, RetrievedChunk>();
    for (const chunk of allRetrievedChunks) {
      const existing = bestChunksMap.get(chunk.id);
      if (!existing || chunk.score > existing.score) {
        bestChunksMap.set(chunk.id, chunk);
      }
    }
    allRetrievedChunks = Array.from(bestChunksMap.values()).sort((a, b) => b.score - a.score);
  }

  // If the agent retrieved policies, we let our High-Quality Main Model format the final answer!
  if (hasCalledPoliciesTool && allRetrievedChunks.length > 0) {
    let augmentedQuestion = question;
    if (executedToolSummaries.size > 0) {
      augmentedQuestion =
        `[BỐI CẢNH THỰC TẾ HỆ THỐNG]\n` +
        `*(Đây là thông tin thực tế từ hệ thống, hãy dùng nó để trả lời trực tiếp câu hỏi mà KHÔNG được viết kèm bất kỳ nhãn trích dẫn nào cho bối cảnh này, và tuyệt đối KHÔNG viết cụm từ "[BỐI CẢNH THỰC TẾ HỆ THỐNG]" hay bất kỳ thẻ bối cảnh nào vào câu trả lời)*\n` +
        Array.from(executedToolSummaries.values()).join("\n") +
        `\n\n[CÂU HỎI CỦA NGƯỜI DÙNG]\n` +
        question;
    }

    if (options.onToken) {
      // Streaming path with main model
      let streamedText = "";
      let answerResult = {
        mode: "gemini" as const,
        model: options.geminiModel || "gemini-2.5-flash",
        warning: null as string | null,
        citations: [] as readonly RetrievedChunk[],
      };

      const streamOptions: AnswerStreamOptions = {
        ...answerOptions,
        onToken: options.onToken,
      };

      for await (const event of answerQuestionStream(
        augmentedQuestion,
        allRetrievedChunks,
        streamOptions,
      )) {
        if (event.type === "token" && event.text) {
          streamedText += event.text;
        } else if (event.type === "done" && event.result) {
          answerResult = {
            mode: event.result.mode,
            model: event.result.model,
            warning: event.result.warning,
            citations: event.result.citations,
          };
        }
      }

      emit(
        createTraceStep(
          "generate",
          "Tổng hợp câu trả lời (Mô hình chính)",
          `${answerResult.citations.length} trích dẫn, Mode: ${answerResult.mode}, Model: ${answerResult.model}`,
          Date.now() - scoreStart,
        ),
      );

      return {
        question,
        answer: streamedText,
        mode: answerResult.mode,
        model: answerResult.model,
        warning: answerResult.warning,
        citations: answerResult.citations,
        retrievedChunks: allRetrievedChunks,
        agentTrace: { steps: traceSteps, totalDuration: Date.now() - totalStart },
        iterations,
        strategy: "agentic_react",
        queryAnalysis: simulatedAnalysis,
      };
    } else {
      // Non-streaming path with main model
      const answerResult = await answerQuestion(
        augmentedQuestion,
        allRetrievedChunks,
        answerOptions,
      );

      emit(
        createTraceStep(
          "generate",
          "Tổng hợp câu trả lời (Mô hình chính)",
          `${answerResult.citations.length} trích dẫn, Mode: ${answerResult.mode}, Model: ${answerResult.model}`,
          Date.now() - scoreStart,
        ),
      );

      return {
        question,
        answer: answerResult.answer,
        mode: answerResult.mode,
        model: answerResult.model,
        warning: answerResult.warning,
        citations: answerResult.citations,
        retrievedChunks: allRetrievedChunks,
        agentTrace: { steps: traceSteps, totalDuration: Date.now() - totalStart },
        iterations,
        strategy: "agentic_react",
        queryAnalysis: simulatedAnalysis,
      };
    }
  }

  // Fallback / Small talk: If no policy lookup tool was called, return the cheap model's text directly!
  // This saves massive token counts and resolves greetings/thanks in exactly 1 cheap API call.
  if (options.onToken) {
    // Stream tokens manually for small talk if requested
    const chars = finalAnswerText.split("");
    for (let i = 0; i < chars.length; i += 5) {
      const chunk = chars.slice(i, i + 5).join("");
      options.onToken(chunk);
      await new Promise((resolve) => setTimeout(resolve, 10)); // simulate typing delay
    }
  }

  emit(
    createTraceStep(
      "generate",
      "Tổng hợp câu trả lời (Mô hình rẻ)",
      `Không dùng tài liệu, phản hồi trực tiếp bằng ${finalAnswerModel}`,
      Date.now() - scoreStart,
    ),
  );

  return {
    question,
    answer: finalAnswerText,
    mode: "gemini",
    model: finalAnswerModel,
    warning: null,
    citations: [],
    retrievedChunks: [],
    agentTrace: { steps: traceSteps, totalDuration: Date.now() - totalStart },
    iterations,
    strategy: "agentic_direct",
    queryAnalysis: simulatedAnalysis,
  };
};
