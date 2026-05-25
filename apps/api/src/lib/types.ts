export interface Policy {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly version: string;
  readonly status: string;
  readonly sensitivity: string;
  readonly isPrivate: boolean;
  readonly updatedAt: string;
  readonly content: string;
}

export interface SeedPolicy {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly version: string;
  readonly status: string;
  readonly sensitivity: string;
  readonly isPrivate?: boolean;
  readonly content: string;
}

export interface QuestionSpec {
  readonly id: string;
  readonly question: string;
  readonly expectedPolicyIds: readonly string[];
  readonly answerable: boolean;
}

export interface ChunkRecord {
  readonly id: string;
  readonly policyId: string;
  readonly title: string;
  readonly version: string;
  readonly status: string;
  readonly content: string;
}

export interface RetrievedChunk extends ChunkRecord {
  readonly distance: number;
  readonly score: number;
  readonly isPrivate?: boolean;
}

export interface ExternalSource {
  readonly title: string;
  readonly uri: string;
}

export interface AskResult {
  readonly question: string;
  readonly answer: string;
  readonly mode: 'gemini';
  readonly model: string;
  readonly warning: string | null;
  readonly citations: readonly RetrievedChunk[];
  readonly retrievedChunks: readonly RetrievedChunk[];
  readonly externalSources: readonly ExternalSource[];
  readonly notFound: boolean;
}
