import type { Policy, ChunkRecord } from "./types.js";

// Core system configuration constants
const MAX_CHUNK_SIZE = 800; // Strict upper limit of characters per chunk to optimize Embedding Model processing
const OVERLAP_SENTENCES = 1; // Number of adjacent sentences shared between chunks to preserve semantic continuity

interface HierarchicalSection {
  readonly headings: readonly string[]; // Breadcrumb path of hierarchical headings (from parent to child)
  readonly content: string; // Raw text content associated with this section
}

/**
 * STEP 1: DOCUMENT STRUCTURE-BASED PARSING
 *
 * PURPOSE: Splits the document into independent sections based on Markdown headings (H1 to H6).
 * It preserves the full heading path (breadcrumb) to maintain hierarchical context for each block.
 *
 * WHY IS IT NEEDED: Without parent headings, if the LLM retrieves a chunk from "Section a, Clause b",
 * it loses the vital context of "Article 1, Chapter I".
 *
 * EXAMPLE:
 *  - Input:
 *    # 1. Policies
 *    General introduction text...
 *    ## 1.1 Benefits
 *    Employee benefit details...
 *
 *  - Output:
 *    [
 *      {
 *        headings: ["# 1. Policies"],
 *        content: "General introduction text..."
 *      },
 *      {
 *        headings: ["# 1. Policies", "## 1.1 Benefits"],
 *        content: "Employee benefit details..."
 *      }
 *    ]
 */
const parseHierarchicalSections = (
  content: string,
): readonly HierarchicalSection[] => {
  // 1. TEXT SANITIZATION & NORMALIZATION:
  // - Convert Windows-style newlines (\r\n) to Unix-standard (\n) for consistent processing.
  // - Collapse multiple consecutive empty lines (3 or more) down to a single empty line (\n\n).
  const normalizedContent = content
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const lines = normalizedContent.split("\n");
  const sections: HierarchicalSection[] = [];
  const currentHeadings: string[] = []; // State machine to keep track of the active heading hierarchy path
  let currentContent: string[] = [];

  // Regex to detect Markdown headings from H1 to H6 (e.g., "## Article 1. Benefits")
  const headingRegex = /^(#{1,6})\s+(.+)$/;

  // Helper function to package the previous section before transitioning to a new one
  const saveCurrentSection = () => {
    if (currentContent.length > 0) {
      // Filter out any undefined or empty heading slots before saving
      const headingsPath = currentHeadings.filter(
        (h) => h !== undefined && h !== "",
      );
      sections.push({
        headings: headingsPath,
        content: currentContent.join("\n").trim(),
      });
      currentContent = []; // Reset content buffer for the next section
    }
  };

  // LINE-BY-LINE LINEAR SCAN (O(N) Complexity):
  for (const line of lines) {
    const match = headingRegex.exec(line);
    if (match) {
      saveCurrentSection(); // Heading detected -> package and save the previous section first

      const level = match[1].length; // Heading depth based on the number of '#' characters (1-6)
      const title = match[2].trim();

      // UPDATE HEADING TREE CONTEXT:
      // Assign the new heading to its corresponding level
      currentHeadings[level - 1] = `${match[1]} ${title}`;

      // CRITICAL DESIGN TRICK: Truncate the currentHeadings array length to match the current "level".
      // This automatically discards sibling or child headings from previous sections,
      // preventing parent heading "leakage" or context contamination across unrelated chunks.
      currentHeadings.length = level;
    } else {
      currentContent.push(line); // Accumulate normal body lines into the active content buffer
    }
  }

  // Package and save the final section of the document after completing the loop
  saveCurrentSection();
  return sections;
};

/**
 * STEP 2: RECURSIVE CHARACTER SPLITTER
 *
 * PURPOSE: Intelligently divides text by trying to split on separators in descending order
 * of structural significance (Paragraphs -> Single Newlines -> Sentences -> Words).
 *
 * WHY IS IT NEEDED: This is the industry-standard "golden rule" of chunking (similar to
 * LangChain's RecursiveCharacterTextSplitter). It ensures text breaks happen at natural boundaries,
 * avoiding abrupt middle-of-sentence splits that degrade vector semantic quality.
 *
 * EXAMPLE:
 *  - Input:
 *    text: "This is paragraph one.\n\nThis is paragraph two. It contains two sentences."
 *    maxLen: 35
 *
 *  - Output:
 *    [
 *      "This is paragraph one.",
 *      "This is paragraph two.",
 *      "It contains two sentences."
 *    ]
 */
const recursiveSplit = (text: string, maxLen: number): readonly string[] => {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return [trimmed]; // Avoid unnecessary recursion if chunk is already small enough

  // Define separator configurations in descending order of structural priority
  const separators = [
    { delimiter: "\n\n", joiner: "\n\n" }, // Priority 1: Paragraphs (keeps logical ideas together)
    { delimiter: "\n", joiner: "\n" }, // Priority 2: Single lines
    { delimiter: /(?<=[.!?;])\s+/, joiner: " " }, // Priority 3: Sentences (Vietnamese & English boundary safe)
    { delimiter: " ", joiner: " " }, // Priority 4: Words (prevents splitting Vietnamese syllables/words)
  ];

  // Try each separator sequentially
  for (const sep of separators) {
    const parts = trimmed.split(sep.delimiter);
    if (parts.length > 1) {
      // If splitting is successful, merge individual parts back together safely
      return mergeParts(parts, sep.joiner, maxLen);
    }
  }

  // FALLBACK STRATEGY:
  // Hard split by characters (slice) only when dealing with continuous strings containing no spaces.
  const chunks: string[] = [];
  let remaining = trimmed;
  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, maxLen));
    remaining = remaining.slice(maxLen);
  }
  return chunks;
};

