/**
 * RAG Evaluation Test Suite
 *
 * Tests for the evaluation metrics (unit tests) and
 * quality gate tests against mock retrieval/generation results.
 */

import { describe, expect, it } from "vitest";
import { evalQuestions } from "./fixtures.js";
import {
  aggregateMetrics,
  answerRelevance,
  evaluateGeneration,
  evaluateRetrieval,
  faithfulness,
  hit,
  ndcgAtK,
  precisionAtK,
  recallAtK,
  reciprocalRank,
  refusalAccuracy,
  type GenerationEvalResult,
  type RetrievalEvalResult,
} from "./rag-eval.js";

// ── Retrieval Metric Unit Tests ───────────────────────────────────

describe("Recall@K", () => {
  it("returns 1 when all expected policies are retrieved", () => {
    expect(recallAtK(["a", "b"], ["a", "b", "c"])).toBe(1);
  });

  it("returns 0 when no expected policies are retrieved", () => {
    expect(recallAtK(["a", "b"], ["c", "d"])).toBe(0);
  });

  it("returns partial recall", () => {
    expect(recallAtK(["a", "b", "c"], ["a", "d"])).toBeCloseTo(1 / 3, 5);
  });

  it("returns 1 for empty expected (trivially satisfied)", () => {
    expect(recallAtK([], ["a", "b"])).toBe(1);
  });

  it("handles duplicate retrieved IDs", () => {
    expect(recallAtK(["a"], ["a", "a", "a"])).toBe(1);
  });
});

describe("Precision@K", () => {
  it("returns 1 when all retrieved are relevant", () => {
    expect(precisionAtK(["a", "b"], ["a", "b"])).toBe(1);
  });

  it("returns 0 when none retrieved are relevant", () => {
    expect(precisionAtK(["a", "b"], ["c", "d"])).toBe(0);
  });

  it("returns partial precision", () => {
    expect(precisionAtK(["a"], ["a", "b", "c"])).toBeCloseTo(1 / 3, 5);
  });

  it("returns 0 for empty retrieved", () => {
    expect(precisionAtK(["a"], [])).toBe(0);
  });
});

describe("MRR (Reciprocal Rank)", () => {
  it("returns 1 when first retrieved is relevant", () => {
    expect(reciprocalRank(["a"], ["a", "b", "c"])).toBe(1);
  });

  it("returns 0.5 when second retrieved is relevant", () => {
    expect(reciprocalRank(["b"], ["a", "b", "c"])).toBeCloseTo(0.5, 5);
  });

  it("returns 0 when no relevant item found", () => {
    expect(reciprocalRank(["x"], ["a", "b", "c"])).toBe(0);
  });

  it("returns 1/3 when third retrieved is first relevant", () => {
    expect(reciprocalRank(["c"], ["a", "b", "c"])).toBeCloseTo(1 / 3, 5);
  });
});

describe("NDCG@K", () => {
  it("returns 1 for perfect ranking", () => {
    expect(ndcgAtK(["a", "b"], ["a", "b", "c"])).toBeCloseTo(1, 5);
  });

  it("returns 0 when no relevant items", () => {
    expect(ndcgAtK(["x"], ["a", "b", "c"])).toBe(0);
  });

  it("returns 0 for empty retrieved", () => {
    expect(ndcgAtK(["a"], [])).toBe(0);
  });

  it("penalizes relevant items ranked lower", () => {
    const perfect = ndcgAtK(["a", "b"], ["a", "b"]);
    const swapped = ndcgAtK(["a", "b"], ["b", "a"]);
    // Both are perfect since both items are relevant — NDCG is the same
    expect(swapped).toBeCloseTo(perfect, 5);
  });

  it("gives lower score when relevant item is at bottom", () => {
    const bestRank = ndcgAtK(["a"], ["a", "x", "x"]);
    const worstRank = ndcgAtK(["a"], ["x", "x", "a"]);
    expect(bestRank).toBeGreaterThan(worstRank);
  });
});

