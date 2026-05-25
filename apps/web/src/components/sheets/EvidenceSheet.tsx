import {
  AlertCircle,
  CheckCircle2,
  FileText,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import type { AskResult, RetrievedChunk } from "../../types";
import type { EvidenceEvent } from "../../apis/api";
import { T } from "../../vi";
import { Badge } from "../ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "../ui/sheet";

const formatScore = (score: number): string => `${Math.round(score * 100)}%`;

const SourceCard = ({
  chunk,
  index,
}: {
  readonly chunk: RetrievedChunk;
  readonly index: number;
}) => (
  <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="text-xs font-bold text-slate-950">
          S{index + 1}. {chunk.title}
        </div>
        <div className="mt-0.5 text-[10px] text-slate-500">
          {chunk.policyId} · {chunk.status} · v{chunk.version}
        </div>
      </div>
      <Badge className="shrink-0 bg-blue-50 text-[10px] text-blue-700">
        {formatScore(chunk.score)}
      </Badge>
    </div>
    <p className="mt-2 max-h-28 overflow-auto text-[11px] leading-4 text-slate-600">
      {chunk.content}
    </p>
  </article>
);

interface EvidenceSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly activeResult: AskResult | null;
  readonly activeEvidence: EvidenceEvent | null;
  readonly minScore: number;
}

export const EvidenceSheet = ({
  open,
  onOpenChange,
  activeResult,
  activeEvidence,
  minScore,
}: EvidenceSheetProps) => {
  const citations = activeResult?.citations ?? activeEvidence?.citations ?? [];
  const retrievedChunks =
    activeResult?.retrievedChunks ?? activeEvidence?.retrievedChunks ?? [];
  const externalSources =
    activeResult?.externalSources ?? activeEvidence?.externalSources ?? [];
  const bestScore = retrievedChunks[0]?.score ?? null;
  const gatePassed = bestScore !== null && bestScore >= minScore;
  const blocked = bestScore !== null && !gatePassed;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-emerald-600" />
            {T.evidenceTitle}
          </SheetTitle>
          <div className="flex items-center gap-2 pt-1">
            {citations.length > 0 && (
              <Badge className="text-[10px]">
                {citations.length} {T.citations}
              </Badge>
            )}
            {bestScore !== null && (
              <Badge
                className={`text-[10px] ${gatePassed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
              >
                {formatScore(bestScore)}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <SheetBody>
          {/* Gate status */}
          <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-slate-100 p-2.5">
              <div className="font-semibold text-slate-500">
                {T.highestScore}
              </div>
              <div className="mt-0.5 text-lg font-black text-slate-950">
                {bestScore === null ? "N/A" : formatScore(bestScore)}
              </div>
            </div>
            <div className="rounded-xl bg-slate-100 p-2.5">
              <div className="font-semibold text-slate-500">{T.threshold}</div>
              <div className="mt-0.5 text-lg font-black text-slate-950">
                {formatScore(minScore)}
              </div>
            </div>
          </div>

          {blocked && (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-700 ring-1 ring-red-100">
              <XCircle className="size-4 shrink-0" />
              {T.belowThreshold}
            </div>
          )}
          {gatePassed && (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-700 ring-1 ring-emerald-100">
              <CheckCircle2 className="size-4 shrink-0" />
              {T.aboveThreshold}
            </div>
          )}

          {/* Warning */}
          {activeResult?.warning && (
            <div className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-700 ring-1 ring-amber-100">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {activeResult.warning}
            </div>
          )}

          {/* Citations */}
          {citations.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-950">
                {T.policyCitations}
              </div>
              {citations.map((chunk, index) => (
                <SourceCard key={chunk.id} chunk={chunk} index={index} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
              <FileText className="mx-auto mb-2 size-8 text-slate-300" />
              {T.noEvidence}
            </div>
          )}

          {/* External sources */}
          {externalSources.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-bold text-slate-950">
                {T.externalSources}
              </div>
              {externalSources.map((source, index) => (
                <a
                  key={`${source.uri}-${index}`}
                  className="block rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm shadow-sm transition hover:bg-amber-100"
                  href={source.uri}
                  rel="noreferrer"
                  target="_blank"
                >
                  <div className="text-xs font-bold text-amber-950">
                    W{index + 1}. {source.title}
                  </div>
                  <div className="mt-0.5 break-all text-[10px] text-amber-700">
                    {source.uri}
                  </div>
                </a>
              ))}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
};
