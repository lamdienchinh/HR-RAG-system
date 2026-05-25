import { PlusCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "../../components/ui/button";
import { T } from "../../vi";

export const PolicyCreator = ({
  disabled,
  onCreatePolicy,
}: {
  readonly disabled: boolean;
  readonly onCreatePolicy: (title: string, category: string) => void;
}) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("custom");

  const handleCreate = (): void => {
    const t = title.trim();
    const c = category.trim();
    if (t.length === 0 || c.length === 0) return;
    onCreatePolicy(t, c);
    setTitle("");
    setCategory("custom");
  };

  return (
    <div className="shrink-0 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <PlusCircle className="size-4 text-emerald-600" />
        <span className="text-sm font-bold">{T.newPolicy}</span>
      </div>
      <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100" disabled={disabled} placeholder={T.policyTitle} value={title} onChange={(e) => setTitle(e.target.value)} />
      <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100" disabled={disabled} placeholder={T.category} value={category} onChange={(e) => setCategory(e.target.value)} />
      <Button className="w-full" size="sm" disabled={disabled || title.trim().length === 0 || category.trim().length === 0} type="button" onClick={handleCreate}>
        <PlusCircle className="size-3.5" /> {T.createAndReindex}
      </Button>
    </div>
  );
};
