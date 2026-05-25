import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { fetchGeminiModels } from "../../apis/api";
import { useConfigStore } from "../../store";
import { T } from "../../vi";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "../ui/sheet";

const formatScore = (score: number): string => `${Math.round(score * 100)}%`;

interface SettingsSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export const SettingsSheet = ({ open, onOpenChange }: SettingsSheetProps) => {
  const settings = useConfigStore((s) => s.settings);
  const setSettings = useConfigStore((s) => s.setSettings);
  const agentMode = useConfigStore((s) => s.agentMode);
  const setAgentMode = useConfigStore((s) => s.setAgentMode);
  const [models, setModels] = useState<readonly string[]>([]);

  useEffect(() => {
    fetchGeminiModels()
      .then(setModels)
      .catch(() => {});
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-5 text-blue-600" />
            {T.settingsTitle}
          </SheetTitle>
          <SheetDescription>{T.settingsDescription}</SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-5">
          {/* Agent mode */}
          <div
            className={`rounded-2xl p-3 ring-1 ${agentMode ? "bg-violet-50 ring-violet-200" : "bg-slate-50 ring-slate-200"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div
                  className={`text-sm font-semibold ${agentMode ? "text-violet-950" : "text-slate-600"}`}
                >
                  🤖 Agentic RAG
                </div>
                <div
                  className={`text-xs leading-5 ${agentMode ? "text-violet-700" : "text-slate-400"}`}
                >
                  {agentMode
                    ? "Agent phân tích, định tuyến, tìm kiếm lặp lại & tự đánh giá"
                    : "Pipeline tìm kiếm trực tiếp (nhanh, một lượt)"}
                </div>
              </div>
              <button
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  agentMode
                    ? "bg-violet-600 text-white"
                    : "bg-white text-violet-700 ring-1 ring-violet-200"
                }`}
                type="button"
                onClick={() => setAgentMode(!agentMode)}
              >
                {agentMode ? T.on : T.off}
              </button>
            </div>
          </div>

          {/* TopK */}
          <label className="block space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>{T.topKChunks}</span>
              <Badge>{settings.topK}</Badge>
            </div>
            <input
              className="w-full accent-slate-950"
              max={12}
              min={1}
              type="range"
              value={settings.topK}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  topK: Number.parseInt(event.target.value, 10),
                })
              }
            />
          </label>

          {/* Min Score */}
          <label className="block space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>{T.minEvidenceScore}</span>
              <Badge>{formatScore(settings.minScore)}</Badge>
            </div>
            <input
              className="w-full accent-slate-950"
              max={0.6}
              min={0}
              step={0.01}
              type="range"
              value={settings.minScore}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  minScore: Number.parseFloat(event.target.value),
                })
              }
            />
            <p className="text-xs leading-5 text-slate-500">
              {T.minScoreExplanation}
            </p>
          </label>

          {/* Gemini model selector */}
          <div className="space-y-2">
            <div className="text-sm font-semibold">{T.geminiModel}</div>
            <Select
              value={settings.geminiModel || "__auto__"}
              onValueChange={(value) =>
                setSettings({
                  ...settings,
                  geminiModel: value === "__auto__" ? "" : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={T.geminiModelAuto} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__auto__">{T.geminiModelAuto}</SelectItem>
                {models.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-5 text-slate-500">
              {T.geminiModelExplanation}
            </p>
          </div>

          {/* Google Search */}
          <div className="rounded-2xl p-3 ring-1 bg-amber-50 ring-amber-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-amber-950">
                  {T.googleSearch}
                </div>
                <div className="text-xs leading-5 text-amber-700">
                  {T.googleSearchEnabled}
                </div>
              </div>
              <button
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  settings.allowExternalSearch
                    ? "bg-amber-500 text-white"
                    : "bg-white text-amber-700 ring-1 ring-amber-200"
                }`}
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    allowExternalSearch: !settings.allowExternalSearch,
                  })
                }
              >
                {settings.allowExternalSearch ? T.on : T.off}
              </button>
            </div>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
};
