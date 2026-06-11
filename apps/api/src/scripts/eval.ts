/**
 * RAG System Quality Evaluation Script
 *
 * Runs the 30 seed questions against the retrieval pipeline,
 * computes quality metrics, and displays a formatted report.
 *
 * Usage: pnpm eval
 */

import "dotenv/config";
import { answerQuestion } from "../lib/answer.js";
import { evalQuestions, qualityThresholds } from "../lib/eval/fixtures.js";
import {
  aggregateMetrics,
  evaluateGeneration,
  evaluateRetrieval,
  type GenerationEvalResult,
  type RetrievalEvalResult,
} from "../lib/eval/rag-eval.js";
import { reindexPolicies, retrieveChunks } from "../lib/reindex.js";

const EVAL_MODEL = process.env.EVAL_MODEL || "gemma-4-26b-a4b-it";

// ── Terminal Colors ───────────────────────────────────────────────

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgGreen: "\x1b[42m",
  bgRed: "\x1b[41m",
  bgYellow: "\x1b[43m",
};

// ── Formatting Helpers ────────────────────────────────────────────

const pad = (s: string, len: number): string => s.padEnd(len).slice(0, len);
const padLeft = (s: string, len: number): string => s.padStart(len);

const pass = (val: number, threshold: number): boolean => val >= threshold;

const statusIcon = (val: number, threshold: number): string =>
  pass(val, threshold)
    ? `${c.green}✅ PASS${c.reset}`
    : `${c.red}❌ FAIL${c.reset}`;

const bar = (val: number, threshold?: number, width: number = 24): string => {
  const filled = Math.round(val * width);
  const empty = width - filled;
  // Use threshold-based coloring when provided, otherwise absolute
  const color = threshold !== undefined
    ? (val >= threshold ? c.green : val >= threshold * 0.8 ? c.yellow : c.red)
    : (val >= 0.7 ? c.green : val >= 0.4 ? c.yellow : c.red);
  return `${color}${"█".repeat(filled)}${c.dim}${"░".repeat(empty)}${c.reset}`;
};

const pct = (val: number): string => `${Math.round(val * 100)}%`;

const horizontalLine = (char: string = "─", len: number = 70): string =>
  char.repeat(len);

// ── Report Sections ───────────────────────────────────────────────

const printHeader = (): void => {
  console.log();
  console.log(`${c.bold}${c.cyan}╔${"═".repeat(62)}╗${c.reset}`);
  console.log(
    `${c.bold}${c.cyan}║${c.reset}  ${c.bold}RAG SYSTEM QUALITY REPORT${c.reset}${" ".repeat(36)}${c.cyan}║${c.reset}`,
  );
  console.log(`${c.bold}${c.cyan}╠${"═".repeat(62)}╣${c.reset}`);
  console.log(
    `${c.cyan}║${c.reset}  ${c.dim}Generated:${c.reset} ${new Date().toLocaleString()}${" ".repeat(30)}${c.cyan}║${c.reset}`,
  );
  console.log(`${c.bold}${c.cyan}╚${"═".repeat(62)}╝${c.reset}`);
  console.log();
};

const printSummary = (
  count: number,
  answerable: number,
  unanswerable: number,
): void => {
  console.log(
    `  ${c.bold}Questions:${c.reset} ${count}  │  ${c.green}Answerable:${c.reset} ${answerable}  │  ${c.yellow}Unanswerable:${c.reset} ${unanswerable}`,
  );
  console.log();
};

const printMetricTable = (
  label: string,
  metrics: { name: string; value: number; threshold: number }[],
): void => {
  console.log(`  ${c.bold}${c.white}${label}${c.reset}`);
  console.log(`  ${"─".repeat(56)}`);
  console.log(
    `  ${c.dim}${pad("Metric", 20)}${padLeft("Score", 10)}${padLeft("Threshold", 12)}${padLeft("Status", 14)}${c.reset}`,
  );
  console.log(`  ${"─".repeat(56)}`);
  for (const m of metrics) {
    const valStr = m.value.toFixed(3);
    const thrStr = `≥ ${m.threshold.toFixed(2)}`;
    console.log(
      `  ${pad(m.name, 20)}${padLeft(valStr, 10)}${padLeft(thrStr, 12)}${statusIcon(m.value, m.threshold)}`,
    );
  }
  console.log();
};

