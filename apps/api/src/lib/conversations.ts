import { pool } from '../db/pool.js';

export const CONVERSATION_MESSAGE_LIMIT = 50;
const CONVERSATION_WARNING_THRESHOLD = 40;

export interface CitationRef {
  readonly policyId: string;
  readonly title: string;
  readonly version: string;
  readonly status: string;
}

export interface ConversationMessage {
  readonly id: string;
  readonly conversationId: string;
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly citations?: readonly CitationRef[];
  readonly createdAt: string;
}

export interface Conversation {
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

// Generate a short ID
const generateId = (): string => `conv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const generateMessageId = (): string => `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export const createConversation = async (title?: string, userId?: string): Promise<Conversation> => {
  const id = generateId();
  const defaultTitle = title ?? `Conversation ${new Date().toLocaleDateString()}`;
  const result = await pool.query<{ id: string; title: string; message_count: number; created_at: string; updated_at: string }>(
    `INSERT INTO conversations (id, title, user_id) VALUES ($1, $2, $3)
     RETURNING id, title, message_count, created_at, updated_at`,
    [id, defaultTitle, userId ?? null],
  );
  const row = result.rows[0];
  return { id: row.id, title: row.title, messageCount: row.message_count, createdAt: row.created_at, updatedAt: row.updated_at };
};

export const listConversations = async (userId?: string): Promise<readonly Conversation[]> => {
  const query = userId
    ? `SELECT id, title, message_count, created_at, updated_at
       FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 20`
    : `SELECT id, title, message_count, created_at, updated_at
       FROM conversations ORDER BY updated_at DESC LIMIT 20`;
  const params = userId ? [userId] : [];
  const result = await pool.query<{ id: string; title: string; message_count: number; created_at: string; updated_at: string }>(
    query, params,
  );
  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    messageCount: row.message_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

export const getConversation = async (id: string): Promise<Conversation | null> => {
  const result = await pool.query<{ id: string; title: string; message_count: number; created_at: string; updated_at: string }>(
    `SELECT id, title, message_count, created_at, updated_at FROM conversations WHERE id = $1`,
    [id],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return { id: row.id, title: row.title, messageCount: row.message_count, createdAt: row.created_at, updatedAt: row.updated_at };
};

export const getConversationMessages = async (conversationId: string): Promise<readonly ConversationMessage[]> => {
  const result = await pool.query<{ id: string; conversation_id: string; role: string; content: string; citations: unknown; created_at: string }>(
    `SELECT id, conversation_id, role, content, citations, created_at
     FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [conversationId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as 'user' | 'assistant',
    content: row.content,
    citations: Array.isArray(row.citations) ? (row.citations as CitationRef[]) : undefined,
    createdAt: row.created_at,
  }));
};

export const getConversationStatus = async (conversationId: string): Promise<ConversationStatus> => {
  const result = await pool.query<{ message_count: number }>(
    `SELECT message_count FROM conversations WHERE id = $1`,
    [conversationId],
  );
  const messageCount = result.rows[0]?.message_count ?? 0;
  return {
    messageCount,
    limit: CONVERSATION_MESSAGE_LIMIT,
    warningThreshold: CONVERSATION_WARNING_THRESHOLD,
    isNearLimit: messageCount >= CONVERSATION_WARNING_THRESHOLD,
    isAtLimit: messageCount >= CONVERSATION_MESSAGE_LIMIT,
  };
};

export const addMessage = async (
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  citations?: readonly CitationRef[],
): Promise<ConversationMessage> => {
  // Atomic check-and-insert: SELECT FOR UPDATE locks the row so concurrent
  // requests queue up instead of both passing the limit check
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const convResult = await client.query<{ message_count: number }>(
      `SELECT message_count FROM conversations WHERE id = $1 FOR UPDATE`,
      [conversationId],
    );
    const messageCount = convResult.rows[0]?.message_count ?? 0;
    if (messageCount >= CONVERSATION_MESSAGE_LIMIT) {
      await client.query('ROLLBACK');
      throw new Error(`Conversation has reached the ${CONVERSATION_MESSAGE_LIMIT} message limit. Please start a new conversation.`);
    }

    const id = generateMessageId();
    const citationsJson = citations && citations.length > 0 ? JSON.stringify(citations) : null;
    await client.query(
      `INSERT INTO chat_messages (id, conversation_id, role, content, citations) VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [id, conversationId, role, content, citationsJson],
    );
    await client.query(
      `UPDATE conversations SET message_count = message_count + 1, updated_at = now() WHERE id = $1`,
      [conversationId],
    );
    await client.query('COMMIT');
    return { id, conversationId, role, content, citations, createdAt: new Date().toISOString() };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

// Get recent messages for answering meta-questions
export const getRecentMessages = async (
  conversationId: string,
  limit: number = 10,
): Promise<readonly ConversationMessage[]> => {
  const result = await pool.query<{ id: string; conversation_id: string; role: string; content: string; created_at: string }>(
    `SELECT id, conversation_id, role, content, created_at
     FROM chat_messages WHERE conversation_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [conversationId, limit],
  );
  return result.rows.reverse().map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as 'user' | 'assistant',
    content: row.content,
    createdAt: row.created_at,
  }));
};

// Generate answer from conversation history (meta-question handler)
export const answerFromHistory = async (
  question: string,
  conversationId: string,
): Promise<string> => {
  const recentMessages = await getRecentMessages(conversationId, 10);

  // Exclude the current question (just saved) from recent messages
  const history = recentMessages.filter((m) => m.content !== question);

  if (history.length === 0) {
    return 'Đây là tin nhắn đầu tiên trong cuộc hội thoại này. Chưa có lịch sử trước đó.';
  }

  // Check if user asks about what they asked before
  const lower = question.toLowerCase();
  const asksAboutOwnQuestion = /(?:tôi|mình)\s.*(?:hỏi|nói)/.test(lower)
    || /what\s.*(?:did i|i just)\s.*(?:ask|say)/.test(lower)
    || /câu hỏi.*(?:trước|vừa|gần)/.test(lower);

  if (asksAboutOwnQuestion) {
    const userMessages = history.filter((m) => m.role === 'user');
    if (userMessages.length === 0) {
      return 'Bạn chưa hỏi câu nào trước đó trong cuộc hội thoại này.';
    }
    const lastN = userMessages.slice(-3);
    const formatted = lastN.map((m, i) =>
      `${lastN.length > 1 ? `${i + 1}. ` : ''}${m.content}`,
    ).join('\n');
    return lastN.length === 1
      ? `Câu hỏi trước đó của bạn: "${lastN[0].content}"`
      : `Các câu hỏi gần đây của bạn:\n${formatted}`;
  }

  // Check if user asks about what the system answered
  const asksAboutAnswer = /(?:bạn|hệ thống)\s.*(?:nói|trả lời|đề cập)/.test(lower)
    || /what\s.*(?:you|system)\s.*(?:said|answered|replied)/.test(lower);

  if (asksAboutAnswer) {
    const assistantMessages = history.filter((m) => m.role === 'assistant');
    if (assistantMessages.length === 0) {
      return 'Tôi chưa trả lời câu nào trước đó trong cuộc hội thoại này.';
    }
    const last = assistantMessages[assistantMessages.length - 1];
    return `Câu trả lời gần nhất của tôi:\n\n${last.content}`;
  }

  // Generic recap: show last exchange
  const lastPair = history.slice(-2);
  const recap = lastPair.map((m) =>
    m.role === 'user' ? `Bạn: ${m.content}` : `Hệ thống: ${m.content}`,
  ).join('\n\n');
  return `Trao đổi gần nhất:\n\n${recap}`;
};

/**
 * Verify that the given user owns the conversation. Throws if not found or not owner.
 */
export const assertConversationOwner = async (conversationId: string, userId: string): Promise<void> => {
  const result = await pool.query<{ user_id: string | null }>(
    `SELECT user_id FROM conversations WHERE id = $1`,
    [conversationId],
  );
  if (result.rows.length === 0) {
    throw new Error('Conversation not found');
  }
  if (result.rows[0].user_id !== userId) {
    throw new Error('Access denied: you do not own this conversation');
  }
};

export const renameConversation = async (id: string, title: string): Promise<Conversation | null> => {
  const result = await pool.query<{ id: string; title: string; message_count: number; created_at: string; updated_at: string }>(
    `UPDATE conversations SET title = $1, updated_at = now() WHERE id = $2
     RETURNING id, title, message_count, created_at, updated_at`,
    [title.trim(), id],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return { id: row.id, title: row.title, messageCount: row.message_count, createdAt: row.created_at, updatedAt: row.updated_at };
};

export const deleteConversation = async (id: string): Promise<void> => {
  await pool.query('DELETE FROM conversations WHERE id = $1', [id]);
};
