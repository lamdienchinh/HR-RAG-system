/**
 * RAG Evaluation Metrics
 *
 * Standard metrics for evaluating Retrieval-Augmented Generation systems.
 * All functions are pure — no DB or model calls needed.
 *
 * Retrieval metrics: Recall@K, Precision@K, MRR, NDCG@K, Hit Rate
 * Generation metrics: Faithfulness, Answer Relevance, Refusal Accuracy
 */

// ── Types ─────────────────────────────────────────────────────────

export interface RetrievalEvalResult {
  readonly questionId: string;
  readonly question: string;
  readonly recallAtK: number;
  readonly precisionAtK: number;
  readonly reciprocalRank: number;
  readonly ndcgAtK: number;
  readonly hit: boolean;
  readonly expectedPolicyIds: readonly string[];
  readonly retrievedPolicyIds: readonly string[];
}

export interface GenerationEvalResult {
  readonly questionId: string;
  readonly question: string;
  readonly faithfulness: number;
  readonly answerRelevance: number;
  readonly refusalCorrect: boolean | null; // null for answerable questions
  readonly answer: string;
}

export interface AggregateMetrics {
  readonly count: number;
  readonly meanRecallAtK: number;
  readonly meanPrecisionAtK: number;
  readonly mrr: number;
  readonly meanNdcgAtK: number;
  readonly hitRate: number;
  readonly meanFaithfulness: number;
  readonly meanAnswerRelevance: number;
  readonly refusalAccuracy: number;
}

// ── Retrieval Metrics ─────────────────────────────────────────────

/**
 * Recall@K: fraction of expected policies found in top-K retrieved chunks.
 * recall@K = |relevant ∩ retrieved| / |relevant|
 */
export const recallAtK = (
  expectedPolicyIds: readonly string[],
  retrievedPolicyIds: readonly string[],
): number => {
  if (expectedPolicyIds.length === 0) return 1; // nothing expected → trivially satisfied
  const expectedSet = new Set(expectedPolicyIds);
  const retrievedSet = new Set(retrievedPolicyIds);
  const hits = [...expectedSet].filter((id) => retrievedSet.has(id)).length;
  return hits / expectedSet.size;
};

/**
 * Precision@K: fraction of retrieved chunks that are relevant.
 * precision@K = |relevant ∩ retrieved| / |retrieved|
 */
export const precisionAtK = (
  expectedPolicyIds: readonly string[],
  retrievedPolicyIds: readonly string[],
): number => {
  if (retrievedPolicyIds.length === 0) return 0;
  const expectedSet = new Set(expectedPolicyIds);
  const hits = retrievedPolicyIds.filter((id) => expectedSet.has(id)).length;
  return hits / retrievedPolicyIds.length;
};

/**
 * MRR (Mean Reciprocal Rank): 1 / rank of first relevant item.
 * Returns 0 if no relevant item found.
 */
export const reciprocalRank = (
  expectedPolicyIds: readonly string[],
  retrievedPolicyIds: readonly string[],
): number => {
  const expectedSet = new Set(expectedPolicyIds);
  for (let i = 0; i < retrievedPolicyIds.length; i++) {
    if (expectedSet.has(retrievedPolicyIds[i])) {
      return 1 / (i + 1);
    }
  }
  return 0;
};

/**
 * NDCG@K (Normalized Discounted Cumulative Gain).
 * Binary relevance: 1 if policy is in expected set, 0 otherwise.
 * NDCG = DCG / IDCG where DCG = Σ(rel_i / log2(i+1))
 */
export const ndcgAtK = (
  expectedPolicyIds: readonly string[],
  retrievedPolicyIds: readonly string[],
): number => {
  if (retrievedPolicyIds.length === 0) return 0;
  const expectedSet = new Set(expectedPolicyIds);

  // DCG: sum of relevance / log2(rank+1)
  const dcg = retrievedPolicyIds.reduce((sum, id, i) => {
    const rel = expectedSet.has(id) ? 1 : 0;
    return sum + rel / Math.log2(i + 2); // i+2 because rank is 1-indexed
  }, 0);

  // IDCG: best possible DCG (all relevant items at top)
  const idealCount = Math.min(expectedSet.size, retrievedPolicyIds.length);
  let idcg = 0;
  for (let i = 0; i < idealCount; i++) {
    idcg += 1 / Math.log2(i + 2);
  }

  return idcg === 0 ? 0 : dcg / idcg;
};