describe("Hit", () => {
  it("returns true when at least one expected is retrieved", () => {
    expect(hit(["a", "b"], ["x", "a"])).toBe(true);
  });

  it("returns false when no expected is retrieved", () => {
    expect(hit(["a", "b"], ["x", "y"])).toBe(false);
  });

  it("returns true for empty expected (trivially satisfied)", () => {
    expect(hit([], ["a"])).toBe(true);
  });
});

// ── Generation Metric Unit Tests ──────────────────────────────────

describe("Faithfulness", () => {
  it("returns 1 when all answer sentences are grounded in chunks", () => {
    const answer =
      "Nhân viên được nghỉ 18 ngày phép năm. Thời gian nghỉ không vượt quá 30 ngày.";
    const chunks = [
      {
        content:
          "Nhân viên chính thức được hưởng 18 ngày phép năm có lương. Thời gian nghỉ phép không lương không được vượt quá 30 ngày dương lịch.",
      },
    ];
    const score = faithfulness(answer, chunks);
    expect(score).toBeGreaterThan(0.5);
  });

  it("returns 0 for empty chunks", () => {
    expect(faithfulness("Some answer.", [])).toBe(0);
  });

  it("returns 0 for empty answer", () => {
    expect(faithfulness("", [{ content: "Some content." }])).toBe(0);
  });

  it("returns lower score when answer has ungrounded claims", () => {
    const grounded = faithfulness("Nhân viên được nghỉ 18 ngày phép năm.", [
      { content: "Nhân viên chính thức được hưởng 18 ngày phép năm có lương." },
    ]);
    const ungrounded = faithfulness(
      "Nhân viên được nghỉ 18 ngày phép năm. Công ty có 5000 nhân viên trên toàn thế giới.",
      [
        {
          content: "Nhân viên chính thức được hưởng 18 ngày phép năm có lương.",
        },
      ],
    );
    expect(grounded).toBeGreaterThan(ungrounded);
  });
});

describe("Answer Relevance", () => {
  it("returns high score when answer contains question entities", () => {
    const score = answerRelevance(
      "Khung lương nào áp dụng cho Senior Backend Engineer?",
      "Senior Backend Engineer thuộc cấp bậc E4. Khung lương cơ bản E4 là 72.000 USD đến 105.000 USD.",
    );
    expect(score).toBeGreaterThan(0.3);
  });

  it("returns low score when answer misses question entities", () => {
    const score = answerRelevance(
      "Khung lương nào áp dụng cho Senior Backend Engineer?",
      "Nhân viên được nghỉ 18 ngày phép năm có lương.",
    );
    expect(score).toBeLessThan(0.5);
  });

  it("returns 1 for empty question tokens", () => {
    expect(answerRelevance("a", "Some answer.")).toBe(1);
  });
});

describe("Refusal Accuracy", () => {
  it("returns null for answerable questions", () => {
    expect(refusalAccuracy(true, false, "Some answer")).toBeNull();
  });

  it("returns true when system correctly refuses unanswerable", () => {
    expect(refusalAccuracy(false, true, "")).toBe(true);
  });

  it("returns true when answer contains refusal pattern", () => {
    expect(
      refusalAccuracy(
        false,
        false,
        "Xin lỗi, tôi không tìm thấy thông tin phù hợp.",
      ),
    ).toBe(true);
  });

  it("returns false when system answers unanswerable question", () => {
    expect(
      refusalAccuracy(false, false, "The company stock price will be 100."),
    ).toBe(false);
  });
});

// ── Aggregate Metrics Tests ───────────────────────────────────────

