import type { QueryResultRow } from 'pg';

import { pool } from '../db/pool.js';
import { createPolicyChunks } from './chunking.js';
import { embedText, toPgVector } from './embeddings.js';
import { rerankCandidates, type RerankCandidate } from './reranker.js';
import { listPolicies } from './policies.js';
import type { RetrievedChunk } from './types.js';

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
const rrfK = 60;

const computeRrfScore = (rank: number): number => 1 / (rrfK + rank);

/** Full reindex: rebuild entire document_chunks table (used by /api/reindex) */
export const reindexPolicies = async (): Promise<{ readonly policyCount: number; readonly chunkCount: number }> => {
  const policies = await listPolicies();
  const chunks = createPolicyChunks(policies);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('CREATE TEMP TABLE document_chunks_new (LIKE document_chunks INCLUDING ALL) ON COMMIT DROP');
    for (const chunk of chunks) {
      const embedding = await embedText(`${chunk.title}\n${chunk.content}`);
      const policy = policies.find((p) => p.id === chunk.policyId);
      const isPrivate = policy?.isPrivate ?? false;
      await client.query(`
        INSERT INTO document_chunks_new (id, policy_id, title, version, status, content, is_private, embedding)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)
      `, [chunk.id, chunk.policyId, chunk.title, chunk.version, chunk.status, chunk.content, isPrivate, toPgVector(embedding)]);
    }
    await client.query('TRUNCATE document_chunks');
    await client.query(`INSERT INTO document_chunks (id, policy_id, title, version, status, content, is_private, embedding)
      SELECT id, policy_id, title, version, status, content, is_private, embedding FROM document_chunks_new`);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return { policyCount: policies.length, chunkCount: chunks.length };
};

