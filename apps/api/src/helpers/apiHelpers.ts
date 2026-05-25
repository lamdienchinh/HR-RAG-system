import { type Response } from "express";
import { type AnswerOptions } from "../lib/answer.js";
import { type CreatePolicyInput } from "../lib/policies.js";

export interface AskBody {
  readonly question?: unknown;
  readonly allowExternalSearch?: unknown;
  readonly topK?: unknown;
  readonly minScore?: unknown;
  readonly geminiModel?: unknown;
}

export interface UpdatePolicyBody {
  readonly content?: unknown;
  readonly note?: unknown;
}

export interface CreatePolicyBody {
  readonly title?: unknown;
  readonly category?: unknown;
  readonly version?: unknown;
  readonly status?: unknown;
  readonly sensitivity?: unknown;
  readonly content?: unknown;
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const parseAskBody = (
  body: unknown
): {
  readonly question: string;
  readonly options: AnswerOptions;
  readonly topK: number;
} => {
  if (
    !isRecord(body) ||
    typeof body.question !== "string" ||
    body.question.trim().length === 0
  ) {
    throw new Error("question is required");
  }
  const rawTopK = body.topK;
  const topK =
    typeof rawTopK === "number" && Number.isInteger(rawTopK) ? rawTopK : 6;
  const rawMinScore = body.minScore;
  const minScore =
    typeof rawMinScore === "number" && Number.isFinite(rawMinScore)
      ? rawMinScore
      : 0.05;
  const clampedTopK = Math.min(Math.max(topK, 1), 12);
  const geminiModel =
    typeof body.geminiModel === "string" && body.geminiModel.trim().length > 0
      ? body.geminiModel.trim()
      : undefined;
  return {
    question: body.question.trim(),
    options: {
      allowExternalSearch: body.allowExternalSearch === true,
      minScore: Math.min(Math.max(minScore, 0), 1),
      topK: clampedTopK,
      geminiModel,
    },
    topK: clampedTopK,
  };
};

export const parseUpdatePolicyBody = (
  body: unknown
): { readonly content: string; readonly note: string } => {
  if (
    !isRecord(body) ||
    typeof body.content !== "string" ||
    body.content.trim().length === 0
  ) {
    throw new Error("content is required");
  }
  return {
    content: body.content,
    note:
      typeof body.note === "string" && body.note.trim().length > 0
        ? body.note.trim()
        : "Updated from policy dashboard",
  };
};

const readStringField = (
  body: Record<string, unknown>,
  field: string,
  fallback?: string
): string => {
  const value = body[field];
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (fallback !== undefined) return fallback;
  throw new Error(`${field} is required`);
};

export const parseCreatePolicyBody = (body: unknown): CreatePolicyInput => {
  if (!isRecord(body)) {
    throw new Error("policy body is required");
  }
  return {
    title: readStringField(body, "title"),
    category: readStringField(body, "category", "custom"),
    version: readStringField(body, "version", "2026.1"),
    status: readStringField(body, "status", "current"),
    sensitivity: readStringField(body, "sensitivity", "internal"),
    content: readStringField(
      body,
      "content",
      "# New Policy\n\nAdd policy details here."
    ),
  };
};

export const sendError = (
  response: Response,
  error: unknown,
  status = 400
): void => {
  response.status(status).json({
    error: error instanceof Error ? error.message : String(error),
  });
};

export const sendStreamEvent = (
  response: Response,
  event: string,
  data: Record<string, unknown>
): void => {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
};

export const sleep = async (milliseconds: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

export const streamAnswerTokens = async (
  response: Response,
  answer: string,
  baseDelayMs = 25
): Promise<void> => {
  const tokenGroups = answer.match(/\S+\s*|\n+/g) ?? [];
  for (const token of tokenGroups) {
    sendStreamEvent(response, "token", { text: token });
    const jitter = token.length > 8 ? 15 : token.endsWith("\n") ? 20 : 5;
    await sleep(baseDelayMs + jitter);
  }
};
