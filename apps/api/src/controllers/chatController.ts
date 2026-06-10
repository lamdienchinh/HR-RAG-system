import { type Request, type Response } from "express";
import {
  addMessage,
  assertConversationOwner,
  createConversation,
  deleteConversation,
  getConversationMessages,
  getConversationStatus,
  answerFromHistory,
  listConversations,
  renameConversation,
  getRecentMessages,
} from "../lib/conversations.js";
import { sanitizeInput } from "../lib/sanitize.js";
import { analyzeQuery } from "../lib/agent/query-analyzer.js";
import { getGreetingResponse } from "../lib/greeting.js";
import { retrieveChunks } from "../lib/reindex.js";
import { answerQuestion, answerQuestionStream } from "../lib/answer.js";
import { runAgent, type AgentOptions } from "../lib/agent/index.js";
import {
  sendError,
  sendStreamEvent,
  parseAskBody,
  streamAnswerTokens,
  AskBody,
} from "../helpers/apiHelpers.js";

export const getConversationsList = async (
  request: Request,
  response: Response
) => {
  response.json({ conversations: await listConversations(request.user!.id) });
};

export const createNewConversation = async (
  request: Request,
  response: Response
) => {
  try {
    const title =
      typeof (request.body as { title?: unknown })?.title === "string"
        ? (request.body as { title: string }).title.trim() || undefined
        : undefined;
    const conversation = await createConversation(title, request.user!.id);
    response.status(201).json({ conversation });
  } catch (error) {
    sendError(response, error);
  }
};

export const getMessagesByConversationId = async (
  request: Request<{ id: string }>,
  response: Response
) => {
  try {
    await assertConversationOwner(request.params.id, request.user!.id);
    const messages = await getConversationMessages(request.params.id);
    const status = await getConversationStatus(request.params.id);
    response.json({ messages, status });
  } catch (error) {
    sendError(
      response,
      error,
      error instanceof Error && error.message.includes("Access denied")
        ? 403
        : 400
    );
  }
};

export const getStatusByConversationId = async (
  request: Request<{ id: string }>,
  response: Response
) => {
  try {
    await assertConversationOwner(request.params.id, request.user!.id);
    const status = await getConversationStatus(request.params.id);
    response.json({ status });
  } catch (error) {
    sendError(
      response,
      error,
      error instanceof Error && error.message.includes("Access denied")
        ? 403
        : 400
    );
  }
};

export const updateConversationTitle = async (
  request: Request<{ id: string }>,
  response: Response
) => {
  try {
    await assertConversationOwner(request.params.id, request.user!.id);
    const title = (request.body as { title?: unknown })?.title;
    if (typeof title !== "string" || title.trim().length === 0) {
      sendError(response, new Error("title is required"));
      return;
    }
    const conversation = await renameConversation(request.params.id, title);
    if (!conversation) {
      sendError(
        response,
        new Error(`Unknown conversation id: ${request.params.id}`),
        404
      );
      return;
    }
    response.json({ conversation });
  } catch (error) {
    sendError(
      response,
      error,
      error instanceof Error && error.message.includes("Access denied")
        ? 403
        : 400
    );
  }
};

export const deleteConversationById = async (
  request: Request<{ id: string }>,
  response: Response
) => {
  try {
    await assertConversationOwner(request.params.id, request.user!.id);
    await deleteConversation(request.params.id);
    response.status(204).end();
  } catch (error) {
    sendError(
      response,
      error,
      error instanceof Error && error.message.includes("Access denied")
        ? 403
        : 404
    );
  }
};

