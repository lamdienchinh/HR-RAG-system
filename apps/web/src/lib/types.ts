import type { AgentQueryAnalysis, AgentTraceStep } from "../apis/api";
import type { AskResult } from "../types";

export interface CitationRef {
  readonly policyId: string;
  readonly title: string;
  readonly version: string;
  readonly status: string;
}

export interface ChatMessage {
  readonly id: string;
  readonly role: "assistant" | "user";
  readonly content: string;
  readonly result?: AskResult;
  readonly citations?: readonly CitationRef[];
  readonly isError?: boolean;
}

export interface AgentTraceState {
  readonly analysis: AgentQueryAnalysis | null;
  readonly steps: readonly AgentTraceStep[];
  readonly isRunning: boolean;
  readonly strategy?: string;
  readonly iterations?: number;
}

export const emptyAgentTrace: AgentTraceState = {
  analysis: null,
  steps: [],
  isRunning: false,
};