/**
 * HELPER FUNCTION: MERGE PARTS
 *
 * PURPOSE: Greedily aggregates small text fragments (parts) together without exceeding maxLen.
 * If a single fragment already exceeds maxLen, it recursively splits it first before merging.
 *
 * WHY IS IT NEEDED: Splitting by paragraph/sentence yields fragments of varying sizes (often short).
 * This function packs consecutive sentences tightly into a single chunk up to maxLen to minimize
 * chunk fragmentation and optimize the LLM's context window.
 *
 * EXAMPLE:
 *  - Input:
 *    parts: ["Hello world.", "This is a test.", "Keep it short."],
 *    separator: " ",
 *    maxLen: 30
 *
 *  - Output:
 *    [
 *      "Hello world. This is a test.",
 *      "Keep it short."
 *    ]
 */
const mergeParts = (
  parts: readonly string[],
  separator: string,
  maxLen: number,
): readonly string[] => {
  const results: string[] = [];
  let buffer = "";

  for (const part of parts) {
    const trimmedPart = part.trim();
    if (trimmedPart.length === 0) continue; // Ignore empty fragments to prevent empty chunk generation

    // PRE-SPLIT VERIFICATION: If an individual fragment is larger than maxLen,
    // we must recursively split it first before running the merging pipeline.
    const processedParts =
      trimmedPart.length > maxLen
        ? recursiveSplit(trimmedPart, maxLen)
        : [trimmedPart];

    for (const subPart of processedParts) {
      // Calculate the candidate length if this sub-part is merged into the active buffer
      const candidate =
        buffer.length > 0 ? `${buffer}${separator}${subPart}` : subPart;

      if (candidate.length <= maxLen) {
        buffer = candidate; // Fits within limit -> merge into the buffer
      } else {
        if (buffer.length > 0) {
          // Exceeds limit -> commit the active buffer to results.
          // PERFORMANCE OPTIMIZATION: Since the buffer is mathematically guaranteed to be <= maxLen,
          // we push it directly without redundant recursive checks, saving substantial CPU cycles.
          results.push(buffer);
        }
        buffer = subPart; // Initialize a new buffer starting with the rejected fragment
      }
    }
  }

  // Commit any remaining text left in the buffer after completing the loop
  if (buffer.length > 0) {
    results.push(buffer);
  }

  return results;
};

/**
 * OVERLAP TEXT EXTRACTION
 *
 * PURPOSE: Extracts the last N sentences of the previous chunk to act as an overlapping prefix for the next chunk.
 *
 * WHY IS IT NEEDED: Solves "The Boundary Problem". It provides context linking across chunk cuts,
 * allowing the Embedding Model to capture relations between ideas split across sequential blocks.
 *
 * EXAMPLE:
 *  - Input:
 *    text: "First sentence. Second sentence. Third sentence!",
 *    numSentences: 2
 *
 *  - Output:
 *    "Second sentence. Third sentence!"
 */
const getOverlapText = (text: string, numSentences: number): string => {
  if (numSentences <= 0) return "";

  // FIXED: Corrected regex syntax from /(?<=\[.!?;\])\\s+/ to /(?<=[.!?;])\s+/
  const sentences = text
    .split(/(?<=[.!?;])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0); // Exclude empty strings

  // Extract the last N sentences and join them with a single space
  return sentences.slice(-numSentences).join(" ");
};

