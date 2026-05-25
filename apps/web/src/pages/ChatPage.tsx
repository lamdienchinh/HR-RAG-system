import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  createConversation,
  fetchConversationMessages,
  fetchQuestions,
  streamQuestion,
  streamAgentQuestion,
  type AgentQueryAnalysis,
  type AgentTraceStep,
  type ConversationStatus,
  type EvidenceEvent,
} from "../apis/api";
import { Sidebar } from "../components/Sidebar";
import { ConversationSidebar } from "../components/ConversationSidebar";
import { useAuth } from "../lib/auth";
import { useConfigStore } from "../store";
import { T } from "../vi";
import type { AskResult, QuestionSpec } from "../types";
import type { ChatMessage, CitationRef } from "../lib/types";
import { emptyAgentTrace } from "../lib/types";
import { toCitationRefs } from "../features/chat/citation-utils";
import {
  createMessageId,
  createWelcomeMessage,
  readStoredMessages,
  persistMessages,
} from "../features/chat/chat-storage";
import { ChatBubble } from "../features/chat/ChatBubble";
import { ChatInput } from "../features/chat/ChatInput";
import { SuggestedQuestions } from "../features/chat/SuggestedQuestions";
import { AgentReasoningBar } from "../features/chat/AgentReasoningBar";

