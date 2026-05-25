import type { CitationRef } from "../../lib/types";
import type { AskResult } from "../../types";

export const CITATION_PATTERN = /\[S(\d+)\]/g;

export const toCitationRefs = (result: AskResult): CitationRef[] =>
  (result.citations ?? []).map((c) => ({
    policyId: c.policyId,
    title: c.title,
    version: c.version,
    status: c.status,
  }));

/** Extract unique [S{n}] references from content, preserving first-occurrence order */
export const extractUsedCitations = (content: string): readonly number[] => {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const match of content.matchAll(CITATION_PATTERN)) {
    const n = parseInt(match[1], 10);
    if (!seen.has(n)) {
      seen.add(n);
      result.push(n);
    }
  }
  return result;
};
