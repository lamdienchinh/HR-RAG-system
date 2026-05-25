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

// Score a query-passage pair using raw logits (not sigmoid-crushed pipeline output)
export const scoreRerankerPair = async (query: string, passage: string): Promise<number> => {
  const { tokenizer: tok, model: mdl } = await getRerankerModel();
  const inputs = tok(query, { text_pair: passage, padding: true, truncation: true });
  const output = await mdl(inputs);
  const logits = output.logits.data as Float32Array;
  return logits[0];
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
// Min-max normalization distorts when all candidates are similarly relevant (small range →
// tiny differences blown up). Z-score + sigmoid is the standard approach for cross-encoder
// outputs — it preserves relative ordering while keeping scores in a natural probability scale.
const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

const normalizeRerankerScores = (rawLogits: readonly number[]): readonly number[] => {
  if (rawLogits.length === 0) return [];
  if (rawLogits.length === 1) return [sigmoid(rawLogits[0])];
  // Z-score standardization → sigmoid. Centers around mean so the sigmoid
  // maps the distribution into its most sensitive region (near 0.5).
  const mean = rawLogits.reduce((sum, v) => sum + v, 0) / rawLogits.length;
  const variance = rawLogits.reduce((sum, v) => sum + (v - mean) ** 2, 0) / rawLogits.length;
  const stddev = Math.sqrt(variance) || 1;
  return rawLogits.map((v) => sigmoid((v - mean) / stddev));
};

// Min-max normalization is still appropriate for fusion (RRF) scores — those are
// rank-derived and have a more uniform distribution, not raw logits.
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

  // Score all candidates with cross-encoder raw logits
  const rawRerankerScores: number[] = [];
  for (const candidate of candidates) {
    const score = await scoreRerankerPair(query, candidate.content.slice(0, 512));
    rawRerankerScores.push(score);
  }

  // Sigmoid-normalize cross-encoder logits (robust to score clustering)
  const normalizedRerankerScores = normalizeRerankerScores(rawRerankerScores);
  // Min-max normalize fusion (RRF) scores (uniform distribution, safe for min-max)
  const fusionValues = candidates.map((c) => c.fusionScore);
  const normalizedFusionScores = minMaxNormalize(fusionValues);

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