/** Incremental reindex: replace chunks for a single policy only */
export const reindexPolicy = async (policyId: string): Promise<{ readonly chunkCount: number }> => {
  const { getPolicy } = await import('./policies.js');
  const policy = await getPolicy(policyId);
  if (!policy) {
    // Policy deleted — just remove its chunks
    await pool.query('DELETE FROM document_chunks WHERE policy_id = $1', [policyId]);
    return { chunkCount: 0 };
  }

  const chunks = createPolicyChunks([policy]);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Delete old chunks for this policy, insert new ones atomically
    await client.query('DELETE FROM document_chunks WHERE policy_id = $1', [policyId]);
    for (const chunk of chunks) {
      const embedding = await embedText(`${chunk.title}\n${chunk.content}`);
      await client.query(`
        INSERT INTO document_chunks (id, policy_id, title, version, status, content, is_private, embedding)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)
      `, [chunk.id, chunk.policyId, chunk.title, chunk.version, chunk.status, chunk.content, policy.isPrivate, toPgVector(embedding)]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return { chunkCount: chunks.length };
};


// Expand query with synonym/related terms for better FTS recall
const expandQueryTerms = (question: string): string => {
  const synonymMap: Record<string, readonly string[]> = {
    // English
    leave: ['time off', 'vacation', 'PTO', 'annual leave', 'sick leave', 'absence'],
    remote: ['work from home', 'WFH', 'telecommute', 'hybrid', 'remote work'],
    wfh: ['work from home', 'remote work', 'remote', 'telecommute'],
    overtime: ['OT', 'extra hours', 'weekend work', 'overtime pay'],
    salary: ['compensation', 'pay', 'wage', 'remuneration', 'bonus'],
    hire: ['onboarding', 'recruitment', 'new employee', 'start date'],
    resign: ['offboarding', 'termination', 'exit', 'departure', 'last day'],
    equipment: ['laptop', 'device', 'hardware', 'badge', 'return'],
    security: ['access control', 'password', 'authentication', 'MFA', 'data handling'],
    policy: ['guideline', 'rule', 'regulation', 'procedure'],
    sick: ['illness', 'medical', 'sick leave', 'health'],
    parental: ['maternity', 'paternity', 'caregiver', 'parental leave'],
    // Vietnamese
    'phép': ['nghỉ phép', 'ngày phép', 'annual leave', 'nghỉ', 'phép năm'],
    'lương': ['mức lương', 'khung lương', 'compensation', 'salary', 'trả lương', 'lương cơ bản'],
    'nghỉ': ['nghỉ phép', 'nghỉ ốm', 'vắng mặt', 'leave', 'nghỉ việc'],
    'ốm': ['nghỉ ốm', 'sick leave', 'bệnh', 'y tế'],
    'làm thêm': ['overtime', 'OT', 'làm thêm giờ', 'tăng ca'],
    'tăng ca': ['overtime', 'OT', 'làm thêm giờ', 'làm thêm'],
    'từ xa': ['remote', 'WFH', 'làm việc từ xa', 'work from home'],
    'thiết bị': ['laptop', 'equipment', 'tài sản', 'máy tính'],
    'truy cập': ['access', 'quyền truy cập', 'security', 'bảo mật'],
    'onboarding': ['nhận việc', 'bắt đầu', 'nhân viên mới'],
    'offboarding': ['nghỉ việc', 'thôi việc', 'rời công ty'],
    'thăng tiến': ['promotion', 'cấp bậc', 'lên cấp', 'E4', 'E5'],
    'junior': ['cấp bậc', 'E3', 'level', 'entry'],
    'senior': ['E4', 'cấp bậc', 'level', 'engineer'],
    'đánh giá': ['performance', 'review', 'hiệu suất', 'calibration'],
    'chi phí': ['expense', 'hoàn trả', 'công tác', 'travel'],
    'nhân viên mới': ['onboarding', 'nhận việc', 'thiết bị', 'laptop', 'truy cập', 'access control', 'new employee'],
    'bắt đầu': ['onboarding', 'nhận việc', 'start date', 'nhân viên mới'],
    'quản lý': ['manager', 'phê duyệt', 'approval'],
    'thái sản': ['parental leave', 'maternity', 'paternity', 'nghỉ thai sản'],
  };

  const lowerQuestion = question.toLowerCase();
  const expansions: string[] = [question];

  for (const [trigger, synonyms] of Object.entries(synonymMap)) {
    if (lowerQuestion.includes(trigger)) {
      expansions.push(...synonyms);
    }
  }

  // Join with OR for websearch_to_tsquery compatibility
  return expansions.join(' OR ');
};


export const retrieveChunks = async (question: string, topK: number, isAdmin: boolean = true): Promise<{ readonly chunks: readonly RetrievedChunk[] }> => {
  const candidatePool = topK * 3;
  const queryVector = toPgVector(await embedText(question));
  const privacyFilter = isAdmin ? '' : 'AND is_private = false';

  // REPEATABLE READ: consistent snapshot — if reindex swaps tables mid-query,
  // both reads see the same data (prevents inconsistent chunks)
  const client = await pool.connect();
  let vectorResults: readonly RetrievedChunkRow[];
  let ftsResults: readonly FtsChunkRow[];
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    const [v, f] = await Promise.all([
      client.query<RetrievedChunkRow>(`
        SELECT id, policy_id, title, version, status, content, is_private,
               embedding <=> $1::vector AS distance
        FROM document_chunks
        WHERE true ${privacyFilter}
        ORDER BY embedding <=> $1::vector
        LIMIT $2
      `, [queryVector, candidatePool]),
      client.query<FtsChunkRow>(`
        SELECT id, policy_id, title, version, status, content, is_private,
               ts_rank_cd(tsv, websearch_to_tsquery('simple', $1)) AS rank
        FROM document_chunks
        WHERE tsv @@ websearch_to_tsquery('simple', $1) ${privacyFilter}
        ORDER BY rank DESC
        LIMIT $2
      `, [expandQueryTerms(question), candidatePool]),
    ]);
    await client.query('COMMIT');
    vectorResults = v.rows;
    ftsResults = f.rows;
  } catch (error) {
    await client.query('ROLLBACK');
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
  const sortedCandidates = [...fusionScores.entries()]
    .sort((a, b) => b[1] - a[1]);

  // Policy-diversified candidate selection for reranking.
  // Pass 1: take the best chunk per unique policy (ensures multi-hop coverage).
  // Pass 2: fill remaining slots by score (single-hop questions unaffected —
  // their dominant policy fills both passes).
  const seenPolicies = new Set<string>();
  const diversified: [string, number][] = [];
  for (const [id, score] of sortedCandidates) {
    const policyId = chunkMap.get(id)?.policy_id ?? '';
    if (!seenPolicies.has(policyId)) {
      diversified.push([id, score]);
      seenPolicies.add(policyId);
    }
    if (diversified.length >= topK * 2) break;
  }
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

  const rerankInput: RerankCandidate[] = diversified.map(([id, score]) => ({
    id,
    content: chunkMap.get(id)?.content ?? '',
    fusionScore: score,
  }));

  const reranked = await rerankCandidates(question, rerankInput, topK);

  const chunks = reranked.map((result) => {
    const row = chunkMap.get(result.id);
    return {
      id: result.id,
      policyId: row?.policy_id ?? '',
      title: row?.title ?? '',
      version: row?.version ?? '',
      status: row?.status ?? '',
      content: row?.content ?? '',
      isPrivate: row?.is_private ?? false,
      distance: 1 - result.finalScore,
      score: result.finalScore,
    };
  });

  return { chunks };
};