const printBarChart = (metrics: { name: string; value: number; threshold?: number }[]): void => {
  const maxNameLen = Math.max(...metrics.map((m) => m.name.length));
  for (const m of metrics) {
    const name = pad(m.name, maxNameLen);
    console.log(
      `  ${c.bold}${name}${c.reset}  ${bar(m.value, m.threshold)}  ${pct(m.value)}`,
    );
  }
  console.log();
};

const printPerQuestionTable = (results: RetrievalEvalResult[]): void => {
  console.log(`  ${c.bold}${c.white}PER-QUESTION RETRIEVAL RESULTS${c.reset}`);
  console.log(`  ${"─".repeat(72)}`);
  console.log(
    `  ${c.dim}${pad("Question ID", 32)}${padLeft("Recall", 8)}${padLeft("Prec", 8)}${padLeft("MRR", 8)}${padLeft("NDCG", 8)}${padLeft("Hit", 8)}${c.reset}`,
  );
  console.log(`  ${"─".repeat(72)}`);

  for (const r of results) {
    const recallStr = r.recallAtK.toFixed(2);
    const precStr = r.precisionAtK.toFixed(2);
    const mrrStr = r.reciprocalRank.toFixed(2);
    const ndcgStr = r.ndcgAtK.toFixed(2);
    const hitStr = r.hit ? `${c.green}✅${c.reset}` : `${c.red}❌${c.reset}`;

    // Color recall based on quality
    const recallColor =
      r.recallAtK >= 0.8 ? c.green : r.recallAtK >= 0.5 ? c.yellow : c.red;

    console.log(
      `  ${pad(r.questionId, 32)}${recallColor}${padLeft(recallStr, 8)}${c.reset}${padLeft(precStr, 8)}${padLeft(mrrStr, 8)}${padLeft(ndcgStr, 8)}${padLeft(hitStr, 8)}`,
    );
  }
  console.log();
};

const printFailedQuestions = (results: RetrievalEvalResult[]): void => {
  const failed = results.filter((r) => !r.hit);
  if (failed.length === 0) {
    console.log(
      `  ${c.green}${c.bold}All questions have at least one relevant chunk retrieved!${c.reset}`,
    );
    console.log();
    return;
  }

  console.log(
    `  ${c.red}${c.bold}MISSED QUESTIONS (${failed.length})${c.reset}`,
  );
  console.log(`  ${"─".repeat(72)}`);
  for (const r of failed) {
    console.log(`  ${c.red}❌ ${r.questionId}${c.reset}`);
    console.log(`     ${c.dim}Question:${c.reset} ${r.question}`);
    console.log(
      `     ${c.dim}Expected:${c.reset} ${r.expectedPolicyIds.join(", ")}`,
    );
    console.log(
      `     ${c.dim}Got:${c.reset}      ${r.retrievedPolicyIds.length > 0 ? r.retrievedPolicyIds.join(", ") : "(none)"}`,
    );
  }
  console.log();
};

const printOverallVerdict = (
  retrievalMetrics: { name: string; value: number; threshold: number }[],
  genMetrics?: { name: string; value: number; threshold: number }[],
): void => {
  const allMetrics = genMetrics
    ? [...retrievalMetrics, ...genMetrics]
    : retrievalMetrics;
  const passed = allMetrics.filter((m) => pass(m.value, m.threshold)).length;
  const total = allMetrics.length;

  console.log(`  ${"═".repeat(56)}`);
  if (passed === total) {
    console.log(
      `  ${c.green}${c.bold}✅ OVERALL: ${passed}/${total} METRICS PASSED — SYSTEM HEALTHY${c.reset}`,
    );
  } else {
    console.log(
      `  ${c.yellow}${c.bold}⚠️  OVERALL: ${passed}/${total} METRICS PASSED — ${total - passed} NEEDS ATTENTION${c.reset}`,
    );
  }
  console.log(`  ${"═".repeat(56)}`);
  console.log();
};

// ── Main ──────────────────────────────────────────────────────────

