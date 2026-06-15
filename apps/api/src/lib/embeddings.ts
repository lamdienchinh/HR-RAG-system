import { createHash } from "node:crypto";
import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";

export const vectorDimensions = 384;
const modelId = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
let extractor: FeatureExtractionPipeline | null = null;

// Embedding cache: hash(text) → { vector, timestamp }
const embeddingCache = new Map<
  string,
  { readonly vector: readonly number[]; readonly ts: number }
>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_SIZE = 2000;

/**
 * Generates a short sha256 hash for cache keying.
 */
const hashText = (text: string): string =>
  createHash("sha256").update(text).digest("hex").slice(0, 16);

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
    extractor = await pipeline("feature-extraction", modelId, {
      dtype: "q8", // Quantized 8-bit model for high-speed CPU inference
    });
  }
  return extractor;
};

/**
 * Embeds a single text string, with caching support.
 */
export const embedText = async (
  text: string,
  provider: "local" | "cloud" = "local",
): Promise<readonly number[]> => {
  const key = `${provider}:${hashText(text)}`;
  const cached = embeddingCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.vector;

  let vector: number[];

  if (provider === "cloud") {
    if (!config.geminiApiKey) {
      throw new Error("GEMINI_API_KEY is missing for cloud embeddings");
    }
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
    const response = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: text,
      config: {
        outputDimensionality: vectorDimensions,
      },
    });

    const values = response.embeddings?.[0]?.values;
    if (!values || values.length === 0) {
      throw new Error("Failed to generate cloud embedding values");
    }
    vector = Array.from(values);
  } else {
    const model = await getExtractor();
    const output = await model(text, { pooling: "mean", normalize: true });
    vector = Array.from(output.data as Float32Array).slice(0, vectorDimensions);
  }

  embeddingCache.set(key, { vector, ts: Date.now() });
  evictExpired();
  return vector;
};

/**
 * Embeds multiple text strings efficiently using batch inference and hybrid cache lookup.
 */
export const embedTexts = async (
  texts: readonly string[],
  provider: "local" | "cloud" = "local",
): Promise<readonly (readonly number[])[]> => {
  if (provider === "cloud") {
    if (!config.geminiApiKey) {
      throw new Error("GEMINI_API_KEY is missing for cloud embeddings");
    }
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
    const results: (readonly number[])[] = new Array(texts.length);
    const uncachedIndices: number[] = [];
    const uncachedTexts: string[] = [];

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const key = `cloud:${hashText(text)}`;
      const cached = embeddingCache.get(key);

      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        results[i] = cached.vector;
      } else {
        uncachedIndices.push(i);
        uncachedTexts.push(text);
      }
    }

    if (uncachedTexts.length > 0) {
      const response = await ai.models.embedContent({
        model: "text-embedding-004",
        contents: uncachedTexts,
        config: {
          outputDimensionality: vectorDimensions,
        },
      });

      const embeddings = response.embeddings;
      if (!embeddings || embeddings.length !== uncachedTexts.length) {
        throw new Error("Failed to generate batch cloud embeddings");
      }

      for (let i = 0; i < uncachedTexts.length; i++) {
        const values = embeddings[i]?.values;
        if (!values) throw new Error("Cloud embedding values are missing");
        const vector = Array.from(values);

        const originalIndex = uncachedIndices[i];
        results[originalIndex] = vector;

        const text = uncachedTexts[i];
        const key = `cloud:${hashText(text)}`;
        embeddingCache.set(key, { vector, ts: Date.now() });
      }
      evictExpired();
    }
    return results;
  }

  const model = await getExtractor();
  const results: (readonly number[])[] = new Array(texts.length);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    const key = `local:${hashText(text)}`;
    const cached = embeddingCache.get(key);

    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      results[i] = cached.vector;
    } else {
      uncachedIndices.push(i);
      uncachedTexts.push(text);
    }
  }

  if (uncachedTexts.length > 0) {
    const output = await model(uncachedTexts, {
      pooling: "mean",
      normalize: true,
    });
    const flatData = output.data as Float32Array;

    for (let i = 0; i < uncachedTexts.length; i++) {
      const startIndex = i * vectorDimensions;
      const vector = Array.from(flatData.subarray(startIndex, startIndex + vectorDimensions));

      const originalIndex = uncachedIndices[i];
      results[originalIndex] = vector;

      const text = uncachedTexts[i];
      const key = `local:${hashText(text)}`;
      embeddingCache.set(key, { vector, ts: Date.now() });
    }
    evictExpired();
  }

  return results;
};

export const toPgVector = (vector: readonly number[]): string => `[${vector.join(",")}]`;
