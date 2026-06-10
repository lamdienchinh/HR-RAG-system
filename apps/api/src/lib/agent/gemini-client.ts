import { GoogleGenAI, GroundingChunk } from "@google/genai";
import { config } from "../../config.js";

// ========================================================
// 1. TYPES
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
// 2. CANDIDATE MODELS
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
// 3. HELPER: Trích xuất grounding sources từ response
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
// 4. runGeminiPureAgent — simple chat, no tools/grounding
//    (cho query-analyzer: phân loại intent)
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
        },
      });

      const response = await chat.sendMessage({ message: prompt });

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
// 5. StreamChunk — yielded by streaming functions
// ========================================================

interface StreamChunk {
  readonly text: string;
  readonly done: boolean;
  readonly model: string;
  readonly externalSources: readonly ExternalSource[];
}

// ========================================================
// 6. runGeminiWithGroundingStream — streaming version
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
// 7. runGeminiWithGrounding — dùng Google Search grounding
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
