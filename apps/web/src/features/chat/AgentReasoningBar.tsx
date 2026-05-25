import { Brain, Loader2 } from "lucide-react";

import type { AgentTraceStep } from "../../apis/api";

const STEP_LABELS: Record<string, string> = {
  analyze: "Phân tích câu hỏi",
  retrieve: "Tìm kiếm tài liệu",
  generate: "Tổng hợp câu trả lời",
  reflect: "Tự đánh giá chất lượng",
  refine: "Tinh chỉnh truy vấn",
};

export const AgentReasoningBar = ({
  steps,
  isRunning,
}: {
  readonly steps: readonly AgentTraceStep[];
  readonly isRunning: boolean;
}) => {
  if (steps.length === 0 && !isRunning) return null;
  const latestStep = steps.length > 0 ? steps[steps.length - 1] : null;
  return (
    <div className="flex items-start gap-2 px-11 py-1.5">
      {isRunning ? (
        <>
          <Loader2 className="mt-0.5 size-3 shrink-0 animate-spin text-violet-500" />
          <span className="text-[11px] text-violet-500">
            {latestStep
              ? (STEP_LABELS[latestStep.type] ?? latestStep.label)
              : "Đang suy nghĩ..."}
          </span>
        </>
      ) : null}
    </div>
  );
};
