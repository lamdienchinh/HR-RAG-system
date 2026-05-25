import {
  Brain,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useState } from "react";

import type { AgentQueryAnalysis, AgentTraceStep } from "../apis/api";
import { Badge } from "./ui/badge";

const STEP_ICONS: Record<AgentTraceStep["type"], typeof Brain> = {
  analyze: Brain,
  retrieve: Search,
  generate: Wand2,
  reflect: Sparkles,
  refine: RefreshCw,
};

const STEP_COLORS: Record<AgentTraceStep["type"], string> = {
  analyze: "text-violet-600 bg-violet-50",
  retrieve: "text-blue-600 bg-blue-50",
  generate: "text-emerald-600 bg-emerald-50",
  reflect: "text-amber-600 bg-amber-50",
  refine: "text-orange-600 bg-orange-50",
};

const STRATEGY_LABELS: Record<string, string> = {
  direct: "Direct Lookup",
  decompose: "Decompose & Merge",
  multi_retrieve: "Multi-Retrieve",
  clarify: "Clarification Needed",
};

interface AgentTracePanelProps {
  readonly analysis: AgentQueryAnalysis | null;
  readonly steps: readonly AgentTraceStep[];
  readonly isRunning: boolean;
  readonly strategy?: string;
  readonly iterations?: number;
}

export const AgentTracePanel = ({
  analysis,
  steps,
  isRunning,
  strategy,
  iterations,
}: AgentTracePanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!analysis && steps.length === 0 && !isRunning) return null;

  const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
      <button
        className="flex items-center justify-between p-3 text-left transition hover:bg-violet-50/50"
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 text-white">
            <GitBranch className="size-3.5" />
          </div>
          <span className="text-sm font-bold">Agent Trace</span>
          {isRunning && (
            <Loader2 className="size-3.5 animate-spin text-violet-600" />
          )}
          {strategy && (
            <Badge className="bg-violet-50 text-[10px] text-violet-700">
              {STRATEGY_LABELS[strategy] ?? strategy}
            </Badge>
          )}
          {iterations && iterations > 1 && (
            <Badge className="bg-orange-50 text-[10px] text-orange-700">
              {iterations} iterations
            </Badge>
          )}
          {steps.length > 0 && (
            <Badge className="text-[10px]">{totalDuration}ms</Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="size-4 text-slate-400" />
        ) : (
          <ChevronRight className="size-4 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="max-h-[50vh] space-y-2 overflow-y-auto border-t border-violet-100 p-3">
          {/* Query Analysis */}
          {analysis && (
            <div className="rounded-xl bg-violet-50 p-3 text-xs ring-1 ring-violet-100">
              <div className="mb-1.5 font-bold text-violet-900">
                Query Analysis
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <span className="text-violet-500">Intent:</span>{" "}
                  <span className="font-medium text-violet-800">
                    {analysis.intent}
                  </span>
                </div>
                <div>
                  <span className="text-violet-500">Complexity:</span>{" "}
                  <span className="font-medium text-violet-800">
                    {analysis.complexity}
                  </span>
                </div>
              </div>
              {analysis.keyEntities.length > 0 && (
                <div className="mt-1.5">
                  <span className="text-violet-500">Entities:</span>{" "}
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
                  <span className="text-violet-500">Sub-queries:</span>
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

          {/* Steps timeline */}
          {steps.length > 0 && (
            <div className="relative ml-3 space-y-0">
              {/* Vertical timeline line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />

              {steps.map((step, index) => {
                const Icon = STEP_ICONS[step.type] ?? Brain;
                const colorClass =
                  STEP_COLORS[step.type] ?? "text-slate-600 bg-slate-50";
                return (
                  <div
                    key={index}
                    className="relative flex items-start gap-3 py-1.5"
                  >
                    <div
                      className={`relative z-10 grid size-[15px] shrink-0 place-items-center rounded-full ${colorClass}`}
                    >
                      <Icon className="size-2.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800">
                          {step.label}
                        </span>
                        <span className="text-[10px] tabular-nums text-slate-400">
                          {step.duration}ms
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Running indicator */}
          {isRunning && steps.length === 0 && (
            <div className="flex items-center gap-2 py-2 text-xs text-violet-500">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Analyzing query...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
