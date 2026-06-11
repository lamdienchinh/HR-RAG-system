import { retrieveChunks } from "../reindex.js";
import type { RetrievedChunk } from "../types.js";
import type { QueryAnalysis, RetrievalStrategy } from "./query-analyzer.js";

// --- Types ---
export interface RetrievalResult {
  readonly chunks: readonly RetrievedChunk[];
  readonly strategy: RetrievalStrategy;
  readonly iterations: number;
  readonly queries: readonly string[];
}

/**
 * Deduplicates retrieved chunks by keeping the occurrence with the HIGHEST score.
 *
 * WHY IS IT NEEDED: Prevents sub-queries (which execute first with lower semantic matches)
 * from pre-empting and locking out high-scoring exact matches returned by the original query.
 *
 * EXAMPLE:
 *  - Input: [ { id: "p1#c02", score: 0.4 }, { id: "p1#c02", score: 0.9 } ]
 *  - Output: [ { id: "p1#c02", score: 0.9 } ]
 */
const deduplicateChunks = (
  chunks: readonly RetrievedChunk[],
): readonly RetrievedChunk[] => {
  const bestChunks = new Map<string, RetrievedChunk>();

  for (const chunk of chunks) {
    const existing = bestChunks.get(chunk.id);
    // Keep the chunk only if it hasn't been seen, or if the new one has a higher score
    if (!existing || chunk.score > existing.score) {
      bestChunks.set(chunk.id, chunk);
    }
  }

  return Array.from(bestChunks.values());
};

// --- Strategy executors ---
const executeDirect = async (
  question: string,
  topK: number,
  isAdmin: boolean,
): Promise<RetrievalResult> => {
  const { chunks } = await retrieveChunks(question, topK, isAdmin);
  return {
    chunks,
    strategy: "direct",
    iterations: 1,
    queries: [question],
  };
};

const executeDecompose = async (
  question: string,
  subQueries: readonly string[],
  topK: number,
  isAdmin: boolean,
): Promise<RetrievalResult> => {
  const allChunks: RetrievedChunk[] = [];
  const queries: string[] = [question];

  // Retrieve for each sub-query
  for (const subQuery of subQueries.slice(0, 3)) {
    queries.push(subQuery);
    const { chunks } = await retrieveChunks(
      subQuery,
      Math.ceil(topK / subQueries.length) + 2,
      isAdmin,
    );
    allChunks.push(...chunks);
  }

  // Also retrieve with the original question to ensure coverage
  const { chunks: originalChunks } = await retrieveChunks(
    question,
    topK,
    isAdmin,
  );
  allChunks.push(...originalChunks);

  // Deduplicate properly and take top results by score
  const deduped = deduplicateChunks(allChunks);
  const sorted = [...deduped].sort((a, b) => b.score - a.score).slice(0, topK);

  return {
    chunks: sorted,
    strategy: "decompose",
    iterations: subQueries.length + 1,
    queries,
  };
};

const executeMultiRetrieve = async (
  question: string,
  keyEntities: readonly string[],
  topK: number,
  isAdmin: boolean,
): Promise<RetrievalResult> => {
  const allChunks: RetrievedChunk[] = [];
  const queries: string[] = [question];

  // Retrieve with original question
  const { chunks } = await retrieveChunks(question, topK, isAdmin);
  allChunks.push(...chunks);

  // Retrieve with entity-enriched queries
  for (const entity of keyEntities.slice(0, 2)) {
    const enrichedQuery = `${question} ${entity}`;
    queries.push(enrichedQuery);
    const { chunks: entityChunks } = await retrieveChunks(
      enrichedQuery,
      Math.ceil(topK / 2),
      isAdmin,
    );
    allChunks.push(...entityChunks);
  }

  // Deduplicate properly and rank
  const deduped = deduplicateChunks(allChunks);
  const sorted = [...deduped].sort((a, b) => b.score - a.score).slice(0, topK);

  return {
    chunks: sorted,
    strategy: "multi_retrieve",
    iterations: 1 + Math.min(keyEntities.length, 2),
    queries,
  };
};

const executeClarify = async (
  question: string,
  topK: number,
  isAdmin: boolean,
): Promise<RetrievalResult> => {
  const { chunks } = await retrieveChunks(question, topK, isAdmin);
  return {
    chunks,
    strategy: "clarify",
    iterations: 1,
    queries: [question],
  };
};

// --- Main entry point ---
interface RetrievalOptions {
  readonly topK?: number;
  readonly isAdmin?: boolean;
}

export const executeRetrieval = async (
  analysis: QueryAnalysis,
  question: string,
  options: RetrievalOptions = {},
): Promise<RetrievalResult> => {
  const topK = options.topK ?? 6;
  const isAdmin = options.isAdmin ?? true;

  switch (analysis.suggestedStrategy) {
    case "direct":
      return executeDirect(question, topK, isAdmin);
    case "decompose":
      if (analysis.subQueries.length > 0) {
        return executeDecompose(question, analysis.subQueries, topK, isAdmin);
      }
      return executeDirect(question, topK, isAdmin);
    case "multi_retrieve":
      if (analysis.keyEntities.length > 0) {
        return executeMultiRetrieve(
          question,
          analysis.keyEntities,
          topK,
          isAdmin,
        );
      }
      return executeDirect(question, topK, isAdmin);
    case "clarify":
      return executeClarify(question, topK, isAdmin);
    default:
      return executeDirect(question, topK, isAdmin);
  }
};
