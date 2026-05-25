import pg from 'pg';

import { config } from '../config.js';

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
});

export const closePool = async (): Promise<void> => {
  await pool.end();
};
