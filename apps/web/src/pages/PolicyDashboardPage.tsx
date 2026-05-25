import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  createPolicy,
  fetchPolicies,
  reindexPolicies,
  togglePolicyPrivacy,
} from "../apis/api";
import { T } from "../vi";
import type { Policy } from "../types";
import { PolicyCreator } from "../features/policy/PolicyCreator";
import { PolicyList } from "../features/policy/PolicyList";
import { PolicyEditor } from "../features/policy/PolicyEditor";

const createPolicyTemplate = (title: string): string => `# ${title}

Mục đích:

Phạm vi:

Nội dung chính sách:

Ngoại lệ:
`;

export const PolicyDashboardPage = () => {
  const queryClient = useQueryClient();
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [statusMessage, setStatusMessage] = useState<string>(
    T.policyDefaultStatus,
  );
  const [statusFilter, setStatusFilter] = useState<"all" | "current" | "stale">(
    "all",
  );

  const policiesQuery = useQuery({
    queryKey: ["policies"],
    queryFn: fetchPolicies,
  });
  const policies = policiesQuery.data ?? [];
  const selectedPolicy = useMemo(
    () => policies.find((p) => p.id === selectedPolicyId) ?? null,
    [policies, selectedPolicyId],
  );

  useEffect(() => {
    if (selectedPolicyId || policies.length === 0) return;
    const def = policies.find((p) => p.id === "overtime-policy") ?? policies[0];
    setSelectedPolicyId(def.id);
    setDraftContent(def.content);
  }, [policies, selectedPolicyId]);

  const reindexMutation = useMutation({ mutationFn: reindexPolicies });

  const privacyMutation = useMutation<
    Policy,
    Error,
    { readonly id: string; readonly isPrivate: boolean }
  >({
    mutationFn: (v) => togglePolicyPrivacy(v.id, v.isPrivate),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["policies"] }),
  });

  const createMutation = useMutation<
    Policy,
    Error,
    { readonly title: string; readonly category: string }
  >({
    mutationFn: (v) =>
      createPolicy({
        title: v.title,
        category: v.category,
        content: createPolicyTemplate(v.title),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["policies"] }),
  });

  const handleSelectPolicy = (id: string, content?: string): void => {
    const p = policies.find((item) => item.id === id);
    setSelectedPolicyId(id);
    setDraftContent(content ?? p?.content ?? "");
  };

  const handleCreatePolicy = async (
    title: string,
    category: string,
  ): Promise<void> => {
    setStatusMessage(T.policyCreating);
    const policy = await createMutation.mutateAsync({ title, category });
    setSelectedPolicyId(policy.id);
    setDraftContent(policy.content);
    const result = await reindexMutation.mutateAsync();
    setStatusMessage(T.policyCreated(policy.title, result.chunkCount));
  };

  const handlePolicyMutated = (): void => {
    setSelectedPolicyId("");
    setDraftContent("");
    void reindexMutation
      .mutateAsync()
      .then((r) => {
        setStatusMessage(T.policyDeleted("", r.chunkCount));
      })
      .catch(() => {});
  };

  const isBusy = createMutation.isPending || reindexMutation.isPending;

  return (
    <section className="flex h-full gap-4 overflow-hidden p-4">
      <aside className="flex w-[320px] shrink-0 flex-col gap-3 overflow-hidden">
        <PolicyCreator
          disabled={isBusy}
          onCreatePolicy={(title, category) => {
            void handleCreatePolicy(title, category).catch((e: unknown) => {
              setStatusMessage(e instanceof Error ? e.message : String(e));
            });
          }}
        />
        <PolicyList
          policies={policies}
          selectedPolicyId={selectedPolicyId}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onSelectPolicy={(id) => handleSelectPolicy(id)}
          onTogglePrivacy={(id, isPrivate) =>
            void privacyMutation.mutateAsync({ id, isPrivate }).catch(() => {})
          }
        />
      </aside>
      <PolicyEditor
        policies={policies}
        selectedPolicy={selectedPolicy}
        draftContent={draftContent}
        onDraftChange={setDraftContent}
        statusMessage={statusMessage}
        onSelectPolicy={handleSelectPolicy}
        onStatusMessageChange={setStatusMessage}
        onPolicyMutated={handlePolicyMutated}
      />
    </section>
  );
};
