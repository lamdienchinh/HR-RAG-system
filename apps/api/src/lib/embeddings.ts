import { createHash } from 'node:crypto';
import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';

export const vectorDimensions = 384;
const modelId = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
let extractor: FeatureExtractionPipeline | null = null;

// Embedding cache: hash(text) → { vector, timestamp }
const embeddingCache = new Map<string, { readonly vector: readonly number[]; readonly ts: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_SIZE = 2000;

/**
 * Generates a short sha256 hash for cache keying.
 */
const hashText = (text: string): string => createHash('sha256').update(text).digest('hex').slice(0, 16);

/**
 * Evicts expired entries and keeps the cache size within limits.
 */
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

/**
 * Lazy-loads the Hugging Face feature extraction pipeline.
 */
const getExtractor = async (): Promise<FeatureExtractionPipeline> => {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', modelId, {
      dtype: 'q8', // Quantized 8-bit model for high-speed CPU inference
    });
  }
  return extractor;
};

/**
 * Embeds a single text string, with caching support.
 * 
 * EXAMPLE:
 *  - Input: "Hello world"
 *  - Output: [0.012, -0.045, ..., 0.089] (Array of 384 dimensions)
 */
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

/**
 * Embeds multiple text strings efficiently using batch inference and hybrid cache lookup.
 * 
 * WHY IS IT NEEDED: Running inference sequentially in a loop is highly inefficient. 
 * This function batches uncached items to utilize parallel CPU/GPU execution while preserving cache benefits.
 * 
 * EXAMPLE:
 *  - Input: ["Paragraph 1", "Paragraph 2"]
 *  - Output: [[0.012, ...], [-0.034, ...]] (Array of 384-dimension vectors)
 */
export const embedTexts = async (texts: readonly string[]): Promise<readonly (readonly number[])[]> => {
  const model = await getExtractor();
  const results: (readonly number[])[] = new Array(texts.length);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  // STEP 1: HYBRID CACHE LOOKUP
  // Filter out which chunks are already cached and which ones need raw embedding
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    const key = hashText(text);
    const cached = embeddingCache.get(key);

    if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
      results[i] = cached.vector; // Retrieve from cache instantly
    } else {
      uncachedIndices.push(i);
      uncachedTexts.push(text); // Mark for batch processing
    }
  }

  // STEP 2: BATCH INFERENCE FOR UNCACHED TEXTS
  if (uncachedTexts.length > 0) {
    // Pipeline supports passing an array directly for optimized batch processing
    const output = await model(uncachedTexts, { pooling: 'mean', normalize: true });
    
    // The outputs are returned as a flat 1D array. We slice it into chunks of "vectorDimensions"
    const flatData = output.data as Float32Array;

    for (let i = 0; i < uncachedTexts.length; i++) {
      const startIndex = i * vectorDimensions;
      const vector = Array.from(flatData.subarray(startIndex, startIndex + vectorDimensions));

      // Put it back in the correct position of the original array
      const originalIndex = uncachedIndices[i];
      results[originalIndex] = vector;

      // Save to cache for future requests
      const text = uncachedTexts[i];
      const key = hashText(text);
      embeddingCache.set(key, { vector, ts: Date.now() });
    }

    // Trigger cleanup once after the whole batch instead of on every single item
    evictExpired();
  }

  return results;
};

export const toPgVector = (vector: readonly number[]): string => `[${vector.join(',')}]`;
