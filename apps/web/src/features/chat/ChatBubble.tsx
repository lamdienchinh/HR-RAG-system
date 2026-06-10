import { Bot, User } from "lucide-react";
import Markdown from "react-markdown";

import type { ChatMessage, CitationRef } from "../../lib/types";
import { extractUsedCitations } from "./citation-utils";

export const ChatBubble = ({
  message,
  isStreaming = false,
}: {
  readonly message: ChatMessage;
  readonly isStreaming?: boolean;
}) => {
  const isAssistant = message.role === "assistant";
  const citations = message.citations;
  const showStreaming = isStreaming && isAssistant;

  const usedCitationNums = isAssistant
    ? extractUsedCitations(message.content)
    : [];
  const usedCitations = usedCitationNums
    .map((n) => ({ n, ref: citations?.[n - 1] }))
    .filter((item): item is { n: number; ref: CitationRef } => !!item.ref);

  return (
    <article
      className={`flex items-start gap-3 ${isAssistant ? "" : "flex-row-reverse"}`}
    >
      <div
        className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${
          isAssistant
            ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
            : "bg-slate-200 text-slate-600"
        }`}
      >
        {isAssistant ? <Bot className="size-4" /> : <User className="size-4" />}
      </div>
      <div
        className={`min-w-0 max-w-[75%] ${message.isError ? "rounded-2xl ring-2 ring-red-200" : ""}`}
      >
        {(message.content.length > 0 || showStreaming) && (
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              isAssistant
                ? "bg-white shadow-sm ring-1 ring-slate-100"
                : "bg-slate-900 text-white"
            }`}
          >
            {isAssistant ? (
              <div className={`chat-markdown${showStreaming ? " streaming" : ""}`}>
                {message.content.length > 0 ? (
                  <Markdown>{message.content}</Markdown>
                ) : (
                  <span className="streaming-cursor" />
                )}
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        )}
        {isAssistant && usedCitations.length > 0 && (
          <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Nguồn tham khảo
            </div>
            <div className="flex gap-2 flex-wrap">
              {usedCitations.map(({ n, ref }) => (
                <a
                  key={`${ref.policyId}-${n}`}
                  className="citation-source-link"
                  href={`/policies/view/${encodeURIComponent(ref.policyId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${ref.title} (v${ref.version})`}
                >
                  <span className="citation-badge">[S{n}]</span>
                  <span className="truncate font-medium">{ref.title}</span>
                  <span className="text-slate-400">v{ref.version}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
};