describe("aggregateMetrics", () => {
  it("computes correct aggregates", () => {
    const retrieval: RetrievalEvalResult[] = [
      {
        questionId: "q1",
        question: "Q1",
        recallAtK: 1,
        precisionAtK: 0.5,
        reciprocalRank: 1,
        ndcgAtK: 1,
        hit: true,
        expectedPolicyIds: ["a"],
        retrievedPolicyIds: ["a", "b"],
      },
      {
        questionId: "q2",
        question: "Q2",
        recallAtK: 0.5,
        precisionAtK: 0.25,
        reciprocalRank: 0.5,
        ndcgAtK: 0.5,
        hit: true,
        expectedPolicyIds: ["c", "d"],
        retrievedPolicyIds: ["c", "e"],
      },
    ];
    const generation: GenerationEvalResult[] = [
      {
        questionId: "q1",
        question: "Q1",
        faithfulness: 0.8,
        answerRelevance: 0.9,
        refusalCorrect: null,
        answer: "A1",
      },
      {
        questionId: "q2",
        question: "Q2",
        faithfulness: 0.6,
        answerRelevance: 0.7,
        refusalCorrect: null,
        answer: "A2",
      },
    ];

    const agg = aggregateMetrics(retrieval, generation);
    expect(agg.count).toBe(2);
    expect(agg.meanRecallAtK).toBeCloseTo(0.75, 5);
    expect(agg.meanPrecisionAtK).toBeCloseTo(0.375, 5);
    expect(agg.mrr).toBeCloseTo(0.75, 5);
    expect(agg.hitRate).toBe(1);
    expect(agg.meanFaithfulness).toBeCloseTo(0.7, 5);
    expect(agg.meanAnswerRelevance).toBeCloseTo(0.8, 5);
  });

  it("handles empty inputs", () => {
    const agg = aggregateMetrics([], []);
    expect(agg.count).toBe(0);
    expect(agg.meanRecallAtK).toBe(0);
    expect(agg.hitRate).toBe(0);
  });
});

// ── Evaluation Runner Tests ───────────────────────────────────────

describe("evaluateRetrieval", () => {
  it("evaluates a correct retrieval", () => {
    const question = evalQuestions[0]; // hr-time-off-carryover
    const result = evaluateRetrieval(
      question,
      { chunks: [{ policyId: "time-off-policy", score: 0.9 }] },
      6,
    );
    expect(result.recallAtK).toBe(1);
    expect(result.precisionAtK).toBe(1);
    expect(result.reciprocalRank).toBe(1);
    expect(result.hit).toBe(true);
  });

  it("evaluates a missed retrieval", () => {
    const question = evalQuestions[0]; // expects time-off-policy
    const result = evaluateRetrieval(
      question,
      { chunks: [{ policyId: "wrong-policy", score: 0.9 }] },
      6,
    );
    expect(result.recallAtK).toBe(0);
    expect(result.precisionAtK).toBe(0);
    expect(result.reciprocalRank).toBe(0);
    expect(result.hit).toBe(false);
  });
});

describe("evaluateGeneration", () => {
  it("evaluates a faithful answer", () => {
    const question = evalQuestions[0];
    const result = evaluateGeneration(question, {
      answer:
        "Nhân viên được chuyển tối đa 5 ngày phép chưa sử dụng sang năm tiếp theo.",
      notFound: false,
      retrievedChunks: [
        {
          content:
            "Nhân viên có thể chuyển tối đa 5 ngày phép chưa sử dụng sang năm tiếp theo.",
        },
      ],
    });
    expect(result.faithfulness).toBeGreaterThan(0);
    expect(result.answerRelevance).toBeGreaterThan(0);
    expect(result.refusalCorrect).toBeNull(); // answerable question
  });

  it("evaluates a correct refusal", () => {
    const unanswerable = evalQuestions.find((q) => !q.answerable)!;
    const result = evaluateGeneration(unanswerable, {
      answer:
        "Xin lỗi, tôi không tìm thấy thông tin phù hợp trong dữ liệu chính sách.",
      notFound: true,
      retrievedChunks: [],
    });
    expect(result.refusalCorrect).toBe(true);
  });
});

// ── Quality Gate Tests ────────────────────────────────────────────
// These test the metric functions with realistic mock data patterns.

