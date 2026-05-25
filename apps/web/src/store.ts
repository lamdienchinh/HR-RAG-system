import { create } from "zustand";
import type { AskSettings } from "./apis/api";

interface ConfigState {
  readonly settings: AskSettings;
  readonly agentMode: boolean;
  readonly setSettings: (settings: AskSettings) => void;
  readonly setAgentMode: (enabled: boolean) => void;
}

const STORAGE_KEY = "rag-demo-config";

const loadConfig = (): { settings: AskSettings; agentMode: boolean } => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("no config");
    const parsed = JSON.parse(raw) as {
      settings?: AskSettings;
      agentMode?: boolean;
    };
    return {
      settings: {
        topK: parsed.settings?.topK ?? 6,
        minScore: parsed.settings?.minScore ?? 0.05,
        allowExternalSearch: parsed.settings?.allowExternalSearch ?? false,
        geminiModel: parsed.settings?.geminiModel ?? "",
      },
      agentMode: parsed.agentMode ?? false,
    };
  } catch {
    return {
      settings: {
        topK: 6,
        minScore: 0.05,
        allowExternalSearch: false,
        geminiModel: "",
      },
      agentMode: false,
    };
  }
};

const saveConfig = (settings: AskSettings, agentMode: boolean): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, agentMode }));
};

const initial = loadConfig();

export const useConfigStore = create<ConfigState>((set) => ({
  settings: initial.settings,
  agentMode: initial.agentMode,
  setSettings: (settings) => {
    set((state) => {
      saveConfig(settings, state.agentMode);
      return { settings };
    });
  },
  setAgentMode: (agentMode) => {
    set((state) => {
      saveConfig(state.settings, agentMode);
      return { agentMode };
    });
  },
}));
