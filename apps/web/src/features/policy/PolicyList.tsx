import { FileText, Lock, Unlock } from "lucide-react";

import { Badge } from "../../components/ui/badge";
import type { Policy } from "../../types";
import { T } from "../../vi";

export const PolicyList = ({
  policies,
  selectedPolicyId,
  statusFilter,
  onStatusFilterChange,
  onSelectPolicy,
  onTogglePrivacy,
}: {
  readonly policies: readonly Policy[];
  readonly selectedPolicyId: string;
  readonly statusFilter: "all" | "current" | "stale";
  readonly onStatusFilterChange: (f: "all" | "current" | "stale") => void;
  readonly onSelectPolicy: (id: string) => void;
  readonly onTogglePrivacy: (id: string, isPrivate: boolean) => void;
}) => {
  const filtered = statusFilter === "all" ? policies : policies.filter((p) => p.status === statusFilter);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-blue-600" />
          <span className="text-sm font-bold">{T.policyLibrary}</span>
          <Badge className="ml-auto text-xs">{filtered.length}/{policies.length}</Badge>
        </div>
        <div className="mt-2 flex rounded-full bg-slate-100 p-0.5 text-xs font-semibold">
          {(["all", "current", "stale"] as const).map((f) => (
            <button
              key={f}
              className={`flex-1 rounded-full px-2 py-1 transition ${
                statusFilter === f
                  ? f === "all" ? "bg-white shadow-sm" : f === "current" ? "bg-emerald-500 text-white shadow-sm" : "bg-amber-500 text-white shadow-sm"
                  : "text-slate-500"
              }`}
              type="button"
              onClick={() => onStatusFilterChange(f)}
            >
              {f === "all" ? T.all : f === "current" ? T.active : T.stale}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
        {filtered.length === 0 && <div className="p-4 text-center text-xs text-slate-400">{T.noMatch}</div>}
        {filtered.map((p) => (
          <button
            key={p.id}
            className={`w-full rounded-xl border p-3 text-left transition ${
              p.id === selectedPolicyId ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200" : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
            }`}
            type="button"
            onClick={() => onSelectPolicy(p.id)}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="truncate text-sm font-semibold">{p.title}</div>
                </div>
                <div className="mt-0.5 text-xs text-slate-500">{p.category} · v{p.version}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Badge className={`text-[10px] ${p.status === "current" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {p.status === "current" ? T.active : T.stale}
                </Badge>
                <button
                  className={`rounded-lg p-1 transition ${
                    p.isPrivate
                      ? "bg-red-50 text-red-500 hover:bg-red-100"
                      : "text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                  }`}
                  type="button"
                  title={p.isPrivate ? "Đặt công khai" : "Đặt riêng tư"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePrivacy(p.id, !p.isPrivate);
                  }}
                >
                  {p.isPrivate ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                </button>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
