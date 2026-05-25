import type { AskResult, Policy, QuestionSpec } from "../types";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export interface AskSettings {
  readonly topK: number;
  readonly minScore: number;
  readonly allowExternalSearch: boolean;
  readonly geminiModel: string;
}

export interface CreatePolicyInput {
  readonly title: string;
  readonly category: string;
  readonly content: string;
}

export interface EvidenceEvent {
  readonly question: string;
  readonly mode: AskResult["mode"];
  readonly model: string;
  readonly warning: string | null;
  readonly citations: AskResult["citations"];
  readonly retrievedChunks: AskResult["retrievedChunks"];
  readonly externalSources: AskResult["externalSources"];
}

export interface StreamHandlers {
  readonly onEvidence: (event: EvidenceEvent) => void;
  readonly onToken?: (text: string) => void;
  readonly onDone: (result: AskResult) => void;
}

const getAuthToken = (): string | null =>
  localStorage.getItem("rag-demo-token");

const requestJson = async <TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => ({ error: response.statusText }))) as { error?: string };
    throw new Error(body.error ?? response.statusText);
  }
  if (response.status === 204) {
    return undefined as TResponse;
  }
  return (await response.json()) as TResponse;
};

export const fetchQuestions = async (): Promise<readonly QuestionSpec[]> => {
  const response = await requestJson<{
    readonly questions: readonly QuestionSpec[];
  }>("/api/questions?locale=vi");
  return response.questions;
};

export const fetchGeminiModels = async (): Promise<readonly string[]> => {
  try {
    const response = await requestJson<{ readonly models: readonly string[] }>(
      "/api/models",
    );
    return response.models;
  } catch {
    return ["gemini-2.5-flash"];
  }
};

export const fetchPolicies = async (): Promise<readonly Policy[]> => {
  const response = await requestJson<{ readonly policies: readonly Policy[] }>(
    "/api/policies",
  );
  return response.policies;
};

export const fetchPolicy = async (id: string): Promise<Policy> => {
  const response = await requestJson<{ readonly policy: Policy }>(
    `/api/policies/${encodeURIComponent(id)}`,
  );
  return response.policy;
};