describe("Quality Gates — retrieval metrics function correctly", () => {
  it("single-hop question: perfect retrieval scores 1.0", () => {
    const question = evalQuestions.find((q) => q.id === "hr-salary-band")!;
    const result = evaluateRetrieval(
      question,
      {
        chunks: [
          { policyId: "compensation-policy", score: 0.95 },
          { policyId: "promotion-policy", score: 0.6 },
        ],
      },
      6,
    );
    expect(result.recallAtK).toBe(1);
    expect(result.hit).toBe(true);
    expect(result.reciprocalRank).toBe(1);
  });

  it("multi-hop question: partial retrieval scores correctly", () => {
    const question = evalQuestions.find((q) => q.id === "hr-leave-comparison")!;
    // Only retrieved 1 of 2 expected policies
    const result = evaluateRetrieval(
      question,
      {
        chunks: [
          { policyId: "time-off-policy", score: 0.9 },
          { policyId: "other-policy", score: 0.5 },
        ],
      },
      6,
    );
    expect(result.recallAtK).toBeCloseTo(0.5, 5);
    expect(result.hit).toBe(true);
    expect(result.precisionAtK).toBeCloseTo(0.5, 5);
  });

  it("unanswerable question: no expected policies → recall=1 trivially", () => {
    const question = evalQuestions.find((q) => q.id === "hr-stock-forecast")!;
    const result = evaluateRetrieval(
      question,
      {
        chunks: [{ policyId: "some-policy", score: 0.3 }],
      },
      6,
    );
    expect(result.recallAtK).toBe(1); // no expected → trivially satisfied
  });
});

describe("Quality Gates — generation metrics function correctly", () => {
  it("faithful answer scores high", () => {
    const question = evalQuestions.find(
      (q) => q.id === "hr-time-off-carryover",
    )!;
    const result = evaluateGeneration(question, {
      answer:
        "Nhân viên có thể chuyển tối đa 5 ngày phép chưa sử dụng sang năm tiếp theo. Số ngày phép chuyển sẽ hết hạn vào ngày 31 tháng 3.",
      notFound: false,
      retrievedChunks: [
        {
          content:
            "Nhân viên có thể chuyển tối đa 5 ngày phép chưa sử dụng sang năm tiếp theo. Số ngày phép chuyển sẽ hết hạn vào ngày 31 tháng 3 trừ khi Phòng Nhân sự cấp ngoại lệ.",
        },
      ],
    });
    expect(result.faithfulness).toBeGreaterThan(0.5);
    expect(result.answerRelevance).toBeGreaterThan(0.1);
  });

  it("unfaithful answer scores low", () => {
    const question = evalQuestions.find((q) => q.id === "hr-salary-band")!;
    const result = evaluateGeneration(question, {
      answer:
        "Nhân viên được nghỉ 18 ngày phép năm. Công ty có 5000 nhân viên.",
      notFound: false,
      retrievedChunks: [
        { content: "Khung lương E4 là 72.000 USD đến 105.000 USD." },
      ],
    });
    expect(result.faithfulness).toBeLessThan(0.5);
  });

  it("correct refusal for unanswerable question", () => {
    const question = evalQuestions.find((q) => q.id === "hr-lunch-menu")!;
    const result = evaluateGeneration(question, {
      answer:
        "Xin lỗi, tôi không tìm thấy thông tin về thực đơn căng tin trong dữ liệu chính sách.",
      notFound: true,
      retrievedChunks: [],
    });
    expect(result.refusalCorrect).toBe(true);
  });

  it("incorrect answer to unanswerable question", () => {
    const question = evalQuestions.find((q) => q.id === "hr-personal-loan")!;
    const result = evaluateGeneration(question, {
      answer: "Công ty cho phép vay tối đa 50 triệu VNĐ.",
      notFound: false,
      retrievedChunks: [],
    });
    expect(result.refusalCorrect).toBe(false);
  });
});
