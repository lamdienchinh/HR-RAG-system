import { AutoTokenizer, AutoModelForSequenceClassification, type PreTrainedTokenizer, type PreTrainedModel } from '@huggingface/transformers';

// Multilingual cross-encoder reranker (XLM-RoBERTa, supports 100+ languages including Vietnamese).
// Replaces the English-only MS MARCO model. ~279MB INT8 quantized.
const rerankerModelId = 'Xenova/bge-reranker-base';
let tokenizer: PreTrainedTokenizer | null = null;
let model: PreTrainedModel | null = null;

const getRerankerModel = async (): Promise<{ tokenizer: PreTrainedTokenizer; model: PreTrainedModel }> => {
  if (!tokenizer || !model) {
    tokenizer = await AutoTokenizer.from_pretrained(rerankerModelId);
    model = await AutoModelForSequenceClassification.from_pretrained(rerankerModelId, { dtype: 'q8' });
  }
  return { tokenizer, model };
};

export const scoreRerankerPair = async (query: string, passage: string): Promise<number> => {
  const { tokenizer: tok, model: mdl } = await getRerankerModel();
  
  // Let the tokenizer handle the truncation strictly based on TOKENS (max_length: 512) instead of characters!
  const inputs = tok(query, { 
    text_pair: passage, 
    padding: true, 
    truncation: true, 
    max_length: 512 
  });
  
  const output = await mdl(inputs);
  const logits = output.logits.data as Float32Array;
  return logits[0];
};

export const scoreRerankerPairs = async (query: string, passages: readonly string[]): Promise<readonly number[]> => {
  const { tokenizer: tok, model: mdl } = await getRerankerModel();

  // Duplicate the query to match the batch size of passages
  const queries = Array(passages.length).fill(query);

  // Hugging Face Transformers.js supports batch encoding via array inputs
  const inputs = tok(queries, {
    text_pair: passages as string[],
    padding: true,
    truncation: true,
    max_length: 512 // Native model token limit
  });

  const output = await mdl(inputs);
  const logits = output.logits.data as Float32Array;
  
  // Flat Float32Array maps 1:1 to the batched candidates
  return Array.from(logits);
};

export { getRerankerModel };

export interface RerankCandidate {
  readonly id: string;
  readonly content: string;
  readonly fusionScore: number;
}

export interface RerankedResult {
  readonly id: string;
  readonly rerankerScore: number;
  readonly fusionScore: number;
  readonly finalScore: number;
}

const rerankerWeight = 0.7;
const fusionWeight = 0.3;

// Sigmoid normalization: maps raw logits to [0, 1] without score-clustering amplification.
const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

const normalizeRerankerScores = (rawLogits: readonly number[]): readonly number[] => {
  if (rawLogits.length === 0) return [];
  if (rawLogits.length === 1) return [sigmoid(rawLogits[0])];

  // Z-score standardization -> sigmoid. Centers around mean so the sigmoid
  // maps the distribution into its most sensitive region (near 0.5).
  const mean = rawLogits.reduce((sum, v) => sum + v, 0) / rawLogits.length;
  const variance = rawLogits.reduce((sum, v) => sum + (v - mean) ** 2, 0) / rawLogits.length;
  const stddev = Math.sqrt(variance) || 1;
  return rawLogits.map((v) => sigmoid((v - mean) / stddev));
};

const minMaxNormalize = (values: readonly number[]): readonly number[] => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range === 0) return values.map(() => 0.5);
  return values.map((value) => (value - min) / range);
};

export const rerankCandidates = async (
  query: string,
  candidates: readonly RerankCandidate[],
  topK: number,
): Promise<readonly RerankedResult[]> => {
  if (candidates.length === 0) return [];

  // Extract content strings to be batched
  const passages = candidates.map((c) => c.content);

  // STEP 1: BATCH INFERENCE (Massive performance boost over individual loops)
  const rawRerankerScores = await scoreRerankerPairs(query, passages);

  // STEP 2: NORMALIZATION
  // Sigmoid-normalize cross-encoder logits (robust to score clustering)
  const normalizedRerankerScores = normalizeRerankerScores(rawRerankerScores);

  // Min-max normalize fusion (RRF) scores (uniform distribution, safe for min-max)
  const fusionValues = candidates.map((c) => c.fusionScore);
  const normalizedFusionScores = minMaxNormalize(fusionValues);

  // STEP 3: BLENDING & SORTING
  const results: RerankedResult[] = candidates.map((candidate, index) => ({
    id: candidate.id,
    rerankerScore: normalizedRerankerScores[index],
    fusionScore: candidate.fusionScore,
    finalScore: rerankerWeight * normalizedRerankerScores[index] + fusionWeight * normalizedFusionScores[index],
  }));

  return results
    .sort((left, right) => right.finalScore - left.finalScore)
    .slice(0, topK);
};
