import type { Policy, ChunkRecord } from './types.js';

// Vietnamese uses more characters per semantic unit than English.
// 800 chars ≈ 2-3 Vietnamese paragraphs, keeps chunks readable without over-splitting.
const maxChunkSize = 800;
const overlapSentences: number = 1;

const headingPattern = /^(#{1,3})\s+(.+)$/;

interface Section {
  readonly heading: string;
  readonly lines: readonly string[];
}

const splitIntoSections = (content: string): readonly Section[] => {
  const lines = content.split('\n');
  const sections: Section[] = [];
  let currentHeading = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    const match = headingPattern.exec(line);
    if (match) {
      if (currentLines.length > 0) {
        sections.push({ heading: currentHeading, lines: currentLines });
      }
      currentHeading = match[2].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentLines.length > 0) {
    sections.push({ heading: currentHeading, lines: currentLines });
  }
  return sections;
};

const splitIntoParagraphs = (lines: readonly string[]): readonly string[] => {
  const paragraphs: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.trim().length === 0) {
      if (current.length > 0) {
        paragraphs.push(current.join('\n').trim());
        current = [];
      }
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) {
    paragraphs.push(current.join('\n').trim());
  }
  return paragraphs.filter((paragraph) => paragraph.length > 0);
};

const splitLongParagraph = (paragraph: string): readonly string[] => {
  if (paragraph.length <= maxChunkSize) return [paragraph];

  // Split by sentences: Vietnamese and English sentence boundaries.
  // Vietnamese doesn't capitalize sentence starts, so we split on any
  // whitespace after sentence-ending punctuation (not just before uppercase).
  const sentences = paragraph.split(/(?<=[.!?;])\s+/);
  if (sentences.length <= 1) {
    // No sentence breaks found — hard split at maxChunkSize
    const chunks: string[] = [];
    let remaining = paragraph;
    while (remaining.length > 0) {
      chunks.push(remaining.slice(0, maxChunkSize));
      remaining = remaining.slice(maxChunkSize);
    }
    return chunks;
  }

  // Merge sentences into chunks respecting maxChunkSize
  const result: string[] = [];
  let buffer = '';
  for (const sentence of sentences) {
    const candidate = buffer.length > 0 ? `${buffer} ${sentence}` : sentence;
    if (candidate.length <= maxChunkSize) {
      buffer = candidate;
    } else {
      if (buffer.length > 0) result.push(buffer);
      buffer = sentence.length > maxChunkSize ? sentence.slice(0, maxChunkSize) : sentence;
    }
  }
  if (buffer.length > 0) result.push(buffer);
  return result;
};

const mergeParagraphsIntoChunks = (paragraphs: readonly string[], heading: string): readonly string[] => {
  // First split any long paragraphs into sentence-level pieces
  const expandedParagraphs = paragraphs.flatMap(splitLongParagraph);

  const chunks: string[] = [];
  let buffer = '';

  for (const paragraph of expandedParagraphs) {
    const candidate = buffer.length > 0 ? `${buffer}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxChunkSize) {
      buffer = candidate;
    } else {
      if (buffer.length > 0) chunks.push(buffer);
      buffer = paragraph;
    }
  }
  if (buffer.length > 0) chunks.push(buffer);

  return chunks.map((chunk) => heading.length > 0 ? `${heading}\n${chunk}` : chunk);
};

const addOverlap = (chunks: readonly string[]): readonly string[] => {
  if (overlapSentences === 0 || chunks.length <= 1) return chunks;

  return chunks.map((chunk, index) => {
    if (index === 0) return chunk;
    const previousChunk = chunks[index - 1];
    const sentences = previousChunk.split(/(?<=[.!?])\s+/);
    const overlapText = sentences.slice(-overlapSentences).join(' ');
    return overlapText.length > 0 ? `${overlapText}\n\n${chunk}` : chunk;
  });
};

const padChunkNumber = (chunkIndex: number): string => String(chunkIndex + 1).padStart(3, '0');

export const createPolicyChunks = (policies: readonly Policy[]): readonly ChunkRecord[] =>
  policies.flatMap((policy) => {
    const sections = splitIntoSections(policy.content);
    const rawChunks = sections.flatMap((section) => {
      const paragraphs = splitIntoParagraphs(section.lines);
      return mergeParagraphsIntoChunks(paragraphs, section.heading);
    });
    const chunks = addOverlap(rawChunks);

    return chunks
      .filter((content) => content.trim().length > 0)
      .map((content, index) => ({
        id: `${policy.id}#chunk-${padChunkNumber(index)}`,
        policyId: policy.id,
        title: policy.title,
        version: policy.version,
        status: policy.status,
        content: content.trim(),
      }));
  });
