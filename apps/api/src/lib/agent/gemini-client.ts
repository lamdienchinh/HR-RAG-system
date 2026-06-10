import {
  GoogleGenAI,
  Type,
  FunctionDeclaration,
  Part,
  GroundingChunk,
} from "@google/genai";
import { config } from "../../config.js";

// ========================================================
// 1. ĐỊNH NGHĨA SEARCH TOOL (HÀM THỰC THI & SCHEMA)
// ========================================================

interface SearchArgs {
  query: string;
}

const googleSearchFunction = async ({ query }: SearchArgs): Promise<string> => {
  return `Kết quả tìm kiếm thực tế cho: "${query}" tại thời điểm hiện tại...`;
};

const googleSearchToolDeclaration: FunctionDeclaration = {
  name: "googleSearch",
  description:
    "Tìm kiếm thông tin thời gian thực trên Internet khi dữ liệu hệ thống không có.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "Từ khóa cần tìm kiếm chính xác trên Google",
      },
    },
    required: ["query"],
  },
};

const functionsMap: Record<string, (args: any) => Promise<any>> = {
  googleSearch: googleSearchFunction,
};

// ========================================================
// 2. TYPES
// ========================================================

export interface ExternalSource {
  readonly uri: string;
  readonly title: string;
}

export interface AgentResult {
  readonly text: string;
  readonly model: string;
  readonly externalSources: readonly ExternalSource[];
}

// ========================================================
// 3. CANDIDATE MODELS
// ========================================================

const CANDIDATE_MODELS = [
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-3-flash-preview",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-3.1-flash-lite",
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite-001",
  "gemini-2.0-flash-lite",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-3.1-pro-preview",
  "gemini-3.1-pro-preview-customtools",
  "gemini-2.5-pro",
  "gemini-3-pro-preview",
  "gemini-pro-latest",
  "gemini-2.5-computer-use-preview-10-2025",
];

// ========================================================
// 4. HELPER: Trích xuất grounding sources từ response
// ========================================================

const extractExternalSources = (
  chunks: GroundingChunk[] | undefined,
): readonly ExternalSource[] => {
  if (!chunks || chunks.length === 0) return [];
  return chunks
    .map((chunk): ExternalSource | null => {
      const uri = chunk.web?.uri;
      if (!uri) return null;
      return { uri, title: chunk.web?.title ?? uri };
    })
    .filter((s): s is ExternalSource => s !== null);
};

// ========================================================
// 5. runGeminiPureAgent — dùng custom function calling tool
//    (cho query-analyzer, self-reflect: không cần grounding)
// ========================================================

