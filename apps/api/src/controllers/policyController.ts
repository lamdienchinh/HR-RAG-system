import { type Request, type Response } from "express";
import {
  type Locale,
  getPresetQuestions,
  getSeedPolicies,
} from "../lib/seedData.js";
import {
  createPolicy,
  deletePolicy,
  getPolicy,
  listPolicies,
  seedPolicies as seedPolicyRows,
  updatePolicy,
  updatePolicyStatus,
  togglePolicyPrivacy,
} from "../lib/policies.js";
import { reindexPolicies } from "../lib/reindex.js";
import {
  sendError,
  parseCreatePolicyBody,
  parseUpdatePolicyBody,
  CreatePolicyBody,
} from "../helpers/apiHelpers.js";

export const getQuestions = (request: Request, response: Response) => {
  const locale = (request.query.locale as Locale) || "vi";
  response.json({ questions: getPresetQuestions(locale) });
};

export const getModels = async (_request: Request, response: Response) => {
  try {
    const { config } = await import("../config.js");
    const apiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
        config.geminiApiKey ?? ""
      )}`
    );
    if (!apiResponse.ok) {
      response.json({ models: ["gemini-2.5-flash"] });
      return;
    }
    const payload = (await apiResponse.json()) as {
      models?: readonly {
        name: string;
        supportedGenerationMethods?: readonly string[];
      }[];
    };
    const models = (payload.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace("models/", ""))
      .filter(
        (m) =>
          m.startsWith("gemini-") &&
          !/(embedding|imagen|image|tts|robotics|live)/i.test(m)
      )
      .sort((a, b) => {
        const score = (m: string): number => {
          let s = 0;
          if (m.includes("flash")) s += 100;
          else if (m.includes("pro")) s += 50;
          const v = m.match(/gemini-(\d+(?:\.\d+)?)/);
          if (v) s += parseFloat(v[1]) * 10;
          if (m.includes("lite")) s -= 20;
          if (m.includes("preview")) s -= 5;
          return s;
        };
        return score(b) - score(a);
      });
    response.json({ models });
  } catch {
    response.json({ models: ["gemini-2.5-flash"] });
  }
};

export const getPoliciesList = async (request: Request, response: Response) => {
  const isAdmin = request.user?.role === "admin";
  response.json({ policies: await listPolicies(isAdmin) });
};

export const createNewPolicy = async (
  request: Request<Record<string, never>, unknown, CreatePolicyBody>,
  response: Response
) => {
  try {
    const policy = await createPolicy(parseCreatePolicyBody(request.body));
    response.status(201).json({ policy });
  } catch (error) {
    sendError(response, error);
  }
};

export const getPolicyById = async (request: Request, response: Response) => {
  const id = request.params.id as string;
  const policy = await getPolicy(id);
  if (!policy) {
    sendError(response, new Error(`Unknown policy id: ${id}`), 404);
    return;
  }
  if (policy.isPrivate && request.user?.role !== "admin") {
    sendError(response, new Error(`Unknown policy id: ${id}`), 404);
    return;
  }
  response.json({ policy });
};

export const updatePolicyById = async (
  request: Request,
  response: Response
) => {
  try {
    const body = parseUpdatePolicyBody(request.body);
    const id = request.params.id as string;
    const policy = await updatePolicy(id, body.content, body.note);
    response.json({ policy });
  } catch (error) {
    sendError(response, error);
  }
};

export const deletePolicyById = async (
  request: Request,
  response: Response
) => {
  try {
    await deletePolicy(request.params.id as string);
    response.status(204).end();
  } catch (error) {
    sendError(response, error, 404);
  }
};

export const patchPolicyStatus = async (
  request: Request,
  response: Response
) => {
  try {
    const status = (request.body as { status?: string })?.status;
    if (typeof status !== "string") {
      sendError(response, new Error("Missing required field: status"));
      return;
    }
    const policy = await updatePolicyStatus(
      request.params.id as string,
      status
    );
    response.json({ policy });
  } catch (error) {
    sendError(response, error);
  }
};

export const patchPolicyPrivacy = async (
  request: Request,
  response: Response
) => {
  try {
    const isPrivate = (request.body as { isPrivate?: unknown })?.isPrivate;
    if (typeof isPrivate !== "boolean") {
      sendError(response, new Error("isPrivate (boolean) is required"));
      return;
    }
    const policy = await togglePolicyPrivacy(
      request.params.id as string,
      isPrivate
    );
    response.json({ policy });
  } catch (error) {
    sendError(response, error);
  }
};

export const reindexAllPolicies = async (
  _request: Request,
  response: Response
) => {
  response.json(await reindexPolicies());
};

export const reseedPolicies = async (request: Request, response: Response) => {
  try {
    const locale =
      ((request.body as { locale?: string })?.locale as Locale) || "vi";
    await seedPolicyRows(getSeedPolicies(locale));
    const result = await reindexPolicies();
    response.json({ ...result, locale });
  } catch (error) {
    response
      .status(500)
      .json({ error: error instanceof Error ? error.message : String(error) });
  }
};
