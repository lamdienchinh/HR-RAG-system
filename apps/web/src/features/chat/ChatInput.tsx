import {
  AlertCircle,
  ArrowUp,
  CheckCircle2,
  Loader2,
  MessageSquarePlus,
} from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import type { ConversationStatus } from "../../apis/api";
import type { AskResult } from "../../types";
import { T } from "../../vi";

export const ChatInput = ({
  prompt,
  onPromptChange,
  onSubmit,
  onNewConversation,
  isStreaming,
  workflowStatus,
  activeResult,
  conversationStatus,
}: {
  readonly prompt: string;
  readonly onPromptChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly onNewConversation: () => void;
  readonly isStreaming: boolean;
  readonly workflowStatus: string;
  readonly activeResult: AskResult | null;
  readonly conversationStatus: ConversationStatus | null;
}) => (
  <div className="shrink-0 border-t border-slate-200/40 bg-gradient-to-t from-white to-transparent pb-4 pt-3">
    <div className="mx-auto max-w-3xl px-4">
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
        <CheckCircle2 className="size-3 text-emerald-500" />
        <span className="truncate">{workflowStatus}</span>
        {activeResult?.warning && (
          <Badge className="shrink-0 bg-amber-50 text-amber-700 ring-amber-200">
            <AlertCircle className="mr-1 size-3" /> Cảnh báo
          </Badge>
        )}
      </div>
      <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
        <Textarea
          className="min-h-10 max-h-36 flex-1 resize-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
          placeholder={T.placeholder}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
        <div className="flex shrink-0 gap-1.5 pb-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-slate-400 hover:text-emerald-600"
            onClick={onNewConversation}
            title={T.newConversation}
          >
            <MessageSquarePlus className="size-3.5" />
          </Button>
          {conversationStatus && (
            <span
              className={`text-[10px] font-medium tabular-nums ${conversationStatus.isNearLimit ? "text-amber-600" : "text-slate-400"}`}
            >
              {conversationStatus.messageCount}/{conversationStatus.limit}
            </span>
          )}
          <Button
            type="button"
            size="icon"
            className="size-8 rounded-full"
            disabled={isStreaming || prompt.trim().length === 0}
            onClick={onSubmit}
          >
            {isStreaming ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowUp className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  </div>
);
