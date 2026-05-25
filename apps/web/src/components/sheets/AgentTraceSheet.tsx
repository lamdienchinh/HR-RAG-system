import {
  Brain,
  GitBranch,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";

import type { AgentQueryAnalysis, AgentTraceStep } from "../../apis/api";
import { Badge } from "../ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "../ui/sheet";

const STEP_ICONS: Record<AgentTraceStep["type"], typeof Brain> = {
  analyze: Brain,
  retrieve: Search,
  generate: Wand2,
  reflect: Sparkles,
  refine: RefreshCw,
};

const STEP_COLORS: Record<AgentTraceStep["type"], string> = {
  analyze: "text-violet-600 bg-violet-100",
  retrieve: "text-blue-600 bg-blue-100",
  generate: "text-emerald-600 bg-emerald-100",
  reflect: "text-amber-600 bg-amber-100",
  refine: "text-orange-600 bg-orange-100",
};

const STEP_BORDER_COLORS: Record<AgentTraceStep["type"], string> = {
  analyze: "border-violet-200 bg-violet-50/50",
  retrieve: "border-blue-200 bg-blue-50/50",
  generate: "border-emerald-200 bg-emerald-50/50",
  reflect: "border-amber-200 bg-amber-50/50",
  refine: "border-orange-200 bg-orange-50/50",
};

const STEP_LABELS: Record<string, string> = {
  analyze: "Phân tích câu hỏi",
  retrieve: "Tìm kiếm tài liệu",
  generate: "Tổng hợp câu trả lời",
  reflect: "Tự đánh giá chất lượng",
  refine: "Tinh chỉnh truy vấn",
};

const STRATEGY_LABELS: Record<string, string> = {
  direct: "Tra cứu trực tiếp",
  decompose: "Chia nhỏ & Tổng hợp",
  multi_retrieve: "Tìm kiếm đa chiều",
  clarify: "Cần làm rõ thêm",
};

interface AgentTraceSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly analysis: AgentQueryAnalysis | null;
  readonly steps: readonly AgentTraceStep[];
  readonly isRunning: boolean;
  readonly strategy?: string;
  readonly iterations?: number;
}

export const AgentTraceSheet = ({
  open,
  onOpenChange,
  analysis,
  steps,
  isRunning,
  strategy,
  iterations,
}: AgentTraceSheetProps) => {
  // Infer what step is currently running
  const lastStep = steps[steps.length - 1];
  const isStillWorking =
    isRunning &&
    (!lastStep || lastStep.type === "retrieve" || lastStep.type === "generate");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 text-white">
              <GitBranch className="size-3.5" />
            </div>
            Agent Trace
            {isRunning && (
              <Loader2 className="size-4 animate-spin text-violet-600" />
            )}
          </SheetTitle>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {strategy && (
              <Badge className="bg-violet-50 text-[10px] text-violet-700">
                {STRATEGY_LABELS[strategy] ?? strategy}
              </Badge>
            )}
            {iterations && iterations > 1 && (
              <Badge className="bg-orange-50 text-[10px] text-orange-700">
                {iterations} lượt
              </Badge>
            )}
          </div>
        </SheetHeader>

        <SheetBody>
          {/* Query Analysis */}
          {analysis && (
            <div className="mb-4 rounded-xl bg-violet-50 p-3 text-xs ring-1 ring-violet-100">
              <div className="mb-1.5 font-bold text-violet-900">
                Phân tích truy vấn
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <span className="text-violet-500">Ý định:</span>{" "}
                  <span className="font-medium text-violet-800">
                    {analysis.intent}
                  </span>
                </div>
                <div>
                  <span className="text-violet-500">Độ phức tạp:</span>{" "}
                  <span className="font-medium text-violet-800">
                    {analysis.complexity}
                  </span>
                </div>
              </div>
              {analysis.keyEntities.length > 0 && (
                <div className="mt-1.5">
                  <span className="text-violet-500">Từ khóa:</span>{" "}
                  {analysis.keyEntities.map((e) => (
                    <Badge
                      key={e}
                      className="mr-1 bg-white text-[10px] text-violet-700 ring-1 ring-violet-200"
                    >
                      {e}
                    </Badge>
                  ))}
                </div>
              )}
              {analysis.subQueries.length > 0 && (
                <div className="mt-1.5">
                  <span className="text-violet-500">Câu hỏi con:</span>
                  <ul className="mt-0.5 list-inside list-disc text-violet-700">
                    {analysis.subQueries.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.reasoning && (
                <div className="mt-1.5 text-violet-600 italic">
                  {analysis.reasoning}
                </div>
              )}
            </div>
          )}

          {/* Pipeline flow explanation */}
          {steps.length > 0 && (
            <div className="mb-3 rounded-lg bg-slate-50 p-2.5 text-[10px] leading-4 text-slate-500 ring-1 ring-slate-100">
              <strong className="text-slate-600">Luồng xử lý:</strong> Phân tích
              câu hỏi → Tìm kiếm tài liệu → Tổng hợp trả lời
              {steps.some((s) => s.type === "reflect") &&
                " → Tự đánh giá → Tinh chỉnh"}
            </div>
          )}

          {/* Steps timeline */}
          <div className="space-y-2">
            {steps.map((step, index) => {
              const Icon = STEP_ICONS[step.type] ?? Brain;
              const colorClass =
                STEP_COLORS[step.type] ?? "text-slate-600 bg-slate-100";
              const borderClass =
                STEP_BORDER_COLORS[step.type] ??
                "border-slate-200 bg-slate-50/50";
              return (
                <div
                  key={index}
                  className={`rounded-xl border p-3 transition-all ${borderClass}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`grid size-7 shrink-0 place-items-center rounded-lg ${colorClass}`}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800">
                        {STEP_LABELS[step.type] ?? step.label}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-4 text-slate-500 line-clamp-3">
                        {step.detail}
                      </p>
                    </div>
                    <div className="text-[10px] text-slate-300">
                      #{index + 1}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Running indicator for next step */}
            {isStillWorking && (
              <div className="rounded-xl mb-3 border border-dashed border-violet-200 bg-violet-50/30 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-violet-100">
                    <Loader2 className="size-3.5 animate-spin text-violet-600" />
                  </div>
                  <span className="text-xs font-medium text-violet-500">
                    {lastStep?.type === "retrieve"
                      ? "Đang tổng hợp câu trả lời..."
                      : "Đang xử lý..."}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Empty state */}
          {steps.length === 0 && !isRunning && (
            <div className="py-8 text-center text-sm text-slate-400">
              Chưa có dữ liệu. Hãy đặt câu hỏi ở chế độ Agent.
            </div>
          )}
          {steps.length === 0 && isRunning && (
            <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/30 p-4">
              <div className="flex items-center gap-2.5">
                <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-violet-100">
                  <Loader2 className="size-3.5 animate-spin text-violet-600" />
                </div>
                <span className="text-xs font-medium text-violet-500">
                  Đang phân tích câu hỏi...
                </span>
              </div>
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
};
