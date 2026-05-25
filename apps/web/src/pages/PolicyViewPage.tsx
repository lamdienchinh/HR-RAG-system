import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, FileText, Layers, Loader2 } from "lucide-react";
import Markdown from "react-markdown";
import { Link, useParams } from "@tanstack/react-router";

import { fetchPolicy } from "../apis/api";
import { Badge } from "../components/ui/badge";

export const PolicyViewPage = () => {
  const { policyId } = useParams({ from: "/policies/view/$policyId" });

  const policyQuery = useQuery({
    queryKey: ["policy", policyId],
    queryFn: () => fetchPolicy(policyId),
  });

  const policy = policyQuery.data;

  if (policyQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (policyQuery.isError || !policy) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-slate-500">Không tìm thấy chính sách này.</p>
        <Link
          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
          to="/"
        >
          <ArrowLeft className="size-3.5" />
          Quay lại chat
        </Link>
      </div>
    );
  }

  return (
    <section className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Back link */}
        <Link
          className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
          to="/"
        >
          <ArrowLeft className="size-3.5" />
          Quay lại chat
        </Link>

        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-slate-900">
                {policy.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  className={`text-xs ${policy.status === "current" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                >
                  {policy.status === "current" ? "Đang hiệu lực" : "Hết hạn"}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Layers className="size-3" />
                  {policy.category}
                </span>
                <span className="text-xs text-slate-400">
                  v{policy.version}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Calendar className="size-3" />
                  {new Date(policy.updatedAt).toLocaleDateString("vi-VN")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="chat-markdown prose-sm">
            <Markdown>{policy.content}</Markdown>
          </div>
        </div>
      </div>
    </section>
  );
};
