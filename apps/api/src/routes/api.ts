import { Router } from "express";
import { authMiddleware, requireAdmin } from "../lib/auth.js";

// Import các Controller mới tách
import { login, getMe } from "../controllers/authController.js";
import {
  getQuestions,
  getModels,
  getPoliciesList,
  createNewPolicy,
  getPolicyById,
  updatePolicyById,
  deletePolicyById,
  patchPolicyStatus,
  patchPolicyPrivacy,
  reindexAllPolicies,
  reseedPolicies,
} from "../controllers/policyController.js";
import {
  askStandard,
  askStream,
  askAgent,
} from "../controllers/askController.js";
import {
  getConversationsList,
  createNewConversation,
  getMessagesByConversationId,
  getStatusByConversationId,
  updateConversationTitle,
  deleteConversationById,
  askConversationAgent,
  askConversationStandard,
} from "../controllers/chatController.js";

export const apiRouter = Router();

// --- Health ---
apiRouter.get("/health", (_request, response) => {
  response.json({ ok: true, service: "hr-rag-api" });
});

// --- Models & Questions ---
apiRouter.get("/models", authMiddleware, getModels);
apiRouter.get("/questions", getQuestions);

// --- Auth Endpoints ---
apiRouter.post("/auth/login", login);
apiRouter.get("/auth/me", authMiddleware, getMe);

// --- Policies Management ---
apiRouter.get("/policies", authMiddleware, getPoliciesList);
apiRouter.post("/policies", authMiddleware, requireAdmin, createNewPolicy);
apiRouter.get("/policies/:id", authMiddleware, getPolicyById);
apiRouter.put("/policies/:id", authMiddleware, requireAdmin, updatePolicyById);
apiRouter.delete(
  "/policies/:id",
  authMiddleware,
  requireAdmin,
  deletePolicyById,
);
apiRouter.patch(
  "/policies/:id/status",
  authMiddleware,
  requireAdmin,
  patchPolicyStatus,
);
apiRouter.patch(
  "/policies/:id/privacy",
  authMiddleware,
  requireAdmin,
  patchPolicyPrivacy,
);

// --- Indexing ---
apiRouter.post("/reindex", authMiddleware, requireAdmin, reindexAllPolicies);
apiRouter.post("/reseed", authMiddleware, requireAdmin, reseedPolicies);

// --- Standalone RAG Asks ---
apiRouter.post("/ask", authMiddleware, askStandard);
apiRouter.post("/ask/stream", authMiddleware, askStream);
apiRouter.post("/ask/agent", authMiddleware, askAgent);

// --- Conversation Management ---
apiRouter.get("/conversations", authMiddleware, getConversationsList);
apiRouter.post("/conversations", authMiddleware, createNewConversation);
apiRouter.get(
  "/conversations/:id/messages",
  authMiddleware,
  getMessagesByConversationId,
);
apiRouter.get(
  "/conversations/:id/status",
  authMiddleware,
  getStatusByConversationId,
);
apiRouter.patch("/conversations/:id", authMiddleware, updateConversationTitle);
apiRouter.delete("/conversations/:id", authMiddleware, deleteConversationById);

// --- Conversation RAG Chat ---
apiRouter.post(
  "/conversations/:id/ask/agent",
  authMiddleware,
  askConversationAgent,
);
apiRouter.post(
  "/conversations/:id/ask",
  authMiddleware,
  askConversationStandard,
);
