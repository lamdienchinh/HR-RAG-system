import type { QueryResultRow } from "pg";
import { pool } from "../db/pool.js";
import { RRF_K, SYNONYM_MAP } from "../constants/index.js";
import { embedText, toPgVector } from "./embeddings.js";
import { rerankCandidates, type RerankCandidate } from "./reranker.js";
import type { RetrievedChunk } from "./types.js";

interface RetrievedChunkRow extends QueryResultRow {
  readonly id: string;
  readonly policy_id: string;
  readonly title: string;
  readonly version: string;
  readonly status: string;
  readonly content: string;
  readonly is_private: boolean;
  readonly distance: number;
}

interface FtsChunkRow extends QueryResultRow {
  readonly id: string;
  readonly policy_id: string;
  readonly title: string;
  readonly version: string;
  readonly status: string;
  readonly content: string;
  readonly is_private: boolean;
  readonly rank: number;
}

// Reciprocal Rank Fusion constant
const computeRrfScore = (rank: number): number => 1 / (RRF_K + rank);

// Expand query with synonym/related terms for better FTS recall
const expandQueryTerms = (question: string): string => {
  const lowerQuestion = question.toLowerCase();
  const expansions: string[] = [question];

  for (const [trigger, synonyms] of Object.entries(SYNONYM_MAP)) {
    if (lowerQuestion.includes(trigger)) {
      expansions.push(...synonyms);
    }
  }

  // Join with OR for websearch_to_tsquery compatibility
  return expansions.join(" OR ");
};

