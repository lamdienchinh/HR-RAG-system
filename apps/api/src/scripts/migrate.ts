import { closePool } from '../db/pool.js';
import { runMigrations } from '../db/migrations.js';

const main = async (): Promise<void> => {
  await runMigrations();
  console.log('Migrations completed');
};

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => {
    void closePool();
  });
