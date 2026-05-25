import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import type { QuestionSpec } from "../../types";

const INITIAL_LIMIT = 6;

export const SuggestedQuestions = ({
  questions,
  onSelect,
}: {
  readonly questions: readonly QuestionSpec[];
  readonly onSelect: (q: QuestionSpec) => void;
}) => {
  const [showAll, setShowAll] = useState(false);
  if (questions.length === 0) return null;
  const hasMore = questions.length > INITIAL_LIMIT;
  const visible = showAll ? questions : questions.slice(0, INITIAL_LIMIT);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {visible.map((q) => (
          <button
            key={q.id}
            className="rounded-xl border border-slate-200 bg-white p-3 text-left text-sm text-slate-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/50"
            type="button"
            onClick={() => onSelect(q)}
          >
            {q.question}
          </button>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          className="mx-auto flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-500 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-600"
          onClick={() => setShowAll((prev) => !prev)}
        >
          {showAll ? (
            <><ChevronUp className="size-3.5" /> Thu gọn</>
          ) : (
            <><ChevronDown className="size-3.5" /> Xem thêm {questions.length - INITIAL_LIMIT} câu hỏi</>
          )}
        </button>
      )}
    </div>
  );
};