const padChunkNumber = (chunkIndex: number): string =>
  String(chunkIndex + 1).padStart(3, "0");

/**
 * MAIN FUNCTION: POLICY DOCUMENT CHUNKER (ORCHESTRATOR)
 *
 * PURPOSE: High-level entry point that processes raw policy documents into structured Chunk Records.
 * Combines Document Structure-based parsing and Recursive Character Splitting with overlaps.
 *
 * EXAMPLE:
 *  - Input policies:
 *    [
 *      {
 *        id: "POL_01",
 *        title: "Employee Leave Policy",
 *        content: "# 1. Leave\nEmployees get 15 days off.",
 *        version: "v1.0",
 *        status: "active"
 *      }
 *    ]
 *
 *  - Output Chunk Records:
 *    [
 *      {
 *        id: "POL_01#chunk-001",
 *        policyId: "POL_01",
 *        title: "Employee Leave Policy",
 *        version: "v1.0",
 *        status: "active",
 *        content: "# 1. Leave\nEmployees get 15 days off."
 *      }
 *    ]
 */
export const createPolicyChunks = (
  policies: readonly Policy[],
): readonly ChunkRecord[] =>
  policies.flatMap((policy) => {
    // Step 1: Parse the document into hierarchical sections
    const sections = parseHierarchicalSections(policy.content);
    const policyChunks: string[] = [];

    for (const section of sections) {
      // Join array of headings into a single multi-line context string (e.g., "# Chapter I\n## Article 1")
      let headingContext = section.headings.join("\n");

      // DYNAMIC BUDGET ALLOCATION:
      // Allocate chunk characters for the overlapping text (averages 120 characters for 1 sentence)
      const overlapBudget = OVERLAP_SENTENCES > 0 ? 120 : 0;

      // Dynamically calculate the maximum length left for the raw content.
      // This guarantees that after assembling (Heading + Overlap + Content + Newlines),
      // the total chunk size NEVER exceeds MAX_CHUNK_SIZE (damped by an 8-character buffer).
      let effectiveMaxLen =
        MAX_CHUNK_SIZE - headingContext.length - overlapBudget - 8;

      // FALLBACK PRECAUTION: If heading hierarchy is extremely long, effectiveMaxLen becomes too small,
      // causing the core content to get fragmented into micro-chunks.
      // Solution: Fall back to using only the deepest heading, leaving at least 200 characters for content.
      if (effectiveMaxLen < 200 && section.headings.length > 0) {
        headingContext = section.headings[section.headings.length - 1];
        effectiveMaxLen =
          MAX_CHUNK_SIZE - headingContext.length - overlapBudget - 8;
      }

      // Enforce a hard floor of 100 characters to prevent micro-chunks
      effectiveMaxLen = Math.max(effectiveMaxLen, 100);

      // Step 2: Recursively split the section's body content
      const rawContentChunks = recursiveSplit(section.content, effectiveMaxLen);

      rawContentChunks.forEach((chunkContent, index) => {
        // SAFE OVERLAP EXTRACTION:
        // Extract overlap strictly from the raw content of the previous chunk (rawContentChunks[index - 1]).
        // This ensures heading markers (# Headings) of the previous chunk never leak into the overlap of the next chunk.
        const overlap =
          index > 0
            ? getOverlapText(rawContentChunks[index - 1], OVERLAP_SENTENCES)
            : "";

        let finalContent = chunkContent.trim();

        // Prepend overlap to the start of the chunk content
        if (overlap.length > 0) {
          finalContent = `${overlap}\n\n${finalContent}`;
        }

        // Prepend heading context breadcrumb to the top of the chunk content
        if (headingContext.length > 0) {
          finalContent = `${headingContext}\n${finalContent}`;
        }

        policyChunks.push(finalContent.trim());
      });
    }

    // Step 3: Package final chunks into database-ready structures (Chunk Records)
    return policyChunks
      .filter((content) => content.length > 0)
      .map((content, index) => ({
        id: `${policy.id}#chunk-${padChunkNumber(index)}`, // Sequential ID unique per policy (e.g., "POLICY_A#chunk-001")
        policyId: policy.id,
        title: policy.title,
        version: policy.version,
        status: policy.status,
        content: content, // Complete assembled chunk within strict size limits
      }));
  });