export const retrieveChunks = async (
  question: string,
  topK: number,
  isAdmin: boolean = true,
  options?: {
    readonly skipReranker?: boolean;
    readonly embeddingProvider?: "local" | "cloud";
  },
): Promise<{ readonly chunks: readonly RetrievedChunk[] }> => {
  const candidatePool = topK * 3;
  const queryVector = toPgVector(await embedText(question, options?.embeddingProvider || "local"));
  const privacyFilter = isAdmin ? "" : "AND is_private = false";
  const statusFilter = "AND status = 'current'";

  // REPEATABLE READ: consistent snapshot — if reindex swaps tables mid-query,
  // both reads see the same data (prevents inconsistent chunks)
  const client = await pool.connect();
  let vectorResults: readonly RetrievedChunkRow[];
  let ftsResults: readonly FtsChunkRow[];

  try {
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    const [v, f] = await Promise.all([
      client.query<RetrievedChunkRow>(
        `
        SELECT id, policy_id, title, version, status, content, is_private,
               embedding <=> $1::vector AS distance
        FROM document_chunks
        WHERE true ${privacyFilter} ${statusFilter}
        ORDER BY embedding <=> $1::vector
        LIMIT $2
      `,
        [queryVector, candidatePool],
      ),
      client.query<FtsChunkRow>(
        `
        SELECT id, policy_id, title, version, status, content, is_private,
               ts_rank_cd(tsv, websearch_to_tsquery('simple', $1)) AS rank
        FROM document_chunks
        WHERE tsv @@ websearch_to_tsquery('simple', $1) ${privacyFilter} ${statusFilter}
        ORDER BY rank DESC
        LIMIT $2
      `,
        [expandQueryTerms(question), candidatePool],
      ),
    ]);
    await client.query("COMMIT");
    vectorResults = v.rows;
    ftsResults = f.rows;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  // RRF fusion for policy chunks
  const fusionScores = new Map<string, number>();
  const chunkMap = new Map<string, RetrievedChunkRow | FtsChunkRow>();

  vectorResults.forEach((row, rank) => {
    const current = fusionScores.get(row.id) ?? 0;
    fusionScores.set(row.id, current + computeRrfScore(rank + 1));
    chunkMap.set(row.id, row);
  });

  ftsResults.forEach((row, rank) => {
    const current = fusionScores.get(row.id) ?? 0;
    fusionScores.set(row.id, current + computeRrfScore(rank + 1));
    if (!chunkMap.has(row.id)) chunkMap.set(row.id, row);
  });

  // Sort by fusion score
  const sortedCandidates = [...fusionScores.entries()].sort((a, b) => b[1] - a[1]);

  // FIXED: Balanced Policy diversification algorithm.
  // We allow up to 3 high-scoring chunks of the same policy to co-exist in Pass 1.
  // This preserves sequential segments of the target policy while preventing noise policies from hogging the candidate window.
  const MAX_CHUNKS_PER_POLICY = 3;
  const policyCounts = new Map<string, number>();
  const diversified: [string, number][] = [];

  // Pass 1: Grab up to 3 best chunks per unique policy
  for (const [id, score] of sortedCandidates) {
    const policyId = chunkMap.get(id)?.policy_id ?? "";
    const currentCount = policyCounts.get(policyId) ?? 0;

    if (currentCount < MAX_CHUNKS_PER_POLICY) {
      diversified.push([id, score]);
      policyCounts.set(policyId, currentCount + 1);
    }
    if (diversified.length >= topK * 2) break;
  }

  // Pass 2: Fill remaining empty candidate slots strictly by fusion score
  if (diversified.length < topK * 2) {
    const diversifiedIds = new Set(diversified.map(([id]) => id));
    for (const [id, score] of sortedCandidates) {
      if (!diversifiedIds.has(id)) {
        diversified.push([id, score]);
        diversifiedIds.add(id);
      }
      if (diversified.length >= topK * 2) break;
    }
  }

  if (options?.skipReranker) {
    const finalCandidates = diversified.slice(0, topK);
    const chunks = finalCandidates.map(([id, score]) => {
      const row = chunkMap.get(id);
      return {
        id,
        policyId: row?.policy_id ?? "",
        title: row?.title ?? "",
        version: row?.version ?? "",
        status: row?.status ?? "",
        content: row?.content ?? "",
        isPrivate: row?.is_private ?? false,
        distance: 1 - score,
        score: score,
      };
    });
    return { chunks: mergeContiguousChunks(chunks) };
  }

  const rerankInput: RerankCandidate[] = diversified.map(([id, score]) => ({
    id,
    content: chunkMap.get(id)?.content ?? "",
    fusionScore: score,
  }));

  const reranked = await rerankCandidates(question, rerankInput, topK);

  const chunks = reranked.map((result) => {
    const row = chunkMap.get(result.id);
    return {
      id: result.id,
      policyId: row?.policy_id ?? "",
      title: row?.title ?? "",
      version: row?.version ?? "",
      status: row?.status ?? "",
      content: row?.content ?? "",
      isPrivate: row?.is_private ?? false,
      distance: 1 - result.finalScore,
      score: result.finalScore,
    };
  });

  return { chunks: mergeContiguousChunks(chunks) };
};

/**
 * HELPER: Contiguous Chunk Merging
 *
 * PURPOSE: Groups and merges contiguous chunks (e.g. chunk-001 and chunk-002) of the same policy
 * to prevent context window bloat, avoid header duplication, and present a cohesive text segment to the LLM.
 * Non-contiguous chunks remain separate.
 */
const mergeContiguousChunks = (chunks: readonly RetrievedChunk[]): readonly RetrievedChunk[] => {
  if (chunks.length <= 1) return chunks;

  // 1. Group chunks by Policy ID
  const policyGroups = new Map<string, RetrievedChunk[]>();
  for (const chunk of chunks) {
    const group = policyGroups.get(chunk.policyId) || [];
    group.push(chunk);
    policyGroups.set(chunk.policyId, group);
  }

  const mergedChunks: RetrievedChunk[] = [];
  const processedIds = new Set<string>();

  // 2. Iterate through original chunks to preserve similarity order
  for (const chunk of chunks) {
    if (processedIds.has(chunk.id)) continue;

    // Parse sequence number from ID (e.g., "policy#chunk-001" -> 1)
    const match = chunk.id.match(/#chunk-(\d+)$/);
    if (!match) {
      mergedChunks.push(chunk);
      processedIds.add(chunk.id);
      continue;
    }

    const currentNum = parseInt(match[1], 10);
    const policyId = chunk.policyId;
    const group = policyGroups.get(policyId) || [];

    // Find contiguous blocks of next consecutive chunks
    const contiguousBlock = [chunk];
    processedIds.add(chunk.id);

    let nextNum = currentNum + 1;
    while (true) {
      const nextChunk = group.find((c) => {
        const m = c.id.match(/#chunk-(\d+)$/);
        return m && parseInt(m[1], 10) === nextNum && !processedIds.has(c.id);
      });

      if (nextChunk) {
        contiguousBlock.push(nextChunk);
        processedIds.add(nextChunk.id);
        nextNum++;
      } else {
        break;
      }
    }

    // Find contiguous blocks of previous consecutive chunks
    let prevNum = currentNum - 1;
    while (true) {
      const prevChunk = group.find((c) => {
        const m = c.id.match(/#chunk-(\d+)$/);
        return m && parseInt(m[1], 10) === prevNum && !processedIds.has(c.id);
      });

      if (prevChunk) {
        contiguousBlock.unshift(prevChunk); // Prepend to the block
        processedIds.add(prevChunk.id);
        prevNum--;
      } else {
        break;
      }
    }

    // 3. Package merged chunk or push original if single
    if (contiguousBlock.length === 1) {
      mergedChunks.push(chunk);
    } else {
      const maxScore = Math.max(...contiguousBlock.map((c) => c.score));
      const minDistance = Math.min(...contiguousBlock.map((c) => c.distance));

      // Concatenate content of contiguous chunks, deduplicating repeated headers and overlaps
      let mergedContent = "";
      contiguousBlock.forEach((c, i) => {
        if (i === 0) {
          mergedContent = c.content;
        } else {
          const cleanedNext = cleanNextChunkContent(mergedContent, c.content);
          mergedContent += `\n\n--- [Phần tiếp theo của chính sách] ---\n\n${cleanedNext}`;
        }
      });

      mergedChunks.push({
        ...chunk,
        id: contiguousBlock.map((c) => c.id).join("+"), // Combine IDs
        content: mergedContent,
        score: maxScore,
        distance: minDistance,
      });
    }
  }

  return mergedChunks;
};

/**
 * HELPER: Deduplicates overlapping sentences and repeated heading contexts
 * from chunk B before merging it next to chunk A.
 */
const cleanNextChunkContent = (contentA: string, contentB: string): string => {
  const linesA = contentA.split("\n").map((l) => l.trim());
  const linesB = contentB.split("\n").map((l) => l.trim());

  // 1. Strip identical leading heading lines from B
  let hIndex = 0;
  while (
    hIndex < linesB.length &&
    linesB[hIndex].startsWith("#") &&
    linesA.includes(linesB[hIndex])
  ) {
    hIndex++;
  }

  let cleanB = linesB.slice(hIndex).join("\n").trim();

  // 2. Strip overlapping sentence from the start of B
  const sentencesB = cleanB
    .split(/(?<=[.!?;])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (sentencesB.length > 0) {
    const firstSentenceB = sentencesB[0];
    const normalizedA = contentA.replace(/\s+/g, " ").trim();
    if (normalizedA.endsWith(firstSentenceB)) {
      cleanB = sentencesB.slice(1).join(" ").trim();
    }
  }

  return cleanB;
};