export const runGeminiPureAgent = async (
  prompt: string,
  systemInstruction?: string,
  model?: string,
): Promise<AgentResult> => {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const configuredModel = model || config.geminiModel || "gemini-2.5-flash";
  const modelsToTry = [...new Set([configuredModel, ...CANDIDATE_MODELS])];
  const errors: string[] = [];

  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

  for (const modelName of modelsToTry) {
    try {
      const chat = ai.chats.create({
        model: modelName,
        config: {
          systemInstruction:
            systemInstruction || "You are a helpful assistant.",
          tools: [{ functionDeclarations: [googleSearchToolDeclaration] }],
        },
      });

      let response = await chat.sendMessage({ message: prompt });

      // AUTO-FUNCTION CALLING LOOP
      while (response.functionCalls && response.functionCalls.length > 0) {
        const toolResponseParts: Part[] = [];

        for (const call of response.functionCalls) {
          const { name, args, id } = call;
          if (!name) continue;

          const targetFunction = functionsMap[name];
          if (targetFunction) {
            const functionResult = await targetFunction(args);
            toolResponseParts.push({
              functionResponse: {
                name,
                response: { result: functionResult },
                id: id || "",
              },
            });
          }
        }

        if (toolResponseParts.length > 0) {
          response = await chat.sendMessage({ message: toolResponseParts });
        } else {
          break;
        }
      }

      return {
        text: response.text || "No response text generated.",
        model: modelName,
        externalSources: [],
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      console.warn(
        `[Agent Warning] Model ${modelName} thất bại: ${error}. Đang thử model tiếp theo...`,
      );
    }
  }

  throw new Error(
    `Tất cả các model Gemini đều thất bại. Lỗi cuối cùng: ${errors.at(-1)}`,
  );
};

// ========================================================
// 6. StreamChunk — yielded by streaming functions
// ========================================================

export interface StreamChunk {
  readonly text: string;
  readonly done: boolean;
  readonly model: string;
  readonly externalSources: readonly ExternalSource[];
}

// ========================================================
// 7. runGeminiWithGroundingStream — streaming version
//    Yields real tokens from Gemini as they arrive.
// ========================================================

export async function* runGeminiWithGroundingStream(
  prompt: string,
  systemInstruction?: string,
  useGoogleSearch: boolean = false,
  preferredModel?: string,
): AsyncGenerator<StreamChunk> {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const configuredModel =
    preferredModel || config.geminiModel || "gemini-2.5-flash";
  const modelsToTry = [...new Set([configuredModel, ...CANDIDATE_MODELS])];
  const errors: string[] = [];

  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

  for (const modelName of modelsToTry) {
    try {
      const tools = useGoogleSearch ? [{ googleSearch: {} }] : undefined;

      const stream = await ai.models.generateContentStream({
        model: modelName,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction:
            systemInstruction || "You are a helpful assistant.",
          ...(tools ? { tools } : {}),
        },
      });

      let hasText = false;
      let externalSources: readonly ExternalSource[] = [];

      for await (const chunk of stream) {
        const chunkText = chunk.text ?? "";
        if (chunkText) hasText = true;

        // Extract grounding metadata from any chunk that has it
        const groundingChunks =
          chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
          externalSources = extractExternalSources(groundingChunks);
        }

        if (chunkText) {
          yield { text: chunkText, done: false, model: modelName, externalSources: [] };
        }
      }

      if (!hasText) throw new Error("Empty response text");

      // Final chunk with metadata
      yield { text: "", done: true, model: modelName, externalSources };
      return;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      console.warn(
        `[Grounding Stream Warning] Model ${modelName} thất bại: ${error}. Đang thử model tiếp theo...`,
      );
    }
  }

  throw new Error(
    `Tất cả các model Gemini đều thất bại. Lỗi cuối cùng: ${errors.at(-1)}`,
  );
}

// ========================================================
// 8. runGeminiWithGrounding — dùng Google Search grounding
//    (cho answer.ts: cần externalSources từ grounding metadata)
// ========================================================

export const runGeminiWithGrounding = async (
  prompt: string,
  systemInstruction?: string,
  useGoogleSearch: boolean = false,
  preferredModel?: string,
): Promise<AgentResult> => {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const configuredModel =
    preferredModel || config.geminiModel || "gemini-2.5-flash";
  const modelsToTry = [...new Set([configuredModel, ...CANDIDATE_MODELS])];
  const errors: string[] = [];

  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

  for (const modelName of modelsToTry) {
    try {
      const tools = useGoogleSearch ? [{ googleSearch: {} }] : undefined;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction:
            systemInstruction || "You are a helpful assistant.",
          ...(tools ? { tools } : {}),
        },
      });

      const text = response.text ?? "";
      if (!text) throw new Error("Empty response text");

      // Trích xuất grounding sources từ candidate đầu tiên
      const groundingChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const externalSources = extractExternalSources(groundingChunks);

      return { text, model: modelName, externalSources };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      console.warn(
        `[Grounding Warning] Model ${modelName} thất bại: ${error}. Đang thử model tiếp theo...`,
      );
    }
  }

  throw new Error(
    `Tất cả các model Gemini đều thất bại. Lỗi cuối cùng: ${errors.at(-1)}`,
  );
};
