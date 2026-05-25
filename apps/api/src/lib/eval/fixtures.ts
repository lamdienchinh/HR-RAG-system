/**
 * RAG Evaluation Test Fixtures
 *
 * Seed data and helpers for running evaluation tests against the HR policy corpus.
 */

import type { EvalQuestion } from "./rag-eval.js";

/**
 * 30 seed evaluation questions from seedData.ts
 * Each has expectedPolicyIds (ground truth) and answerable flag.
 */
export const evalQuestions: readonly EvalQuestion[] = [
  // Basic lookup (24 questions)
  {
    id: "hr-time-off-carryover",
    question: "Nhân viên được chuyển bao nhiêu ngày phép sang năm sau?",
    expectedPolicyIds: ["time-off-policy"],
    answerable: true,
  },
  {
    id: "hr-ot-weekend-no-approval",
    question:
      "Tôi có thể yêu cầu thanh toán OT nếu làm Thứ Bảy mà chưa được duyệt không?",
    expectedPolicyIds: ["overtime-policy"],
    answerable: true,
  },
  {
    id: "hr-remote-work-abroad",
    question: "Cần những phê duyệt nào để làm việc từ xa ở nước ngoài?",
    expectedPolicyIds: ["remote-work-policy"],
    answerable: true,
  },
  {
    id: "hr-three-day-illness",
    question: "Nghỉ ốm 3 ngày thì áp dụng chính sách nào?",
    expectedPolicyIds: ["leave-of-absence"],
    answerable: true,
  },
  {
    id: "hr-salary-band",
    question: "Khung lương nào áp dụng cho Senior Backend Engineer?",
    expectedPolicyIds: ["compensation-policy"],
    answerable: true,
  },
  {
    id: "hr-equipment-new-hire",
    question: "Nhân viên mới được nhận những thiết bị gì trước ngày bắt đầu?",
    expectedPolicyIds: ["equipment-policy"],
    answerable: true,
  },
  {
    id: "hr-lost-device",
    question: "Mất laptop thì phải báo trong bao lâu?",
    expectedPolicyIds: ["equipment-policy"],
    answerable: true,
  },
  {
    id: "hr-production-access",
    question: "Cần phê duyệt gì để truy cập hệ thống production?",
    expectedPolicyIds: ["access-control-policy"],
    answerable: true,
  },
  {
    id: "hr-customer-data-ai-tools",
    question:
      "Dữ liệu khách hàng có được sao chép vào chatbot AI công khai không?",
    expectedPolicyIds: ["access-control-policy"],
    answerable: true,
  },
  {
    id: "hr-performance-review-cycle",
    question: "Đánh giá hiệu suất diễn ra khi nào?",
    expectedPolicyIds: ["performance-review-policy"],
    answerable: true,
  },
  {
    id: "hr-onboarding-request-window",
    question: "Yêu cầu onboarding cần nộp trước bao lâu?",
    expectedPolicyIds: ["onboarding-offboarding-policy"],
    answerable: true,
  },
  {
    id: "hr-training-budget",
    question: "Ngân sách đào tạo hàng năm cho mỗi nhân viên là bao nhiêu?",
    expectedPolicyIds: ["training-development-policy"],
    answerable: true,
  },
  {
    id: "hr-training-payback",
    question: "Nếu nghỉ việc sau khi hoàn thành khóa học đắt tiền thì sao?",
    expectedPolicyIds: ["training-development-policy"],
    answerable: true,
  },
  {
    id: "hr-gift-limit",
    question: "Nhận quà từ nhà cung cấp tối đa bao nhiêu?",
    expectedPolicyIds: ["code-of-conduct-policy"],
    answerable: true,
  },
  {
    id: "hr-referral-bonus",
    question: "Thưởng giới thiệu nhân viên kỹ thuật là bao nhiêu?",
    expectedPolicyIds: ["referral-bonus-policy"],
    answerable: true,
  },
  {
    id: "hr-password-requirements",
    question: "Yêu cầu mật khẩu theo chính sách an toàn thông tin là gì?",
    expectedPolicyIds: ["it-security-policy"],
    answerable: true,
  },
  {
    id: "hr-mfa-required",
    question: "Xác thực đa yếu tố có bắt buộc không?",
    expectedPolicyIds: ["it-security-policy"],
    answerable: true,
  },
  {
    id: "hr-data-breach-report",
    question: "Vi phạm dữ liệu phải báo cáo trong bao lâu?",
    expectedPolicyIds: ["data-privacy-policy"],
    answerable: true,
  },
  {
    id: "hr-health-insurance-dependents",
    question: "Người phụ thuộc có được hưởng bảo hiểm không?",
    expectedPolicyIds: ["health-insurance-policy"],
    answerable: true,
  },
  {
    id: "hr-wellness-budget",
    question: "Ngân sách phúc lợi wellness hàng năm là bao nhiêu?",
    expectedPolicyIds: ["health-insurance-policy"],
    answerable: true,
  },
  {
    id: "hr-promotion-senior-to-staff",
    question: "Điều kiện thăng tiến từ Senior lên Staff là gì?",
    expectedPolicyIds: ["promotion-policy"],
    answerable: true,
  },
  {
    id: "hr-discipline-steps",
    question: "Quy trình kỷ luật bao gồm những bước nào?",
    expectedPolicyIds: ["disciplinary-policy"],
    answerable: true,
  },
  {
    id: "hr-intern-production-access",
    question: "Thực tập sinh có được truy cập hệ thống production không?",
    expectedPolicyIds: ["intern-policy"],
    answerable: true,
  },
  {
    id: "hr-work-safety-wfh",
    question: "Làm việc tại nhà cần tuân thủ an toàn lao động như thế nào?",
    expectedPolicyIds: ["workplace-safety-policy"],
    answerable: true,
  },
  // Multi-hop (3 questions)
  {
    id: "hr-new-hire-full-setup",
    question: "Một nhân viên mới bắt đầu cần những gì từ IT, HR và quản lý?",
    expectedPolicyIds: [
      "onboarding-offboarding-policy",
      "equipment-policy",
      "access-control-policy",
    ],
    answerable: true,
  },
  {
    id: "hr-leave-comparison",
    question:
      "So sánh nghỉ phép năm, nghỉ ốm và nghỉ thai sản — mỗi loại được bao nhiêu ngày?",
    expectedPolicyIds: ["time-off-policy", "leave-of-absence"],
    answerable: true,
  },
  {
    id: "hr-departure-process",
    question:
      "Khi nhân viên nghỉ việc, cần làm những gì về thiết bị, quyền truy cập và bàn giao?",
    expectedPolicyIds: [
      "onboarding-offboarding-policy",
      "equipment-policy",
      "access-control-policy",
    ],
    answerable: true,
  },
  // ── Multi-policy & Comparison questions ────────────────────────
  {
    id: "hr-leave-types-overview",
    question: "Tổng hợp các loại nghỉ phép mà nhân viên được hưởng?",
    expectedPolicyIds: ["time-off-policy", "leave-of-absence"],
    answerable: true,
  },
  {
    id: "hr-compensation-package",
    question: "Chính sách lương thưởng và phúc lợi của công ty bao gồm những gì?",
    expectedPolicyIds: ["compensation-policy", "health-insurance-policy", "referral-bonus-policy"],
    answerable: true,
  },
  {
    id: "hr-security-vs-convenience",
    question: "So sánh yêu cầu bảo mật khi làm việc từ xa và tại văn phòng?",
    expectedPolicyIds: ["it-security-policy", "remote-work-policy"],
    answerable: true,
  },
  {
    id: "hr-ot-vs-remote-approval",
    question: "Quy trình phê duyệt cho làm thêm giờ và làm việc từ xa khác nhau thế nào?",
    expectedPolicyIds: ["overtime-policy", "remote-work-policy"],
    answerable: true,
  },
  // ── Leading / contextual questions (câu hỏi dẫn dắt) ──────────
  {
    id: "hr-long-leave-hypothetical",
    question: "Nếu tôi muốn nghỉ phép dài hơn số ngày quy định thì cần làm gì?",
    expectedPolicyIds: ["time-off-policy", "leave-of-absence"],
    answerable: true,
  },
  {
    id: "hr-new-hire-first-week",
    question: "Tuần đầu đi làm, tôi cần hoàn thành những thủ tục gì?",
    expectedPolicyIds: ["onboarding-offboarding-policy", "equipment-policy"],
    answerable: true,
  },
  {
    id: "hr-quit-return-bonus",
    question: "Nếu tôi nghỉ việc ngay sau khi nhận thưởng giới thiệu thì có bị thu hồi không?",
    expectedPolicyIds: ["referral-bonus-policy"],
    answerable: true,
  },
  {
    id: "hr-senior-promotion-path",
    question: "Tôi đang là Senior, muốn lên Staff thì cần đáp ứng những gì?",
    expectedPolicyIds: ["promotion-policy", "performance-review-policy"],
    answerable: true,
  },
  // ── Ambiguous / rewrite-trigger questions ─────────────────────
  {
    id: "hr-benefits-vague",
    question: "Phúc lợi của công ty có tốt không?",
    expectedPolicyIds: ["health-insurance-policy", "compensation-policy", "training-development-policy"],
    answerable: true,
  },
  {
    id: "hr-remote-conditions",
    question: "Điều kiện để được làm việc từ xa là gì?",
    expectedPolicyIds: ["remote-work-policy"],
    answerable: true,
  },
  // Unanswerable (3 questions)
  {
    id: "hr-stock-forecast",
    question: "Giá cổ phiếu công ty quý tới sẽ thế nào?",
    expectedPolicyIds: [],
    answerable: false,
  },
  {
    id: "hr-lunch-menu",
    question: "Thực đơn căng tin hôm nay có gì?",
    expectedPolicyIds: [],
    answerable: false,
  },
  {
    id: "hr-personal-loan",
    question: "Tôi có thể vay tiền công ty không?",
    expectedPolicyIds: [],
    answerable: false,
  },
];

