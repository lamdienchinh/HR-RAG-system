/**
 * Input Sanitization & Prompt Injection Detection
 *
 * Checks user input before it reaches the LLM prompt pipeline.
 * Two layers:
 *   1. Basic sanitization (length, control chars)
 *   2. Injection pattern detection (English + Vietnamese)
 */

const MAX_QUESTION_LENGTH = 2000;

// Injection patterns — detects attempts to override system instructions.
// Covers both English and Vietnamese attack vectors.
const INJECTION_PATTERNS: readonly RegExp[] = [
  // English injection attempts
  /ignore\s+(all\s+)?(?:previous|above|prior|earlier|system)\s+(?:instructions?|prompts?|rules?|directives?)/i,
  /(?:forget|disregard|override)\s+(?:all\s+)?(?:previous|above|your)\s+(?:instructions?|rules?|prompts?)/i,
  /you\s+are\s+now\s+(?:a|an|my)\s+(?!trợ lý|nhân viên|hr)/i,
  /(?:new|different|updated)\s+(?:instructions?|role|persona|system\s*prompt)/i,
  /(?:system|admin|root)\s*(?:prompt|override|command|instructions?)/i,
  /(?:reveal|show|display|print|output|expose|leak)\s+(?:your\s+)?(?:system\s+)?(?:prompt|instructions?|rules?)/i,
  /(?:act|behave|pretend|roleplay|imagine)\s+(?:as|like|you(?:'re| are)?)\s+(?:a|an)\s+(?!nhân\s*viên|trợ\s*lý|hr)/i,
  /(?:do\s+not|don'?t)\s+(?:follow|obey)\s+(?:the\s+)?(?:rules?|instructions?)/i,

  // Vietnamese injection attempts
  /bỏ\s+qua\s+(?:tất\s+cả\s+)?(?:hướng\s+dẫn|chỉ\s+dẫn|quy\s+tắc|lệnh)\s+(?:trước|ở\s+trên|ban\s+đầu)/i,
  /(?:quên|bỏ|loại\s+bỏ)\s+(?:tất\s+cả\s+)?(?:hướng\s+dẫn|chỉ\s+dẫn|quy\s+tắc)\s+(?:trước|ở\s+trên)/i,
  /(?:giờ\s+)?bạn\s+(?:là|đóng\s+vai|hóa\s+thân)\s+(?!trợ\s*lý|nhân\s*viên|hr)/i,
  /(?:tiết\s+lộ|hiển\s+thị|in\s+ra|xuất\s+ra)\s+(?:hướng\s+dẫn|prompt|system|chỉ\s+dẫn)/i,
  /(?:hack|exploit|bypass|jailbreak|attack|inject)/i,
  /(?:nhập\s+vai|đóng\s+vai)\s+(?:một\s+)?(?:ai\s+đó|người\s+khác|hacker|admin)/i,
];

export interface SanitizeResult {
  readonly safe: boolean;
  readonly cleaned: string;
  readonly reason: string | null;
}

/**
 * Sanitize user input and check for prompt injection attempts.
 *
 * Returns `safe: false` if injection is detected or input is invalid.
 * The `cleaned` field always contains a usable string (trimmed, control chars stripped).
 */
export const sanitizeInput = (input: string): SanitizeResult => {
  const trimmed = input.trim();

  // Empty input
  if (trimmed.length === 0) {
    return { safe: false, cleaned: '', reason: 'Empty input' };
  }

  // Length check
  if (trimmed.length > MAX_QUESTION_LENGTH) {
    return {
      safe: false,
      cleaned: trimmed.slice(0, MAX_QUESTION_LENGTH),
      reason: `Input too long (${trimmed.length} chars, max ${MAX_QUESTION_LENGTH})`,
    };
  }

  // Injection pattern check
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        cleaned: trimmed,
        reason: `Potential prompt injection detected: ${pattern.source.slice(0, 80)}`,
      };
    }
  }

  // Strip control characters (keep Vietnamese diacritics, newlines, tabs)
  const cleaned = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  return { safe: true, cleaned, reason: null };
};