/**
 * Hit: 1 if at least one expected policy appears in retrieved, 0 otherwise.
 */
export const hit = (
  expectedPolicyIds: readonly string[],
  retrievedPolicyIds: readonly string[],
): boolean => {
  if (expectedPolicyIds.length === 0) return true;
  const expectedSet = new Set(expectedPolicyIds);
  return retrievedPolicyIds.some((id) => expectedSet.has(id));
};

// ── Generation Metrics ────────────────────────────────────────────

/**
 * Stop words for tokenization (Vietnamese + English).
 */
const stopWords = new Set([
  "của",
  "và",
  "là",
  "cho",
  "với",
  "các",
  "được",
  "này",
  "đó",
  "trong",
  "không",
  "có",
  "một",
  "để",
  "từ",
  "theo",
  "tại",
  "đến",
  "khi",
  "nếu",
  "hoặc",
  "nhưng",
  "cũng",
  "như",
  "về",
  "trên",
  "dưới",
  "mỗi",
  "những",
  "bao",
  "nhiêu",
  "thì",
  "bởi",
  "hay",
  "tôi",
  "bạn",
  "gì",
  "nào",
  "sao",
  "đâu",
  "thể",
  "cần",
  "phải",
  "đã",
  "đang",
  "sẽ",
  "vẫn",
  "còn",
  "làm",
  "hết",
  "xong",
  "trước",
  "sau",
  "lúc",
  "ngày",
  "rồi",
  "mà",
  "lại",
  "nên",
  "the",
  "and",
  "for",
  "with",
  "what",
  "when",
  "where",
  "which",
  "why",
  "how",
  "can",
  "does",
  "this",
  "that",
  "are",
  "was",
  "were",
  "been",
  "being",
  "have",
  "has",
  "had",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "not",
  "but",
  "from",
  "they",
  "them",
  "their",
  "its",
  "you",
  "your",
  "about",
]);

const tokenize = (text: string): readonly string[] =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1 && !stopWords.has(t));

/**
 * Faithfulness (Groundedness): fraction of answer claims supported by retrieved chunks.
 *
 * Approximation: split answer into sentences, check if each sentence has
 * significant n-gram overlap with at least one retrieved chunk.
 *
 * Returns score in [0, 1] where 1 = all claims grounded.
 */
