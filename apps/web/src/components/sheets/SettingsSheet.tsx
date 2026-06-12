import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { fetchGeminiModels } from "../../apis/api";
import { useConfigStore } from "../../store";
import { T } from "../../vi";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
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
              <Switch
                checked={agentMode}
                onCheckedChange={setAgentMode}
                checkedColor="bg-violet-600"
              />
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
              <Switch
                checked={settings.allowExternalSearch}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    allowExternalSearch: checked,
                  })
                }
                checkedColor="bg-amber-500"
              />
            </div>
          </div>

          {/* Skip Reranker */}
          <div className="rounded-2xl p-3 ring-1 bg-sky-50 ring-sky-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-sky-950">
                  🎯 Tái xếp hạng (Reranker)
                </div>
                <div className="text-xs leading-5 text-sky-700">
                  {settings.useReranker
                    ? "Bật BGE-Reranker cục bộ (Chính xác hơn, tốn CPU)"
                    : "Tắt BGE-Reranker (Nhanh hơn ~3-4 giây)"}
                </div>
              </div>
              <Switch
                checked={!!settings.useReranker}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    useReranker: checked,
                  })
                }
                checkedColor="bg-sky-600"
              />
            </div>
          </div>

          {/* Embedding Provider */}
          <div className="space-y-2">
            <div className="text-sm font-semibold">🧬 Bộ sinh Vector (Embedding)</div>
            <Select
              value={settings.embeddingProvider || "local"}
              onValueChange={(value) =>
                setSettings({
                  ...settings,
                  embeddingProvider: value as "local" | "cloud",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn bộ sinh vector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Cục bộ (HuggingFace CPU - ~1s)</SelectItem>
                <SelectItem value="cloud">Đám mây (Google Cloud API - ~150ms)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs leading-5 text-slate-500">
              Sử dụng Cloud API để giải phóng CPU của máy chủ và tăng đáng kể tốc độ phản hồi.
            </p>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
};
