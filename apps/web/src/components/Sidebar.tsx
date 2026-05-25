import {
  ChevronRight,
  FileText,
  GitBranch,
  Loader2,
  Settings,
} from "lucide-react";
import { useState } from "react";

import type {
  AgentQueryAnalysis,
  AgentTraceStep,
  EvidenceEvent,
} from "../apis/api";
import type { AskResult } from "../types";
import { useConfigStore } from "../store";
import { Badge } from "./ui/badge";
import { AgentTraceSheet } from "./sheets/AgentTraceSheet";
import { EvidenceSheet } from "./sheets/EvidenceSheet";
import { SettingsSheet } from "./sheets/SettingsSheet";

const STRATEGY_SHORT: Record<string, string> = {
  direct: "trực tiếp",
  decompose: "chia nhỏ",
  multi_retrieve: "đa chiều",
  clarify: "làm rõ",
};

interface SidebarProps {
  readonly agentAnalysis: AgentQueryAnalysis | null;
  readonly agentSteps: readonly AgentTraceStep[];
  readonly agentRunning: boolean;
  readonly agentStrategy?: string;
  readonly agentIterations?: number;
  readonly activeResult: AskResult | null;
  readonly activeEvidence: EvidenceEvent | null;
}

const SummaryRow = ({
  icon,
  iconColor,
  title,
  badge,
  sub,
  onClick,
  spinning,
}: {
  readonly icon: React.ReactNode;
  readonly iconColor: string;
  readonly title: string;
  readonly badge?: string;
  readonly badgeColor?: string;
  readonly sub?: string;
  readonly onClick: () => void;
  readonly spinning?: boolean;
}) => (
  <button
    className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-slate-100"
    type="button"
    onClick={onClick}
  >
    <div
      className={`grid size-8 shrink-0 place-items-center rounded-lg ${iconColor}`}
    >
      {spinning ? <Loader2 className="size-4 animate-spin" /> : icon}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-slate-800">{title}</span>
        {badge && <Badge className="text-[10px]">{badge}</Badge>}
      </div>
      {sub && (
        <div className="mt-0.5 truncate text-[10px] text-slate-400">{sub}</div>
      )}
    </div>
    <ChevronRight className="size-4 shrink-0 text-slate-300" />
  </button>
);

export const Sidebar = ({
  agentAnalysis,
  agentSteps,
  agentRunning,
  agentStrategy,
  agentIterations,
  activeResult,
  activeEvidence,
}: SidebarProps) => {
  const settings = useConfigStore((s) => s.settings);
  const agentMode = useConfigStore((s) => s.agentMode);
  const [traceOpen, setTraceOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const citations = activeResult?.citations ?? activeEvidence?.citations ?? [];
  const retrievedChunks =
    activeResult?.retrievedChunks ?? activeEvidence?.retrievedChunks ?? [];
  const bestScore = retrievedChunks[0]?.score;

  return (
    <>
      <aside className="hidden w-[280px] shrink-0 flex-col gap-1 overflow-y-auto border-l border-slate-200/60 bg-white/80 backdrop-blur p-3 xl:flex">
        {/* Agent Trace summary */}
        {agentMode && (
          <SummaryRow
            icon={<GitBranch className="size-4" />}
            iconColor="bg-violet-100 text-violet-600"
            title="Luồng xử lý"
            badge={
              agentStrategy
                ? (STRATEGY_SHORT[agentStrategy] ?? agentStrategy)
                : undefined
            }
            sub={
              agentSteps.length > 0
                ? `${agentSteps.length} bước · ${agentIterations ?? 1} lượt`
                : agentRunning
                  ? "Đang phân tích..."
                  : "Chưa có dữ liệu"
            }
            onClick={() => setTraceOpen(true)}
            spinning={agentRunning && agentSteps.length === 0}
          />
        )}

        {/* Evidence summary */}
        <SummaryRow
          icon={<FileText className="size-4" />}
          iconColor="bg-emerald-100 text-emerald-600"
          title="Bằng chứng"
          badge={citations.length > 0 ? `${citations.length} nguồn` : undefined}
          sub={
            bestScore !== undefined
              ? `Cao nhất: ${Math.round(bestScore * 100)}%`
              : "Chưa có bằng chứng"
          }
          onClick={() => setEvidenceOpen(true)}
        />

        {/* Settings summary */}
        <SummaryRow
          icon={<Settings className="size-4" />}
          iconColor="bg-blue-100 text-blue-600"
          title="Cài đặt"
          sub={`Gemini · topK:${settings.topK} · min:${Math.round(settings.minScore * 100)}%`}
          onClick={() => setSettingsOpen(true)}
        />
      </aside>

      {/* Sheets */}
      <AgentTraceSheet
        open={traceOpen}
        onOpenChange={setTraceOpen}
        analysis={agentAnalysis}
        steps={agentSteps}
        isRunning={agentRunning}
        strategy={agentStrategy}
        iterations={agentIterations}
      />
      <EvidenceSheet
        open={evidenceOpen}
        onOpenChange={setEvidenceOpen}
        activeResult={activeResult}
        activeEvidence={activeEvidence}
        minScore={settings.minScore}
      />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
};
