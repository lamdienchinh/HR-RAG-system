import { createHash } from 'node:crypto';
import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';

export const vectorDimensions = 384;

const modelId = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';

let extractor: FeatureExtractionPipeline | null = null;

// Embedding cache: hash(text) → { vector, timestamp }
const embeddingCache = new Map<string, { readonly vector: readonly number[]; readonly ts: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_SIZE = 2000;

const hashText = (text: string): string => createHash('sha256').update(text).digest('hex').slice(0, 16);

const evictExpired = (): void => {
  const now = Date.now();
  for (const [key, entry] of embeddingCache) {
    if (now - entry.ts > CACHE_TTL_MS) embeddingCache.delete(key);
  }
  // Cap size: delete oldest entries
  if (embeddingCache.size > MAX_CACHE_SIZE) {
    const excess = embeddingCache.size - MAX_CACHE_SIZE;
    const keys = embeddingCache.keys();
    for (let i = 0; i < excess; i++) embeddingCache.delete(keys.next().value!);
  }
};

const getExtractor = async (): Promise<FeatureExtractionPipeline> => {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', modelId, {
      dtype: 'q8',
    });
  }
  return extractor;
};

export const embedText = async (text: string): Promise<readonly number[]> => {
  const key = hashText(text);
  const cached = embeddingCache.get(key);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) return cached.vector;

  const model = await getExtractor();
  const output = await model(text, { pooling: 'mean', normalize: true });
  const vector = Array.from(output.data as Float32Array).slice(0, vectorDimensions);

  embeddingCache.set(key, { vector, ts: Date.now() });
  evictExpired();
  return vector;
};

export const embedTexts = async (texts: readonly string[]): Promise<readonly (readonly number[])[]> => {
  const model = await getExtractor();
  const results: (readonly number[])[] = [];
  for (const text of texts) {
    const output = await model(text, { pooling: 'mean', normalize: true });
    results.push(Array.from(output.data as Float32Array).slice(0, vectorDimensions));
  }
  return results;
};

export const toPgVector = (vector: readonly number[]): string => `[${vector.join(',')}]`;