export const askConversationAgent = async (
  request: Request<{ id: string }, unknown, AskBody>,
  response: Response
) => {
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  try {
    const conversationId = request.params.id;
    await assertConversationOwner(conversationId, request.user!.id);
    const body = parseAskBody(request.body);

    const status = await getConversationStatus(conversationId);
    if (status.isAtLimit) {
      sendStreamEvent(response, "error", {
        error: `Conversation reached ${status.limit} message limit. Start a new conversation.`,
      });
      response.end();
      return;
    }

    const sanitizeResult = sanitizeInput(body.question);
    if (!sanitizeResult.safe) {
      sendStreamEvent(response, "error", { error: "Câu hỏi không hợp lệ." });
      response.end();
      return;
    }

    await addMessage(conversationId, "user", body.question);
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
        conversationStatus: await getConversationStatus(conversationId),
      });
      await streamAnswerTokens(response, greetingAnswer);
      await addMessage(conversationId, "assistant", greetingAnswer, []);
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

    if (analysis.intent === "meta") {
      const metaAnswer = await answerFromHistory(
        sanitizeResult.cleaned,
        conversationId
      );
      sendStreamEvent(response, "evidence", {
        question: body.question,
        mode: "conversation-recall",
        model: null,
        warning: null,
        citations: [],
        retrievedChunks: [],
        externalSources: [],
        conversationStatus: await getConversationStatus(conversationId),
      });
      await streamAnswerTokens(response, metaAnswer);
      await addMessage(conversationId, "assistant", metaAnswer, []);
      sendStreamEvent(response, "done", {
        result: {
          question: body.question,
          answer: metaAnswer,
          mode: "conversation-recall",
          model: "local-history",
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
        conversationStatus: await getConversationStatus(conversationId),
      });
      await streamAnswerTokens(response, offTopicAnswer);
      await addMessage(conversationId, "assistant", offTopicAnswer, []);
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

    const recentAgentMessages = await getRecentMessages(conversationId, 6);
    const agentConversationHistory = recentAgentMessages
      .filter((m) => m.content !== body.question)
      .map((m) => ({ role: m.role, content: m.content }));

    const isAdmin = request.user?.role === "admin";
    const agentOptions: AgentOptions = {
      minScore: body.options.minScore,
      allowExternalSearch: body.options.allowExternalSearch,
      topK: body.topK,
      geminiModel: body.options.geminiModel,
      conversationHistory: agentConversationHistory,
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
      onToken: (text) => {
        sendStreamEvent(response, "token", { text });
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
      conversationStatus: await getConversationStatus(conversationId),
    });

    const citationRefs = (result.citations ?? []).map((c) => ({
      policyId: c.policyId,
      title: c.title,
      version: c.version,
      status: c.status,
    }));
    await addMessage(conversationId, "assistant", result.answer, citationRefs);

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

export const askConversationStandard = async (
  request: Request<{ id: string }, unknown, AskBody>,
  response: Response
) => {
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  try {
    const conversationId = request.params.id;
    await assertConversationOwner(conversationId, request.user!.id);
    const body = parseAskBody(request.body);

    const status = await getConversationStatus(conversationId);
    if (status.isAtLimit) {
      sendStreamEvent(response, "error", {
        error: `Conversation reached ${status.limit} message limit. Start a new conversation.`,
      });
      response.end();
      return;
    }

    const sanitizeResult = sanitizeInput(body.question);
    if (!sanitizeResult.safe) {
      sendStreamEvent(response, "error", { error: "Câu hỏi không hợp lệ." });
      response.end();
      return;
    }

    await addMessage(conversationId, "user", body.question);
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
        conversationStatus: await getConversationStatus(conversationId),
      });
      await streamAnswerTokens(response, greetingAnswer);
      await addMessage(conversationId, "assistant", greetingAnswer, []);
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

    if (analysis.intent === "meta") {
      const metaAnswer = await answerFromHistory(
        sanitizeResult.cleaned,
        conversationId
      );
      sendStreamEvent(response, "evidence", {
        question: body.question,
        mode: "conversation-recall",
        model: null,
        warning: null,
        citations: [],
        retrievedChunks: [],
        externalSources: [],
        conversationStatus: await getConversationStatus(conversationId),
      });
      await streamAnswerTokens(response, metaAnswer);
      await addMessage(conversationId, "assistant", metaAnswer, []);
      sendStreamEvent(response, "done", {
        result: {
          question: body.question,
          answer: metaAnswer,
          mode: "conversation-recall",
          model: "local-history",
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
        conversationStatus: await getConversationStatus(conversationId),
      });
      await streamAnswerTokens(response, offTopicAnswer);
      await addMessage(conversationId, "assistant", offTopicAnswer, []);
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
      isAdmin
    );

    const recentMessages = await getRecentMessages(conversationId, 6);
    const conversationHistory = recentMessages
      .filter((m) => m.content !== sanitizeResult.cleaned)
      .map((m) => ({ role: m.role, content: m.content }));

    let fullAnswer = "";
    let doneResult: Record<string, unknown> | null = null;

    for await (const event of answerQuestionStream(
      sanitizeResult.cleaned,
      retrievedChunks,
      { ...body.options, conversationHistory },
    )) {
      if (event.type === "token" && event.text) {
        fullAnswer += event.text;
        sendStreamEvent(response, "token", { text: event.text });
      } else if (event.type === "done" && event.result) {
        doneResult = {
          ...event.result,
          question: sanitizeResult.cleaned,
          answer: fullAnswer,
        };
        sendStreamEvent(response, "evidence", {
          question: sanitizeResult.cleaned,
          mode: event.result.mode,
          model: event.result.model,
          warning: event.result.warning,
          citations: event.result.citations,
          retrievedChunks: event.result.retrievedChunks,
          externalSources: event.result.externalSources,
          conversationStatus: await getConversationStatus(conversationId),
        });
      }
    }

    const citationRefs = ((doneResult?.citations as typeof retrievedChunks) ?? []).map((c) => ({
      policyId: c.policyId,
      title: c.title,
      version: c.version,
      status: c.status,
    }));
    await addMessage(conversationId, "assistant", fullAnswer, citationRefs);

    sendStreamEvent(response, "done", { result: doneResult });
  } catch (error) {
    sendStreamEvent(response, "error", {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    response.end();
  }
};