export const updatePolicy = async (
  id: string,
  content: string,
): Promise<Policy> => {
  const response = await requestJson<{ readonly policy: Policy }>(
    `/api/policies/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify({ content, note: "Updated from policy dashboard" }),
    },
  );
  return response.policy;
};

export const createPolicy = async (
  input: CreatePolicyInput,
): Promise<Policy> => {
  const response = await requestJson<{ readonly policy: Policy }>(
    "/api/policies",
    {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        category: input.category,
        content: input.content,
      }),
    },
  );
  return response.policy;
};

export const deletePolicy = async (id: string): Promise<void> => {
  await requestJson<void>(`/api/policies/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};

export const togglePolicyPrivacy = async (
  id: string,
  isPrivate: boolean,
): Promise<Policy> => {
  const response = await requestJson<{ readonly policy: Policy }>(
    `/api/policies/${encodeURIComponent(id)}/privacy`,
    {
      method: "PATCH",
      body: JSON.stringify({ isPrivate }),
    },
  );
  return response.policy;
};

export const updatePolicyStatus = async (
  id: string,
  status: string,
): Promise<Policy> => {
  const response = await requestJson<{ readonly policy: Policy }>(
    `/api/policies/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
  return response.policy;
};

export const reindexPolicies = async (): Promise<{
  readonly policyCount: number;
  readonly chunkCount: number;
}> => await requestJson("/api/reindex", { method: "POST" });

export const reseedPolicies = async (): Promise<{
  readonly policyCount: number;
  readonly chunkCount: number;
  readonly locale: string;
}> =>
  await requestJson("/api/reseed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale: "vi" }),
  });

export const askQuestion = async (
  question: string,
  settings: AskSettings,
): Promise<AskResult> =>
  await requestJson("/api/ask", {
    method: "POST",
    body: JSON.stringify({
      question,

      allowExternalSearch: settings.allowExternalSearch,
      topK: settings.topK,
      minScore: settings.minScore,
      geminiModel: settings.geminiModel,
    }),
  });

const parseStreamEvents = (chunk: string, handlers: StreamHandlers): void => {
  const events = chunk.split("\n\n").filter((event) => event.trim().length > 0);
  for (const eventChunk of events) {
    const eventName = eventChunk
      .split("\n")
      .find((line) => line.startsWith("event: "))
      ?.slice(7);
    const rawData = eventChunk
      .split("\n")
      .find((line) => line.startsWith("data: "))
      ?.slice(6);
    if (!eventName || !rawData) continue;
    const data = JSON.parse(rawData) as unknown;
    if (eventName === "evidence") {
      handlers.onEvidence(data as EvidenceEvent);
    }
    if (eventName === "token") {
      handlers.onToken?.((data as { readonly text: string }).text);
    }
    if (eventName === "done") {
      handlers.onDone((data as { readonly result: AskResult }).result);
    }
    if (eventName === "error") {
      throw new Error((data as { readonly error: string }).error);
    }
  }
};

export const streamQuestion = async (
  question: string,
  settings: AskSettings,
  handlers: StreamHandlers,
  conversationId?: string,
): Promise<void> => {
  const url = conversationId
    ? `${apiBaseUrl}/api/conversations/${encodeURIComponent(conversationId)}/ask`
    : `${apiBaseUrl}/api/ask/stream`;
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      question,

      allowExternalSearch: settings.allowExternalSearch,
      topK: settings.topK,
      minScore: settings.minScore,
      geminiModel: settings.geminiModel,
    }),
  });
  if (!response.ok || !response.body) {
    throw new Error(response.statusText);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lastBoundary = buffer.lastIndexOf("\n\n");
    if (lastBoundary === -1) continue;
    parseStreamEvents(buffer.slice(0, lastBoundary), handlers);
    buffer = buffer.slice(lastBoundary + 2);
  }
  if (buffer.trim().length > 0) {
    parseStreamEvents(buffer, handlers);
  }
};

// --- Agent streaming types & function ---

export interface AgentTraceStep {
  readonly type: "analyze" | "retrieve" | "generate" | "reflect" | "refine";
  readonly label: string;
  readonly detail: string;
  readonly duration: number;
  readonly timestamp: number;
}

export interface AgentQueryAnalysis {
  readonly intent: string;
  readonly complexity: string;
  readonly subQueries: readonly string[];
  readonly suggestedStrategy: string;
  readonly keyEntities: readonly string[];
  readonly reasoning: string;
}

export interface AgentStreamHandlers extends StreamHandlers {
  readonly onAgentAnalysis?: (analysis: AgentQueryAnalysis) => void;
  readonly onAgentStep?: (step: AgentTraceStep) => void;
  readonly onAgentAnswer?: (answer: string) => void;
}

export const streamAgentQuestion = async (
  question: string,
  settings: AskSettings,
  handlers: AgentStreamHandlers,
  conversationId?: string,
): Promise<void> => {
  const url = conversationId
    ? `${apiBaseUrl}/api/conversations/${encodeURIComponent(conversationId)}/ask/agent`
    : `${apiBaseUrl}/api/ask/agent`;
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      question,

      allowExternalSearch: settings.allowExternalSearch,
      topK: settings.topK,
      minScore: settings.minScore,
      geminiModel: settings.geminiModel,
    }),
  });
  if (!response.ok || !response.body) {
    throw new Error(response.statusText);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lastBoundary = buffer.lastIndexOf("\n\n");
    if (lastBoundary === -1) continue;
    parseAgentStreamEvents(buffer.slice(0, lastBoundary), handlers);
    buffer = buffer.slice(lastBoundary + 2);
  }
  if (buffer.trim().length > 0) {
    parseAgentStreamEvents(buffer, handlers);
  }
};

const parseAgentStreamEvents = (
  chunk: string,
  handlers: AgentStreamHandlers,
): void => {
  const events = chunk.split("\n\n").filter((event) => event.trim().length > 0);
  for (const eventChunk of events) {
    const eventName = eventChunk
      .split("\n")
      .find((line) => line.startsWith("event: "))
      ?.slice(7);
    const rawData = eventChunk
      .split("\n")
      .find((line) => line.startsWith("data: "))
      ?.slice(6);
    if (!eventName || !rawData) continue;
    const data = JSON.parse(rawData) as unknown;
    if (eventName === "agent_analysis") {
      handlers.onAgentAnalysis?.(
        (data as { queryAnalysis: AgentQueryAnalysis }).queryAnalysis,
      );
    }
    if (eventName === "agent_step") {
      handlers.onAgentStep?.(data as AgentTraceStep);
    }
    if (eventName === "agent_answer") {
      handlers.onAgentAnswer?.((data as { readonly answer: string }).answer);
    }
    if (eventName === "evidence") {
      handlers.onEvidence(data as EvidenceEvent);
    }
    if (eventName === "token") {
      handlers.onToken?.((data as { readonly text: string }).text);
    }
    if (eventName === "done") {
      handlers.onDone((data as { readonly result: AskResult }).result);
    }
    if (eventName === "error") {
      throw new Error((data as { readonly error: string }).error);
    }
  }
};

// --- Conversation API ---

export interface ConversationSummary {
  readonly id: string;
  readonly title: string;
  readonly messageCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ConversationStatus {
  readonly messageCount: number;
  readonly limit: number;
  readonly warningThreshold: number;
  readonly isNearLimit: boolean;
  readonly isAtLimit: boolean;
}

export interface CitationRefDto {
  readonly policyId: string;
  readonly title: string;
  readonly version: string;
  readonly status: string;
}

export interface ConversationMessageDto {
  readonly id: string;
  readonly conversationId: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly citations?: readonly CitationRefDto[];
  readonly createdAt: string;
}

export const fetchConversations = async (): Promise<
  readonly ConversationSummary[]
> => {
  const response = await requestJson<{
    readonly conversations: readonly ConversationSummary[];
  }>("/api/conversations");
  return response.conversations;
};

export const createConversation = async (
  title?: string,
): Promise<ConversationSummary> => {
  const response = await requestJson<{
    readonly conversation: ConversationSummary;
  }>("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
  return response.conversation;
};

export const fetchConversationMessages = async (
  id: string,
): Promise<{
  readonly messages: readonly ConversationMessageDto[];
  readonly status: ConversationStatus;
}> =>
  await requestJson(`/api/conversations/${encodeURIComponent(id)}/messages`);

export const deleteConversation = async (id: string): Promise<void> => {
  await requestJson<void>(`/api/conversations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};

export const renameConversation = async (
  id: string,
  title: string,
): Promise<ConversationSummary> => {
  const response = await requestJson<{
    readonly conversation: ConversationSummary;
  }>(`/api/conversations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
  return response.conversation;
};
