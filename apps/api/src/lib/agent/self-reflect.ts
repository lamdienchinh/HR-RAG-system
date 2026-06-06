import { runGeminiPureAgent } from "./gemini-client.js";
import type { RetrievedChunk } from "../types.js";

// --- Types ---

export interface ReflectionResult {
  readonly isAdequate: boolean;
  readonly qualityScore: number; // 1-5
  readonly issues: readonly string[];
  readonly suggestedRefinement: string | null;
  readonly reasoning: string;
}

// --- Prompt ---

const REFLECTION_PROMPT = `You are a quality assessor for HR policy answers. Evaluate whether the answer adequately addresses the user's question.

Return a JSON object with:
- isAdequate: boolean — true if the answer is good enough to return to the user
- qualityScore: number 1-5 (1=terrible, 3=acceptable, 5=excellent)
- issues: array of issue codes from: "missing_entity", "no_citation", "vague", "contradiction", "incomplete", "irrelevant", "hallucination"
- suggestedRefinement: if isAdequate is false, provide a refined search query that might find better evidence. null if adequate.
- reasoning: brief explanation

Scoring guide:
- 5: Answer directly addresses all parts of the question with specific numbers/dates/names and cites sources
- 4: Answer addresses the question well with sources, minor gaps acceptable
- 3: Answer partially addresses the question, has sources but may miss some aspects
- 2: Answer is vague, missing key entities, or lacks citations
- 1: Answer does not address the question or contradicts the question's premise

IMPORTANT: Return ONLY the JSON object, no markdown, no code blocks.

Examples:

Q: "Nghỉ phép năm bao nhiêu ngày?"
A: "Theo Chính sách nghỉ phép (v2026.1): Nhân viên được hưởng 12 ngày phép năm."
→ {"isAdequate":true,"qualityScore":5,"issues":[],"suggestedRefinement":null,"reasoning":"Direct answer with specific number and source"}

Q: "So sánh nghỉ phép và bảo hiểm y tế"
A: "Theo Chính sách nghỉ phép (v2026.1): Nhân viên được hưởng 12 ngày phép năm."
→ {"isAdequate":false,"qualityScore":2,"issues":["incomplete","missing_entity"],"suggestedRefinement":"Chính sách bảo hiểm y tế nhân viên","reasoning":"Only covers leave, missing insurance comparison entirely"}`;

const parseReflectionFromText = (text: string): ReflectionResult | null => {
  const trimmed = text.trim();

  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonCandidate = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;

  const jsonMatch = jsonCandidate.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    const isAdequate =
      typeof parsed.isAdequate === "boolean" ? parsed.isAdequate : true;
    const qualityScore =
      typeof parsed.qualityScore === "number"
        ? Math.min(Math.max(parsed.qualityScore, 1), 5)
        : 3;
    const issues = Array.isArray(parsed.issues)
      ? (parsed.issues as unknown[]).filter(
          (i): i is string => typeof i === "string",
        )
      : [];
    const suggestedRefinement =
      typeof parsed.suggestedRefinement === "string" &&
      parsed.suggestedRefinement.length > 0
        ? parsed.suggestedRefinement
        : null;
    const reasoning =
      typeof parsed.reasoning === "string" ? parsed.reasoning : "";

    return { isAdequate, qualityScore, issues, suggestedRefinement, reasoning };
  } catch {
    return null;
  }
};

/**
 * Fast pattern-based reflection (no LLM call) for obvious cases.
 */
const tryQuickReflection = (
  question: string,
  answer: string,
  chunks: readonly RetrievedChunk[],
): ReflectionResult | null => {
  // No chunks retrieved at all
  if (chunks.length === 0) {
    return {
      isAdequate: false,
      qualityScore: 1,
      issues: ["no_citation", "missing_entity"],
      suggestedRefinement: question,
      reasoning: "No policy evidence found",
    };
  }

  // Answer contains refusal patterns
  if (
    /xin lỗi|không tìm thấy|không có đủ|cannot answer|not enough|insufficient/i.test(
      answer,
    )
  ) {
    return {
      isAdequate: false,
      qualityScore: 1,
      issues: ["irrelevant"],
      suggestedRefinement: question,
      reasoning: "Answer explicitly states it cannot answer",
    };
  }

  // Very short answer for a complex question
  if (answer.length < 50 && question.length > 20) {
    return {
      isAdequate: false,
      qualityScore: 2,
      issues: ["vague", "incomplete"],
      suggestedRefinement: question,
      reasoning: "Answer is too short for the question complexity",
    };
  }

  return null; // Let LLM handle nuanced evaluation
};

/**
 * Evaluate answer quality using self-reflection.
 * Returns a ReflectionResult indicating whether the answer is adequate
 * and a suggested refinement query if it's not.
 */
export const selfReflect = async (
  question: string,
  answer: string,
  chunks: readonly RetrievedChunk[],
): Promise<ReflectionResult> => {
  // Fast path for obvious cases
  const quickResult = tryQuickReflection(question, answer, chunks);
  if (quickResult) return quickResult;

  // LLM-based reflection
  try {
    const prompt = `Question: "${question}"

Answer: "${answer}"

Available evidence (policy chunks): ${chunks.length} chunks from policies: ${[...new Set(chunks.map((c) => c.title))].join(", ")}

Evaluate this answer quality.`;

    const result = await runGeminiPureAgent(
      prompt,
      REFLECTION_PROMPT,
      "gemini-2.5-flash-lite",
    );

    if (result.text) {
      const reflection = parseReflectionFromText(result.text);
      if (reflection) return reflection;
    }
  } catch {
    // Fall through to default
  }

  // Conservative fallback
  const hasRefusal = /xin lỗi|không tìm thấy|không có đủ/i.test(answer);
  const tooShort = answer.length < 80 && question.length > 15;
  if (hasRefusal || tooShort) {
    return {
      isAdequate: false,
      qualityScore: 2,
      issues: hasRefusal ? ["irrelevant"] : ["vague", "incomplete"],
      suggestedRefinement: question,
      reasoning:
        "Reflection LLM unavailable; answer appears insufficient based on heuristics",
    };
  }
  return {
    isAdequate: true,
    qualityScore: 3,
    issues: [],
    suggestedRefinement: null,
    reasoning:
      "Reflection LLM unavailable, defaulting to adequate (no obvious issues detected)",
  };
};
