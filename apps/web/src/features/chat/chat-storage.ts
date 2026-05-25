import type { ChatMessage, CitationRef } from "../../lib/types";

const STORAGE_VERSION = "v2";

const getChatStorageKey = (userId: string): string =>
  `acmepeople-chat-${userId}-${STORAGE_VERSION}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const createWelcomeMessage = (content: string): ChatMessage => ({
  id: "welcome",
  role: "assistant",
  content,
});

export const createMessageId = (): string =>
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const readStoredMessages = (welcomeText: string, userId: string): readonly ChatMessage[] => {
  const storedValue = window.localStorage.getItem(getChatStorageKey(userId));
  if (!storedValue) return [createWelcomeMessage(welcomeText)];
  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(storedValue) as unknown;
  } catch {
    window.localStorage.removeItem(getChatStorageKey(userId));
    return [createWelcomeMessage(welcomeText)];
  }
  if (!Array.isArray(parsedValue)) return [createWelcomeMessage(welcomeText)];
  const messages = parsedValue.flatMap((item): ChatMessage[] => {
    if (!isRecord(item)) return [];
    const { role, content, id } = item;
    if (
      (role !== "assistant" && role !== "user") ||
      typeof content !== "string" ||
      typeof id !== "string"
    ) {
      return [];
    }
    const citationsRaw = item.citations;
    const citations: CitationRef[] | undefined = Array.isArray(citationsRaw)
      ? (citationsRaw as Record<string, unknown>[])
          .filter(isRecord)
          .map((c) => ({
            policyId: String(c.policyId ?? ""),
            title: String(c.title ?? ""),
            version: String(c.version ?? ""),
            status: String(c.status ?? ""),
          }))
          .filter((c) => c.policyId.length > 0)
      : undefined;
    return [{ id, role, content, isError: item.isError === true, citations }];
  });
  return messages.length > 0 ? messages : [createWelcomeMessage(welcomeText)];
};

export const persistMessages = (messages: readonly ChatMessage[], userId: string): void => {
  window.localStorage.setItem(
    getChatStorageKey(userId),
    JSON.stringify(messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      isError: m.isError === true,
      citations: m.citations,
    }))),
  );
};

export const clearStoredMessages = (userId: string): void => {
  window.localStorage.removeItem(getChatStorageKey(userId));
};

// Legacy key cleanup — remove old shared key if present
const LEGACY_KEY = "acmepeople-chat-messages-v1";
export const clearLegacyStorage = (): void => {
  window.localStorage.removeItem(LEGACY_KEY);
};
