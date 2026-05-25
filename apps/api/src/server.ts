import cors from 'cors';
import express from 'express';

import { config } from './config.js';
import { apiRouter } from './routes/api.js';

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.webOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS origin is not allowed: ${origin}`));
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use('/api', apiRouter);

app.listen(config.port, async () => {
  console.log(`HR RAG API listening on http://localhost:${config.port}`);
  // Seed default users
  try {
    const { seedUsers } = await import('./lib/auth.js');
    await seedUsers();
    console.log('Default users seeded');
  } catch (error) {
    console.warn('User seeding failed:', error instanceof Error ? error.message : String(error));
  }
  // Pre-warm ML models so first request is fast
  try {
    const { embedText } = await import('./lib/embeddings.js');
    const { getRerankerModel } = await import('./lib/reranker.js');
    await Promise.all([
      embedText('warmup'),
      getRerankerModel(),
    ]);
    console.log('ML models pre-warmed');
  } catch (error) {
    console.warn('Model pre-warm failed (will lazy-load):', error instanceof Error ? error.message : String(error));
  }
});