const main = async (): Promise<void> => {
  const topK = 5;

  printHeader();

  // Step 1: Ensure index is up to date
  console.log(`  ${c.dim}⏳ Indexing policies...${c.reset}`);
  const indexResult = await reindexPolicies();
  console.log(
    `  ${c.green}✅ Indexed ${indexResult.chunkCount} chunks from ${indexResult.policyCount} policies${c.reset}`,
  );
  console.log();

  // Step 2: Run retrieval for each question
  console.log(
    `  ${c.dim}⏳ Running retrieval for ${evalQuestions.length} questions (topK=${topK})...${c.reset}`,
  );

  const retrievalResults: RetrievalEvalResult[] = [];
  const generationResults: GenerationEvalResult[] = [];

  for (let i = 0; i < evalQuestions.length; i++) {
    const q = evalQuestions[i];
    process.stdout.write(
      `\r  ${c.dim}Processing ${i + 1}/${evalQuestions.length}: ${q.id}${" ".repeat(20)}${c.reset}`,
    );

    try {
      const { chunks } = await retrieveChunks(q.question, topK, true);

      const retResult = evaluateRetrieval(q, { chunks }, topK);
      retrievalResults.push(retResult);

      // Optional: compute generation metrics (without Gemini — just faithfulness check)
      if (chunks.length > 0) {
        const answerResult = await answerQuestion(q.question, chunks, {
          minScore: 0.05,
          allowExternalSearch: false,
          topK,
          geminiModel: EVAL_MODEL,
        });
        const genResult = evaluateGeneration(q, {
          answer: answerResult.answer,
          notFound: answerResult.notFound,
          retrievedChunks: chunks,
        });
        generationResults.push(genResult);
      }
    } catch (error) {
      console.error(
        `\n  ${c.red}Error processing ${q.id}: ${error instanceof Error ? error.message : String(error)}${c.reset}`,
      );
    }
  }

  console.log(
    `\r  ${c.green}✅ Completed ${evalQuestions.length} questions${c.reset}                    `,
  );
  console.log();

  // Step 3: Compute aggregates (pass answerable flags to exclude unanswerable from retrieval metrics)
  const answerableMap = new Map(evalQuestions.map((q) => [q.id, q.answerable]));
  const agg = aggregateMetrics(retrievalResults, generationResults, answerableMap);

  const answerableQuestions = evalQuestions.filter((q) => q.answerable).length;
  const unanswerableQuestions = evalQuestions.filter(
    (q) => !q.answerable,
  ).length;

  printSummary(
    evalQuestions.length,
    answerableQuestions,
    unanswerableQuestions,
  );

  // Step 4: Retrieval metrics
  const retrievalMetrics = [
    {
      name: "Recall@K",
      value: agg.meanRecallAtK,
      threshold: qualityThresholds.minRecallAtK,
    },
    {
      name: "Precision@K",
      value: agg.meanPrecisionAtK,
      threshold: qualityThresholds.minPrecisionAtK,
    },
    { name: "MRR", value: agg.mrr, threshold: qualityThresholds.minMrr },
    {
      name: "NDCG@K",
      value: agg.meanNdcgAtK,
      threshold: qualityThresholds.minNdcg,
    },
    {
      name: "Hit Rate",
      value: agg.hitRate,
      threshold: qualityThresholds.minHitRate,
    },
  ];

  printMetricTable("RETRIEVAL METRICS", retrievalMetrics);
  printBarChart(
    retrievalMetrics.map((m) => ({ name: m.name, value: m.value, threshold: m.threshold })),
  );

  // Step 5: Generation metrics (if available)
  if (generationResults.length > 0) {
    const generationMetrics = [
      {
        name: "Faithfulness",
        value: agg.meanFaithfulness,
        threshold: qualityThresholds.minFaithfulness,
      },
      {
        name: "Answer Relevance",
        value: agg.meanAnswerRelevance,
        threshold: qualityThresholds.minAnswerRelevance,
      },
      {
        name: "Refusal Accuracy",
        value: agg.refusalAccuracy,
        threshold: qualityThresholds.minRefusalAccuracy,
      },
    ];

    printMetricTable("GENERATION METRICS", generationMetrics);
    printBarChart(
      generationMetrics.map((m) => ({ name: m.name, value: m.value, threshold: m.threshold })),
    );

    printOverallVerdict(retrievalMetrics, generationMetrics);
  } else {
    printOverallVerdict(retrievalMetrics);
  }

  // Step 6: Per-question results
  printPerQuestionTable(retrievalResults);

  // Step 7: Failed questions
  printFailedQuestions(retrievalResults);
};

main().catch((error) => {
  console.error(
    `${c.red}Fatal error: ${error instanceof Error ? error.message : String(error)}${c.reset}`,
  );
  process.exit(1);
});
