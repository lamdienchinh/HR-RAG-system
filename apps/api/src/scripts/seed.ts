import { closePool } from '../db/pool.js';
import { runMigrations } from '../db/migrations.js';
import { seedPolicies as seedPolicyRows } from '../lib/policies.js';
import { getSeedPolicies, type Locale } from '../lib/seedData.js';
import { reindexPolicies } from '../lib/reindex.js';
import { seedUsers } from '../lib/auth.js';

const main = async (): Promise<void> => {
  const locale = (process.argv[2] as Locale) || 'vi';
  await runMigrations();
  await seedUsers();
  console.log('Seeded default users (admin/admin123, employee/employee123)');
  await seedPolicyRows(getSeedPolicies(locale));
  const result = await reindexPolicies();
  console.log(`Seeded ${result.policyCount} policies (${locale}) and indexed ${result.chunkCount} chunks`);
};

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => {
    void closePool();
  });
