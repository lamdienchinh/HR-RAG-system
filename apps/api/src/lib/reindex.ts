import { pool } from "../db/pool.js";
import { createPolicyChunks } from "./chunking.js";
import { embedTexts, toPgVector } from "./embeddings.js"; // FIXED: Imported embedTexts for batching
import { listPolicies } from "./policies.js";

/** Full reindex: rebuild entire document_chunks table (used by /api/reindex) */
export const reindexPolicies = async (): Promise<{
  readonly policyCount: number;
  readonly chunkCount: number;
}> => {
  const policies = await listPolicies();
  const chunks = createPolicyChunks(policies);

  // FIXED: Batch embed all chunks at once (Huge performance boost over individual loops)
  const embeddingInputs = chunks.map((chunk) => `${chunk.title}\n${chunk.content}`);
  const embeddings = await embedTexts(embeddingInputs);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "CREATE TEMP TABLE document_chunks_new (LIKE document_chunks INCLUDING ALL) ON COMMIT DROP",
    );

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];
      const policy = policies.find((p) => p.id === chunk.policyId);
      const isPrivate = policy?.isPrivate ?? false;

      await client.query(
        `
        INSERT INTO document_chunks_new (id, policy_id, title, version, status, content, is_private, embedding)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)
      `,
        [
          chunk.id,
          chunk.policyId,
          chunk.title,
          chunk.version,
          chunk.status,
          chunk.content,
          isPrivate,
          toPgVector(embedding),
        ],
      );
    }

    await client.query("TRUNCATE document_chunks");
    await client.query(`INSERT INTO document_chunks (id, policy_id, title, version, status, content, is_private, embedding)
      SELECT id, policy_id, title, version, status, content, is_private, embedding FROM document_chunks_new`);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return { policyCount: policies.length, chunkCount: chunks.length };
};

/** Incremental reindex: replace chunks for a single policy only */
export const reindexPolicy = async (policyId: string): Promise<{ readonly chunkCount: number }> => {
  const { getPolicy } = await import("./policies.js");
  const policy = await getPolicy(policyId);

  if (!policy) {
    // Policy deleted — just remove its chunks
    await pool.query("DELETE FROM document_chunks WHERE policy_id = $1", [policyId]);
    return { chunkCount: 0 };
  }

  const chunks = createPolicyChunks([policy]);

  // FIXED: Batch embed policy chunks at once before running transaction
  const embeddingInputs = chunks.map((chunk) => `${chunk.title}\n${chunk.content}`);
  const embeddings = await embedTexts(embeddingInputs);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Delete old chunks for this policy, insert new ones atomically
    await client.query("DELETE FROM document_chunks WHERE policy_id = $1", [policyId]);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];

      await client.query(
        `
        INSERT INTO document_chunks (id, policy_id, title, version, status, content, is_private, embedding)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)
      `,
        [
          chunk.id,
          chunk.policyId,
          chunk.title,
          chunk.version,
          chunk.status,
          chunk.content,
          policy.isPrivate,
          toPgVector(embedding),
        ],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return { chunkCount: chunks.length };
};