/**
 * Helper: create a mock RetrievedChunk for testing.
 */
export const makeMockChunk = (
  policyId: string,
  content: string,
  score: number = 0.5,
): {
  readonly policyId: string;
  readonly content: string;
  readonly score: number;
} => ({
  policyId,
  content,
  score,
});

/**
 * Expected quality thresholds for the RAG system.
 * Tests will assert that metrics meet these minimums.
 */
export const qualityThresholds = {
  /** At least 70% of expected policies should be retrieved */
  minRecallAtK: 0.7,
  /**
   * Precision@K: with topK=6 and typical single-hop questions (1 expected policy),
   * max precision = 1/6 ≈ 0.167. Threshold set to 0.15 to reflect realistic ceiling.
   */
  minPrecisionAtK: 0.15,
  /** MRR should be at least 0.5 (relevant items appear in top positions) */
  minMrr: 0.5,
  /** NDCG should be at least 0.5 */
  minNdcg: 0.5,
  /** At least 75% of questions should have at least one hit */
  minHitRate: 0.75,
  /** At least 50% of answer claims should be grounded in chunks */
  minFaithfulness: 0.5,
  /** At least 30% of question entities should appear in answer */
  minAnswerRelevance: 0.3,
  /** At least 80% of unanswerable questions should be correctly refused */
  minRefusalAccuracy: 0.8,
} as const;