export const faithfulness = (
  answer: string,
  retrievedChunks: readonly { readonly content: string }[],
): number => {
  if (retrievedChunks.length === 0 || answer.trim().length === 0) return 0;

  // Split answer into sentences
  const sentences = answer
    .split(/(?<=[.!?;])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  if (sentences.length === 0) return 1;

  // Build chunk token sets (bigrams for better matching)
  const chunkBigrams = retrievedChunks.flatMap((chunk) => {
    const tokens = tokenize(chunk.content);
    return tokens.slice(0, -1).map((t, i) => `${t}_${tokens[i + 1]}`);
  });
  const chunkBigramSet = new Set(chunkBigrams);
  const chunkTokenSet = new Set(
    retrievedChunks.flatMap((c) => tokenize(c.content)),
  );

  let groundedCount = 0;
  for (const sentence of sentences) {
    const tokens = tokenize(sentence);
    const bigrams = tokens.slice(0, -1).map((t, i) => `${t}_${tokens[i + 1]}`);

    // Check if at least 30% of sentence bigrams appear in chunks
    if (bigrams.length > 0) {
      const matchedBigrams = bigrams.filter((b) =>
        chunkBigramSet.has(b),
      ).length;
      if (matchedBigrams / bigrams.length >= 0.3) {
        groundedCount++;
        continue;
      }
    }

    // Fallback: check if at least 50% of sentence tokens appear in chunks
    if (tokens.length > 0) {
      const matchedTokens = tokens.filter((t) => chunkTokenSet.has(t)).length;
      if (matchedTokens / tokens.length >= 0.5) {
        groundedCount++;
      }
    }
  }

  return groundedCount / sentences.length;
};

/**
 * Answer Relevance: how well the answer addresses the question.
 *
 * Uses multiple signals to handle Vietnamese text and paraphrasing:
 * 1. Token coverage: % of distinctive question tokens in answer
 * 2. N-gram partial match: % of question n-grams with at least 1 word in answer
 * 3. Key phrase coverage: important 2-grams from question appear in answer
 *
 * Returns score in [0, 1].
 */
export const answerRelevance = (question: string, answer: string): number => {
  const questionTokens = tokenize(question);
  const answerTokens = new Set(tokenize(answer));
  const answerLower = answer.toLowerCase();

  if (questionTokens.length === 0) return 1;

  // 1. Single token coverage (most important for Vietnamese)
  const singleTokens = questionTokens.filter((t) => t.length > 2);
  const matchedTokens = singleTokens.filter((t) => answerTokens.has(t));
  const tokenScore =
    singleTokens.length > 0 ? matchedTokens.length / singleTokens.length : 1;

  // 2. N-gram coverage with partial matching
  // Instead of requiring exact n-gram match, give credit if ANY word from the
  // n-gram appears in the answer. This handles paraphrasing better.
  const bigrams: string[] = [];
  for (let i = 0; i <= questionTokens.length - 2; i++) {
    bigrams.push(`${questionTokens[i]}_${questionTokens[i + 1]}`);
  }
  const significantBigrams = bigrams.filter((bg) => {
    const [w1, w2] = bg.split("_");
    return !stopWords.has(w1) || !stopWords.has(w2);
  });

  let bigramScore = 1;
  if (significantBigrams.length > 0) {
    let partialMatches = 0;
    for (const bg of significantBigrams) {
      const [w1, w2] = bg.split("_");
      // Exact match: both words appear consecutively
      if (answerLower.includes(`${w1} ${w2}`)) {
        partialMatches += 1;
      }
      // Partial match: at least one word appears
      else if (answerTokens.has(w1) || answerTokens.has(w2)) {
        partialMatches += 0.5;
      }
    }
    bigramScore = partialMatches / significantBigrams.length;
  }

  // 3. Key phrase check: important 2-grams from question
  // "ngày phép", "khung lương", "thiết bị" should appear in answer
  const keyPhrases = significantBigrams.map((bg) => bg.replace("_", " "));
  const matchedKeyPhrases = keyPhrases.filter((kp) => answerLower.includes(kp));
  const keyPhraseScore =
    keyPhrases.length > 0 ? matchedKeyPhrases.length / keyPhrases.length : 1;

  // Combined: weighted average
  // Token coverage is most reliable for Vietnamese (handles paraphrasing)
  // Bigram partial match gives credit for related concepts
  // Key phrase check catches important specific terms
  return 0.5 * tokenScore + 0.3 * bigramScore + 0.2 * keyPhraseScore;
};

/**
 * Refusal Accuracy: did the system correctly refuse unanswerable questions?
 *
 * Returns true if the system correctly identified an unanswerable question
 * (notFound=true or answer contains refusal patterns).
 */
export const refusalAccuracy = (
  answerable: boolean,
  notFound: boolean,
  answer: string,
): boolean | null => {
  // For answerable questions, we can't judge refusal accuracy
  if (answerable) return null;

  // For unanswerable questions, check if system refused
  if (notFound) return true;

  // Check for refusal patterns in the answer
  const refusalPattern =
    /không tìm thấy|không có đủ|không thể trả lời|xin lỗi|i cannot|not found|insufficient/i;
  return refusalPattern.test(answer);
};

// ── Aggregate Metrics ─────────────────────────────────────────────

/**
 * Compute aggregate metrics across all evaluation results.
 *
 * IMPORTANT: Retrieval metrics (Recall, Precision, MRR, NDCG, Hit Rate)
 * are computed ONLY over answerable questions. Unanswerable questions
 * have no ground truth, so including them would inflate metrics
 * (recall=1, hit=true for every unanswerable question).
 *
 * Unanswerable questions are judged ONLY by Refusal Accuracy.
 */
export const aggregateMetrics = (
  retrievalResults: readonly RetrievalEvalResult[],
  generationResults: readonly GenerationEvalResult[],
  answerableFlags?: ReadonlyMap<string, boolean>,
): AggregateMetrics => {
  const n = retrievalResults.length;
  if (n === 0) {
    return {
      count: 0,
      meanRecallAtK: 0,
      meanPrecisionAtK: 0,
      mrr: 0,
      meanNdcgAtK: 0,
      hitRate: 0,
      meanFaithfulness: 0,
      meanAnswerRelevance: 0,
      refusalAccuracy: 0,
    };
  }

  // Filter to answerable-only for retrieval metrics
  const answerableResults = answerableFlags
    ? retrievalResults.filter((r) => answerableFlags.get(r.questionId) !== false)
    : retrievalResults;

  const retN = answerableResults.length || 1; // avoid division by zero
  const meanRecallAtK =
    answerableResults.reduce((s, r) => s + r.recallAtK, 0) / retN;
  const meanPrecisionAtK =
    answerableResults.reduce((s, r) => s + r.precisionAtK, 0) / retN;
  const mrr = answerableResults.reduce((s, r) => s + r.reciprocalRank, 0) / retN;
  const meanNdcgAtK = answerableResults.reduce((s, r) => s + r.ndcgAtK, 0) / retN;
  const hitRate = answerableResults.length > 0
    ? answerableResults.filter((r) => r.hit).length / answerableResults.length
    : 0;

  const genN = generationResults.length;
  const meanFaithfulness =
    genN > 0
      ? generationResults.reduce((s, r) => s + r.faithfulness, 0) / genN
      : 0;
  const meanAnswerRelevance =
    genN > 0
      ? generationResults.reduce((s, r) => s + r.answerRelevance, 0) / genN
      : 0;

  // Refusal Accuracy: only for unanswerable questions
  const refusalResults = generationResults.filter(
    (r) => r.refusalCorrect !== null,
  );
  const refusalAccuracy =
    refusalResults.length > 0
      ? refusalResults.filter((r) => r.refusalCorrect === true).length /
        refusalResults.length
      : 1; // no unanswerable questions → trivially correct

  return {
    count: n,
    meanRecallAtK,
    meanPrecisionAtK,
    mrr,
    meanNdcgAtK,
    hitRate,
    meanFaithfulness,
    meanAnswerRelevance,
    refusalAccuracy,
  };
};

// ── Evaluation Runner ─────────────────────────────────────────────

export interface EvalQuestion {
  readonly id: string;
  readonly question: string;
  readonly expectedPolicyIds: readonly string[];
  readonly answerable: boolean;
}

export interface EvalRetrievalResult {
  readonly chunks: readonly {
    readonly policyId: string;
    readonly score: number;
  }[];
}

export interface EvalGenerationResult {
  readonly answer: string;
  readonly notFound: boolean;
  readonly retrievedChunks: readonly { readonly content: string }[];
}

/**
 * Evaluate retrieval for a single question.
 */
export const evaluateRetrieval = (
  question: EvalQuestion,
  retrievalResult: EvalRetrievalResult,
  topK: number,
): RetrievalEvalResult => {
  // Deduplicate retrieved policy IDs to avoid multiple chunks from the same policy
  // distorting the retrieval metrics (like NDCG > 1 or inflated Precision).
  const rawRetrievedPolicyIds = retrievalResult.chunks
    .slice(0, topK)
    .map((c) => c.policyId);
  const retrievedPolicyIds = Array.from(new Set(rawRetrievedPolicyIds));

  return {
    questionId: question.id,
    question: question.question,
    recallAtK: recallAtK(question.expectedPolicyIds, retrievedPolicyIds),
    precisionAtK: precisionAtK(question.expectedPolicyIds, retrievedPolicyIds),
    reciprocalRank: reciprocalRank(
      question.expectedPolicyIds,
      retrievedPolicyIds,
    ),
    ndcgAtK: ndcgAtK(question.expectedPolicyIds, retrievedPolicyIds),
    hit: hit(question.expectedPolicyIds, retrievedPolicyIds),
    expectedPolicyIds: question.expectedPolicyIds,
    retrievedPolicyIds,
  };
};

/**
 * Evaluate generation for a single question.
 */
export const evaluateGeneration = (
  question: EvalQuestion,
  generationResult: EvalGenerationResult,
): GenerationEvalResult => ({
  questionId: question.id,
  question: question.question,
  faithfulness: faithfulness(
    generationResult.answer,
    generationResult.retrievedChunks,
  ),
  answerRelevance: answerRelevance(question.question, generationResult.answer),
  refusalCorrect: refusalAccuracy(
    question.answerable,
    generationResult.notFound,
    generationResult.answer,
  ),
  answer: generationResult.answer,
});