export const ChatPage = () => {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const settings = useConfigStore((s) => s.settings);
  const agentMode = useConfigStore((s) => s.agentMode);
  const [prompt, setPrompt] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState<string>(T.ready);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeEvidence, setActiveEvidence] = useState<EvidenceEvent | null>(
    null,
  );
  const [activeResult, setActiveResult] = useState<AskResult | null>(null);

  const convStorageKey = userId ? `rag-demo-conv-${userId}` : "";

  const [messages, setMessages] = useState<readonly ChatMessage[]>(() =>
    userId
      ? readStoredMessages(T.welcomeMessage, userId)
      : [createWelcomeMessage(T.welcomeMessage)],
  );
  const [conversationId, setConversationId] = useState<string | null>(() =>
    convStorageKey ? localStorage.getItem(convStorageKey) : null,
  );
  const [conversationStatus, setConversationStatus] =
    useState<ConversationStatus | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userMessageRef = useRef<HTMLDivElement>(null);
  const [agentTrace, setAgentTrace] = useState(emptyAgentTrace);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  // Skip the DB-load effect when we just created a conversation for streaming
  const skipNextDbLoad = useRef(false);
  // Scroll-pin: set to true when user asks a question, consumed by useEffect after render
  const shouldPinScroll = useRef(false);

  useEffect(() => {
    if (userId) persistMessages(messages, userId);
  }, [messages, userId]);

  // Pin user question at top of viewport after DOM update (Gemini-style)
  useEffect(() => {
    if (shouldPinScroll.current) {
      shouldPinScroll.current = false;
      // Double rAF: first waits for React commit, second for layout/paint
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const container = scrollRef.current;
          const target = userMessageRef.current;
          if (!container || !target) return;
          // Use getBoundingClientRect for reliable viewport-relative positioning.
          // offsetTop is relative to offsetParent which can differ between
          // container and target when intermediate wrappers exist.
          const containerTop = container.getBoundingClientRect().top;
          const targetTop = target.getBoundingClientRect().top;
          const offset = container.scrollTop + (targetTop - containerTop) - 16;
          container.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
        });
      });
    }
  }, [messages]);

  // When user changes (login/switch account), load their conversation
  useEffect(() => {
    if (!userId) return;
    const key = `rag-demo-conv-${userId}`;
    const storedConvId = localStorage.getItem(key);
    setConversationId(storedConvId);
    setMessages(readStoredMessages(T.welcomeMessage, userId));
    setActiveEvidence(null);
    setActiveResult(null);
    setAgentTrace(emptyAgentTrace);
    setConversationStatus(null);
  }, [userId]);

  // Load from DB (but skip when we just lazy-created a conversation during streaming)
  useEffect(() => {
    if (!conversationId) return;
    if (skipNextDbLoad.current) {
      skipNextDbLoad.current = false;
      return;
    }
    void fetchConversationMessages(conversationId)
      .then(({ messages: dbMessages, status }) => {
        setConversationStatus(status);
        if (dbMessages.length > 0) {
          const restored: ChatMessage[] = dbMessages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            citations: m.citations as CitationRef[] | undefined,
          }));
          setMessages([createWelcomeMessage(T.welcomeMessage), ...restored]);
        }
      })
      .catch(() => {
        // Conversation was deleted — clear stale ID
        setConversationId(null);
        if (convStorageKey) localStorage.removeItem(convStorageKey);
      });
  }, [conversationId]);

  const questionsQuery = useQuery({
    queryKey: ["questions"],
    queryFn: fetchQuestions,
  });

  const updateAssistantMessage = (
    id: string,
    patch: Partial<ChatMessage>,
  ): void => {
    setMessages((cur) =>
      cur.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
  };

  const handleAsk = (): void => {
    const question = prompt.trim();
    if (!question || isStreaming) return;
    if (conversationStatus?.isAtLimit) {
      setWorkflowStatus(T.conversationAtLimit);
      return;
    }

    // Ensure conversation exists (lazy-create on first message)
    const ensureConversation = async (): Promise<string> => {
      if (conversationId) return conversationId;
      skipNextDbLoad.current = true; // prevent useEffect from overwriting in-flight messages
      const conv = await createConversation();
      setConversationId(conv.id);
      if (convStorageKey) localStorage.setItem(convStorageKey, conv.id);
      setSidebarRefresh((n) => n + 1);
      return conv.id;
    };

    const id = createMessageId();
    const assistantId = `${id}-assistant`;
    setMessages((cur) => [
      ...cur,
      { id: `${id}-user`, role: "user", content: question },
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setPrompt("");
    shouldPinScroll.current = true; // pin question at top after render
    setIsStreaming(true);
    setActiveEvidence(null);
    setActiveResult(null);

    const handleDone = (
      result: AskResult,
      extra?: {
        agentResult?: AskResult & {
          agentTrace?: { steps: readonly AgentTraceStep[] };
          iterations?: number;
          strategy?: string;
          queryAnalysis?: AgentQueryAnalysis;
        };
      },
    ): void => {
      setActiveResult(result);
      const ar = extra?.agentResult;
      updateAssistantMessage(assistantId, {
        content: ar?.warning
          ? `${ar.answer}\n\n${ar.warning}`
          : result.warning
            ? `${result.answer}\n\n${result.warning}`
            : result.answer,
        result,
        citations: toCitationRefs(result),
      });
      if (ar)
        setAgentTrace({
          analysis: ar.queryAnalysis ?? null,
          steps: ar.agentTrace?.steps ?? [],
          isRunning: false,
          strategy: ar.strategy,
          iterations: ar.iterations,
        });
      setWorkflowStatus(T.done(result.mode, (result.citations ?? []).length));
      setIsStreaming(false);
      if (conversationStatus) {
        const mc = conversationStatus.messageCount + 2;
        setConversationStatus({
          ...conversationStatus,
          messageCount: mc,
          isNearLimit: mc >= conversationStatus.warningThreshold,
          isAtLimit: mc >= conversationStatus.limit,
        });
      }
      setSidebarRefresh((n) => n + 1);
    };

    const handleError = (error: unknown): void => {
      updateAssistantMessage(assistantId, {
        content: T.apiError(
          error instanceof Error ? error.message : String(error),
        ),
        isError: true,
      });
      setWorkflowStatus(T.error);
      setIsStreaming(false);
      setAgentTrace((prev) => ({ ...prev, isRunning: false }));
    };

    if (agentMode) {
      setAgentTrace({ ...emptyAgentTrace, isRunning: true });
      setWorkflowStatus("Đang phân tích...");
      void ensureConversation()
        .then((convId) =>
          streamAgentQuestion(
            question,
            settings,
            {
              onAgentAnalysis: (analysis) => {
                setAgentTrace((prev) => ({ ...prev, analysis }));
                setWorkflowStatus(`Chiến lược: ${analysis.suggestedStrategy}`);
              },
              onAgentStep: (step) => {
                setAgentTrace((prev) => ({
                  ...prev,
                  steps: [...prev.steps, step],
                }));
              },
              onEvidence: (event) => {
                setActiveEvidence(event);
                const ss = (
                  event as unknown as {
                    conversationStatus?: ConversationStatus;
                  }
                ).conversationStatus;
                if (ss) setConversationStatus(ss);
                setWorkflowStatus(T.retrieved((event.citations ?? []).length));
              },
              onToken: (text) => {
                setMessages((cur) =>
                  cur.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: `${m.content}${text}` }
                      : m,
                  ),
                );
              },
              onDone: (result) =>
                handleDone(result, {
                  agentResult: result as AskResult & {
                    agentTrace?: { steps: readonly AgentTraceStep[] };
                    iterations?: number;
                    strategy?: string;
                    queryAnalysis?: AgentQueryAnalysis;
                  },
                }),
            },
            convId,
          ),
        )
        .catch(handleError);
    } else {
      setAgentTrace(emptyAgentTrace);
      setWorkflowStatus(T.retrieving);
      void ensureConversation()
        .then((convId) =>
          streamQuestion(
            question,
            settings,
            {
              onEvidence: (event) => {
                setActiveEvidence(event);
                const ss = (
                  event as unknown as {
                    conversationStatus?: ConversationStatus;
                  }
                ).conversationStatus;
                if (ss) setConversationStatus(ss);
                setWorkflowStatus(T.retrieved((event.citations ?? []).length));
              },
              onToken: (text) => {
                setMessages((cur) =>
                  cur.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: `${m.content}${text}` }
                      : m,
                  ),
                );
              },
              onDone: (result) => handleDone(result),
            },
            convId,
          ),
        )
        .catch(handleError);
    }
  };

  const handleSelectConversation = useCallback(
    (id: string): void => {
      setConversationId(id);
      if (convStorageKey) localStorage.setItem(convStorageKey, id);
      setMessages([createWelcomeMessage(T.welcomeMessage)]);
      setActiveEvidence(null);
      setActiveResult(null);
      setAgentTrace(emptyAgentTrace);
    },
    [convStorageKey],
  );

  const handleNewConversation = useCallback((): void => {
    void createConversation()
      .then((conv) => {
        setConversationId(conv.id);
        if (convStorageKey) localStorage.setItem(convStorageKey, conv.id);
        setConversationStatus({
          messageCount: 0,
          limit: 50,
          warningThreshold: 40,
          isNearLimit: false,
          isAtLimit: false,
        });
        setSidebarRefresh((n) => n + 1);
      })
      .catch(() => {});
    setMessages([createWelcomeMessage(T.welcomeMessage)]);
    setActiveEvidence(null);
    setActiveResult(null);
    setAgentTrace(emptyAgentTrace);
    setWorkflowStatus(T.cleared);
  }, [convStorageKey]);

  const handleDeleteConversation = useCallback(
    (id: string): void => {
      if (id === conversationId) {
        // Active conversation was deleted — reset state, auto-create effect will fire
        setConversationId(null);
        if (convStorageKey) localStorage.removeItem(convStorageKey);
        setMessages([createWelcomeMessage(T.welcomeMessage)]);
        setConversationStatus(null);
        setActiveEvidence(null);
        setActiveResult(null);
        setAgentTrace(emptyAgentTrace);
        setWorkflowStatus(T.cleared);
      }
    },
    [conversationId],
  );

  return (
    <section className="flex h-full">
      <ConversationSidebar
        activeConversationId={conversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
        onDelete={handleDeleteConversation}
        refreshTrigger={sidebarRefresh}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
            {messages.length <= 1 && (questionsQuery.data ?? []).length > 0 && (
              <SuggestedQuestions
                questions={questionsQuery.data ?? []}
                onSelect={(q) => setPrompt(q.question)}
              />
            )}
            {messages.map((m) => {
              const isLastUserMsg =
                m.role === "user" &&
                m.id === messages.filter((x) => x.role === "user").at(-1)?.id;
              return isLastUserMsg ? (
                <div key={m.id} ref={userMessageRef}>
                  <ChatBubble message={m} />
                </div>
              ) : (
                <ChatBubble key={m.id} message={m} />
              );
            })}
            {agentMode &&
              (agentTrace.steps.length > 0 || agentTrace.isRunning) && (
                <AgentReasoningBar
                  steps={agentTrace.steps}
                  isRunning={agentTrace.isRunning}
                />
              )}
            {isStreaming && !agentMode && (
              <div className="flex items-center gap-2 pl-11 text-sm text-slate-400">
                <Loader2 className="size-3.5 animate-spin" /> {T.streaming}
              </div>
            )}
            {/* Bottom padding so the question can be pinned at top with white space below for the answer */}
            {isStreaming && <div className="min-h-[70vh]" />}
          </div>
        </div>
        <ChatInput
          prompt={prompt}
          onPromptChange={setPrompt}
          onSubmit={handleAsk}
          onNewConversation={handleNewConversation}
          isStreaming={isStreaming}
          workflowStatus={workflowStatus}
          activeResult={activeResult}
          conversationStatus={conversationStatus}
        />
      </div>
      <Sidebar
        agentAnalysis={agentTrace.analysis}
        agentSteps={agentTrace.steps}
        agentRunning={agentTrace.isRunning}
        agentStrategy={agentTrace.strategy}
        agentIterations={agentTrace.iterations}
        activeResult={activeResult}
        activeEvidence={activeEvidence}
      />
    </section>
  );
};
