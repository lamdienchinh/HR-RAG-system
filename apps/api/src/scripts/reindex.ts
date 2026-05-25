import { closePool } from '../db/pool.js';
import { runMigrations } from '../db/migrations.js';
import { reindexPolicies } from '../lib/reindex.js';

const main = async (): Promise<void> => {
  await runMigrations();
  const result = await reindexPolicies();
  console.log(`Indexed ${result.chunkCount} chunks from ${result.policyCount} policies`);
};

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => {
    void closePool();
  });
