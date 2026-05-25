import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DatabaseZap,
  Loader2,
  PencilLine,
  PlusCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import MDEditor from "@uiw/react-md-editor";

import {
  reindexPolicies,
  updatePolicy,
  deletePolicy,
  updatePolicyStatus,
} from "../../apis/api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import type { Policy } from "../../types";
import { T } from "../../vi";

const incidentRule =
  "Công việc khẩn cấp ảnh hưởng khách hàng có thể được phê duyệt bổ sung trong 24 giờ khi người chỉ huy sự cố ghi nhận nhân viên vào nhật ký sự cố và quản lý xác nhận giờ làm.";

const createEmergencyRetroApprovalText = (content: string): string =>
  content.includes(incidentRule)
    ? content
    : `${content.trim()}\n\n${incidentRule}`;

export const PolicyEditor = ({
  policies,
  selectedPolicy,
  draftContent,
  onDraftChange,
  statusMessage,
  onSelectPolicy,
  onStatusMessageChange,
  onPolicyMutated,
}: {
  readonly policies: readonly Policy[];
  readonly selectedPolicy: Policy | null;
  readonly draftContent: string;
  readonly onDraftChange: (value: string) => void;
  readonly statusMessage: string;
  readonly onSelectPolicy: (id: string, content: string) => void;
  readonly onStatusMessageChange: (msg: string) => void;
  readonly onPolicyMutated: () => void;
}) => {
  const queryClient = useQueryClient();

  const updateMutation = useMutation<
    Policy,
    Error,
    { readonly id: string; readonly content: string }
  >({
    mutationFn: (v) => updatePolicy(v.id, v.content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["policies"] }),
  });

  const reindexMutation = useMutation({ mutationFn: reindexPolicies });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: deletePolicy,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["policies"] }),
  });

  const statusMutation = useMutation<
    Policy,
    Error,
    { readonly id: string; readonly status: string }
  >({
    mutationFn: (v) => updatePolicyStatus(v.id, v.status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["policies"] }),
  });

  const isBusy =
    updateMutation.isPending ||
    reindexMutation.isPending ||
    deleteMutation.isPending ||
    statusMutation.isPending;

  const handleSave = async (): Promise<void> => {
    if (!selectedPolicy) return;
    onStatusMessageChange(T.policySaving);
    await updateMutation.mutateAsync({
      id: selectedPolicy.id,
      content: draftContent,
    });
    onStatusMessageChange(T.policySaved);
  };

  const handleSaveAndReindex = async (): Promise<void> => {
    await handleSave();
    onStatusMessageChange(T.policyReindexing);
    const r = await reindexMutation.mutateAsync();
    onStatusMessageChange(T.policyIndexed(r.chunkCount, r.policyCount));
  };

  const handleDelete = async (): Promise<void> => {
    if (!selectedPolicy) return;
    if (!window.confirm(T.deleteConfirm(selectedPolicy.title))) return;
    onStatusMessageChange(T.policyDeleting);
    await deleteMutation.mutateAsync(selectedPolicy.id);
    onSelectPolicy("", "");
    const r = await reindexMutation.mutateAsync();
    onStatusMessageChange(T.policyDeleted(selectedPolicy.title, r.chunkCount));
    onPolicyMutated();
  };

  const handleToggleStatus = async (): Promise<void> => {
    if (!selectedPolicy) return;
    const newStatus = selectedPolicy.status === "current" ? "stale" : "current";
    const label = newStatus === "current" ? T.active : T.stale;
    onStatusMessageChange(T.policyMarking(selectedPolicy.title, label));
    await statusMutation.mutateAsync({
      id: selectedPolicy.id,
      status: newStatus,
    });
    onStatusMessageChange(T.policyMarked(selectedPolicy.title, label));
  };

  const handleCatch = (error: unknown): void => {
    onStatusMessageChange(
      error instanceof Error ? error.message : String(error),
    );
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <PencilLine className="size-4 text-slate-700" />
          <span className="text-sm font-bold">{T.sourceEditor}</span>
        </div>
        <Badge className="bg-blue-50 text-xs text-blue-700">
          {policies.length} {T.policies}
        </Badge>
      </div>

      <div className="shrink-0 border-b border-slate-50 px-5 py-3">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {T.selected}
            </div>
            <div className="mt-0.5 truncate text-sm font-bold">
              {selectedPolicy?.title ?? T.none}
            </div>
          </div>
          <button
            className="rounded-xl bg-slate-50 p-3 text-left transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedPolicy || isBusy}
            type="button"
            title={T.clickToToggle}
            onClick={() => void handleToggleStatus().catch(handleCatch)}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {T.status} <span className="normal-case">{T.clickToToggle}</span>
            </div>
            <div
              className={`mt-0.5 text-sm font-bold ${selectedPolicy?.status === "stale" ? "text-amber-600" : "text-emerald-600"}`}
            >
              {selectedPolicy?.status === "current"
                ? T.active
                : selectedPolicy?.status === "stale"
                  ? T.stale
                  : "N/A"}
            </div>
          </button>
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-hidden p-5"
        data-color-mode="light"
      >
        <MDEditor
          className="h-full"
          value={draftContent}
          onChange={(v) => onDraftChange(v ?? "")}
          height="100%"
          preview="live"
          hideToolbar={isBusy || !selectedPolicy}
        />
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 truncate text-xs text-slate-500">
          {statusMessage}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={!selectedPolicy || isBusy}
            onClick={() => void handleDelete().catch(handleCatch)}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}{" "}
            {T.deleteBtn}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!selectedPolicy || isBusy}
            onClick={() =>
              onDraftChange(createEmergencyRetroApprovalText(draftContent))
            }
          >
            <PlusCircle className="size-3.5" /> {T.incidentRule}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!selectedPolicy || isBusy}
            onClick={() => void handleSave().catch(handleCatch)}
          >
            {updateMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}{" "}
            {T.saveBtn}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!selectedPolicy || isBusy}
            onClick={() => void handleSaveAndReindex().catch(handleCatch)}
          >
            {isBusy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <DatabaseZap className="size-3.5" />
            )}{" "}
            {T.saveAndReindex}
          </Button>
        </div>
      </div>
    </div>
  );
};
