import { Loader2, Pencil, Plus, Trash2, X, Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchConversations,
  deleteConversation,
  renameConversation,
  type ConversationSummary,
} from "../apis/api";

interface ConversationSidebarProps {
  readonly activeConversationId: string | null;
  readonly onSelect: (id: string) => void;
  readonly onNew: () => void;
  readonly onDelete: (id: string) => void;
  readonly refreshTrigger: number;
}

const relativeTime = (dateStr: string): string => {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
};

export const ConversationSidebar = ({
  activeConversationId,
  onSelect,
  onNew,
  onDelete,
  refreshTrigger,
}: ConversationSidebarProps) => {
  const [conversations, setConversations] = useState<
    readonly ConversationSummary[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchConversations();
      setConversations(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations, refreshTrigger]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleStartEdit = (conv: ConversationSummary): void => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveEdit = async (id: string): Promise<void> => {
    const title = editTitle.trim();
    if (!title) {
      setEditingId(null);
      return;
    }
    try {
      await renameConversation(id, title);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c)),
      );
    } catch {
      // silent
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      onDelete(id);
    } catch {
      // silent
    }
  };

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-slate-200/60 bg-white/80 backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/60 px-3 py-3">
        <span className="text-xs font-semibold text-slate-700">Hội thoại</span>
        <button
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
          type="button"
          onClick={onNew}
          title="Cuộc hội thoại mới"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-4 animate-spin text-slate-400" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-2 py-8 text-center text-xs text-slate-400">
            Chưa có cuộc hội thoại nào
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const isEditing = editingId === conv.id;

            return (
              <div
                key={conv.id}
                className={`group relative mb-0.5 flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition ${
                  isActive
                    ? "bg-violet-100/70 text-violet-800"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => !isEditing && onSelect(conv.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isEditing) onSelect(conv.id);
                }}
                role="button"
                tabIndex={0}
              >
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        ref={editInputRef}
                        className="w-full rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-800 outline-none focus:border-violet-400"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleSaveEdit(conv.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onBlur={() => void handleSaveEdit(conv.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        className="rounded p-0.5 text-emerald-500 hover:bg-emerald-100"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleSaveEdit(conv.id);
                        }}
                      >
                        <Check className="size-3" />
                      </button>
                      <button
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-200"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(null);
                        }}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="truncate text-xs font-medium">
                        {conv.title}
                      </div>
                      <div className="mt-0.5 text-[10px] opacity-50">
                        {conv.messageCount} tin · {relativeTime(conv.updatedAt)}
                      </div>
                    </>
                  )}
                </div>

                {/* Actions */}
                {!isEditing && (
                  <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded-md bg-white/80 px-1 py-0.5 opacity-0 shadow-sm transition group-hover:opacity-100">
                    <button
                      className="rounded p-0.5 text-slate-400 hover:text-violet-500"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(conv);
                      }}
                      title="Đổi tên"
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      className="rounded p-0.5 text-slate-400 hover:text-red-500"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(conv.id);
                      }}
                      title="Xóa"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
