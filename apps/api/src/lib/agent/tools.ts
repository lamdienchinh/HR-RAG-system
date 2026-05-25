import { retrieveChunks } from "../reindex.js";
import { listPolicies, getPolicy } from "../policies.js";
import type { RetrievedChunk, Policy } from "../types.js";

// --- ToolDefinition (defined locally — no longer exported from gemini-client) ---

export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: {
    readonly type: string;
    readonly properties: Record<
      string,
      { readonly type: string; readonly description?: string }
    >;
    readonly required?: readonly string[];
  };
}

// --- Tool definitions for Gemini function calling ---

export const RETRIEVE_CHUNKS_TOOL: ToolDefinition = {
  name: "retrieve_chunks",
  description:
    "Search HR policy database using hybrid retrieval (vector + BM25 + reranking). Returns the most relevant policy chunks for a query. Use this for any question about company HR policies.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query to find relevant policy content",
      },
      topK: {
        type: "number",
        description: "Number of results to return (default 6, max 12)",
      },
    },
    required: ["query"],
  },
};

export const LIST_POLICIES_TOOL: ToolDefinition = {
  name: "list_policies",
  description:
    "List all HR policies in the database. Use this to see what policies are available before searching, or when the user asks what policies exist.",
  parameters: {
    type: "object",
    properties: {},
  },
};

export const GET_POLICY_DETAIL_TOOL: ToolDefinition = {
  name: "get_policy_detail",
  description:
    "Get the full content of a specific HR policy by ID. Use this when you need details from a specific policy.",
  parameters: {
    type: "object",
    properties: {
      policyId: { type: "string", description: "The policy ID to retrieve" },
    },
    required: ["policyId"],
  },
};

export const ALL_AGENT_TOOLS: readonly ToolDefinition[] = [
  RETRIEVE_CHUNKS_TOOL,
  LIST_POLICIES_TOOL,
  GET_POLICY_DETAIL_TOOL,
];

// --- Tool executors ---

export interface ToolExecutorResult {
  readonly toolName: string;
  readonly result: Record<string, unknown>;
}

const executeRetrieveChunks = async (
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const query = typeof args.query === "string" ? args.query : "";
  const topK =
    typeof args.topK === "number" ? Math.min(Math.max(args.topK, 1), 12) : 6;

  if (!query) return { error: "query is required", chunks: [] };

  const { chunks } = await retrieveChunks(query, topK);
  return {
    chunks: chunks.map((c) => ({
      id: c.id,
      policyId: c.policyId,
      title: c.title,
      version: c.version,
      status: c.status,
      content: c.content.slice(0, 500),
      score: Math.round(c.score * 1000) / 1000,
    })),
    count: chunks.length,
  };
};

const executeListPolicies = async (): Promise<Record<string, unknown>> => {
  const policies = await listPolicies();
  return {
    policies: policies.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      version: p.version,
      status: p.status,
    })),
    count: policies.length,
  };
};

const executeGetPolicyDetail = async (
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const policyId = typeof args.policyId === "string" ? args.policyId : "";
  if (!policyId) return { error: "policyId is required" };

  const policy = await getPolicy(policyId);
  if (!policy) return { error: `Policy not found: ${policyId}` };

  return {
    id: policy.id,
    title: policy.title,
    category: policy.category,
    version: policy.version,
    status: policy.status,
    content: policy.content,
  };
};

/**
 * Execute a tool call from the agent. Routes to the appropriate handler.
 */
export const executeTool = async (
  name: string,
  args: Record<string, unknown>,
): Promise<ToolExecutorResult> => {
  let result: Record<string, unknown>;

  switch (name) {
    case "retrieve_chunks":
      result = await executeRetrieveChunks(args);
      break;
    case "list_policies":
      result = await executeListPolicies();
      break;
    case "get_policy_detail":
      result = await executeGetPolicyDetail(args);
      break;
    default:
      result = { error: `Unknown tool: ${name}` };
  }

  return { toolName: name, result };
};

// Re-export types for convenience
export type { RetrievedChunk, Policy };
