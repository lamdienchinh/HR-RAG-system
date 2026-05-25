import type { QueryResultRow } from 'pg';

import { randomUUID } from 'node:crypto';

import { pool } from '../db/pool.js';
import type { Policy, SeedPolicy } from './types.js';

// Lazy import to avoid circular dependency
let reindexPolicyFn: ((policyId: string) => Promise<{ chunkCount: number }>) | null = null;
const getReindexPolicy = async () => {
  if (!reindexPolicyFn) {
    const mod = await import('./reindex.js');
    reindexPolicyFn = mod.reindexPolicy;
  }
  return reindexPolicyFn;
};

// Fire-and-forget incremental reindex after policy mutations
const autoReindex = (policyId: string): void => {
  void getReindexPolicy().then((fn) => fn(policyId)).catch((err: unknown) => {
    console.warn('Auto-reindex failed:', err instanceof Error ? err.message : String(err));
  });
};

interface PolicyRow extends QueryResultRow {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly version: string;
  readonly status: string;
  readonly sensitivity: string;
  readonly is_private: boolean;
  readonly updated_at: Date;
  readonly content: string;
}

export interface CreatePolicyInput {
  readonly title: string;
  readonly category: string;
  readonly version: string;
  readonly status: string;
  readonly sensitivity: string;
  readonly content: string;
}

const mapPolicy = (row: PolicyRow): Policy => ({
  id: row.id,
  title: row.title,
  category: row.category,
  version: row.version,
  status: row.status,
  sensitivity: row.sensitivity,
  isPrivate: row.is_private,
  updatedAt: row.updated_at.toISOString(),
  content: row.content,
});

export const listPolicies = async (includePrivate: boolean = true): Promise<readonly Policy[]> => {
  const whereClause = includePrivate ? '' : 'WHERE is_private = false';
  const result = await pool.query<PolicyRow>(`
    SELECT id, title, category, version, status, sensitivity, is_private, updated_at, content
    FROM policies
    ${whereClause}
    ORDER BY category, title
  `);
  return result.rows.map(mapPolicy);
};

export const getPolicy = async (id: string): Promise<Policy | null> => {
  const result = await pool.query<PolicyRow>(`
    SELECT id, title, category, version, status, sensitivity, is_private, updated_at, content
    FROM policies
    WHERE id = $1
  `, [id]);
  return result.rows[0] ? mapPolicy(result.rows[0]) : null;
};

const slugify = (value: string): string => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 48);

export const createPolicy = async (input: CreatePolicyInput): Promise<Policy> => {
  const id = `${slugify(input.title) || 'custom-policy'}-${randomUUID().slice(0, 8)}`;
  const result = await pool.query<PolicyRow>(`
    INSERT INTO policies (id, title, category, version, status, sensitivity, content)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, title, category, version, status, sensitivity, is_private, updated_at, content
  `, [
    id,
    input.title,
    input.category,
    input.version,
    input.status,
    input.sensitivity,
    input.content,
  ]);
  await pool.query(`
    INSERT INTO policy_revisions (policy_id, version, content, note)
    VALUES ($1, $2, $3, $4)
  `, [id, input.version, input.content, 'Created from policy dashboard']);
  autoReindex(id);
  return mapPolicy(result.rows[0]);
};

export const deletePolicy = async (id: string): Promise<void> => {
  const result = await pool.query('DELETE FROM policies WHERE id = $1', [id]);
  if (result.rowCount === 0) {
    throw new Error(`Unknown policy id: ${id}`);
  }
  autoReindex(id); // reindexPolicy handles deleted policy by removing its chunks
};

export const seedPolicies = async (policies: readonly SeedPolicy[]): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE document_chunks, policy_revisions, policies');
    for (const policy of policies) {
      await client.query(`
        INSERT INTO policies (id, title, category, version, status, sensitivity, is_private, content)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        policy.id,
        policy.title,
        policy.category,
        policy.version,
        policy.status,
        policy.sensitivity,
        policy.isPrivate ?? false,
        policy.content,
      ]);
      await client.query(`
        INSERT INTO policy_revisions (policy_id, version, content, note)
        VALUES ($1, $2, $3, $4)
      `, [policy.id, policy.version, policy.content, 'Seeded initial policy']);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updatePolicy = async (id: string, content: string, note: string): Promise<Policy> => {
  const existing = await getPolicy(id);
  if (!existing) {
    throw new Error(`Unknown policy id: ${id}`);
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<PolicyRow>(`
      UPDATE policies
      SET content = $1, updated_at = now()
      WHERE id = $2
      RETURNING id, title, category, version, status, sensitivity, is_private, updated_at, content
    `, [content, id]);
    await client.query(`
      INSERT INTO policy_revisions (policy_id, version, content, note)
      VALUES ($1, $2, $3, $4)
    `, [id, existing.version, content, note]);
    await client.query('COMMIT');
    autoReindex(id);
    return mapPolicy(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updatePolicyStatus = async (id: string, status: string): Promise<Policy> => {
  const validStatuses = ['current', 'stale'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
  }
  const result = await pool.query<PolicyRow>(`
    UPDATE policies
    SET status = $1, updated_at = now()
    WHERE id = $2
    RETURNING id, title, category, version, status, sensitivity, is_private, updated_at, content
  `, [status, id]);
  if (result.rows.length === 0) {
    throw new Error(`Unknown policy id: ${id}`);
  }
  // Sync status to document_chunks so retrieval reflects the change immediately
  await pool.query(`UPDATE document_chunks SET status = $1 WHERE policy_id = $2`, [status, id]);
  return mapPolicy(result.rows[0]);
};

export const togglePolicyPrivacy = async (id: string, isPrivate: boolean): Promise<Policy> => {
  const result = await pool.query<PolicyRow>(`
    UPDATE policies
    SET is_private = $1, updated_at = now()
    WHERE id = $2
    RETURNING id, title, category, version, status, sensitivity, is_private, updated_at, content
  `, [isPrivate, id]);
  if (result.rows.length === 0) {
    throw new Error(`Unknown policy id: ${id}`);
  }
  // Sync is_private to document_chunks for retrieval filtering
  await pool.query(`UPDATE document_chunks SET is_private = $1 WHERE policy_id = $2`, [isPrivate, id]);
  return mapPolicy(result.rows[0]);
};
