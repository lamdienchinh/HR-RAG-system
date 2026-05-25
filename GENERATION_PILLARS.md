# 3 Trụ Cột Generation — Trace Map

> File này liệt kê **tất cả** vị trí code cụ thể (file:dòng → hàm) cho 3 trụ cột generation trong hệ thống HR Policy RAG.
> Dùng để trace nhanh khi cần review, debug, hoặc demo.

---

## Trụ 1: Prompt Augmentation

**Mục tiêu**: Kết hợp Query + Clean Context thành structured template với anti-hallucination rules.

### 1.1. Gemini Prompt (Generative Mode)

| # | File | Dòng | Hàm | Vai trò |
|---|------|------|-----|---------|
| 1 | `apps/api/src/lib/answer.ts` | 696-717 | `composeGeminiPrompt()` | **Entry point** — ghép query + evidence chunks + conversation history thành prompt hoàn chỉnh |
| 2 | `apps/api/src/lib/answer.ts` | 700 | inline string | Role definition: "Bạn là trợ lý chính sách nhân sự (HR Policy Assistant)" |
| 3 | `apps/api/src/lib/answer.ts` | 703 | Rule #1 | Citation format: "Trích dẫn nguồn dạng [S1], [S2] sau mỗi fact" |
| 4 | `apps/api/src/lib/answer.ts` | 704 | Rule #2 | Data preservation: "Giữ nguyên con số, ngày, tên cụ thể — KHÔNG paraphrase" |
| 5 | `apps/api/src/lib/answer.ts` | 705 | Rule #3 | Structured format: "Quy định chính → điều kiện → ngoại lệ" |
| 6 | `apps/api/src/lib/answer.ts` | 706 | Rule #4 | **Anti-hallucination**: "Nếu bằng chứng KHÔNG liên quan → từ chối. KHÔNG bịa đặt" |
| 7 | `apps/api/src/lib/answer.ts` | 707 | Rule #5 | Language: "Trả lời bằng tiếng Việt, đầy đủ và rõ ràng" |
| 8 | `apps/api/src/lib/answer.ts` | 707-708 | Rule #6 | Google Search grounding: "HÃY DỤNG Google Search bổ sung khi thiếu. Nội bộ LUÔN ưu tiên" |
| 9 | `apps/api/src/lib/answer.ts` | 697-699 | history block | Conversation history injection vào prompt |
| 10 | `apps/api/src/lib/answer.ts` | 710-714 | evidence block | Format `[S1] title (vX)\ncontent` cho mỗi chunk |

### 1.2. External Reference Prompt

| # | File | Dòng | Hàm | Vai trò |
|---|------|------|-----|---------|
| 11 | `apps/api/src/lib/answer.ts` | 719-728 | `composeExternalReferencePrompt()` | Template riêng cho external search — yêu cầu Google Search grounding, ghi rõ "(tham khảo web)" |
| 12 | `apps/api/src/lib/answer.ts` | 730 | `externalReferencePrefix` | Prefix bắt buộc: "Tôi không tìm thấy thông tin này trong dữ liệu chính sách công ty. Tham khảo bên ngoài:" |
| 13 | `apps/api/src/lib/answer.ts` | 732-736 | `normalizeExternalReferenceAnswer()` | Đảm bảo prefix không bị lặp |

### 1.3. Deterministic Format Template (Extractive Mode)

| # | File | Dòng | Hàm | Vai trò |
|---|------|------|-----|---------|
| 14 | `apps/api/src/lib/answer.ts` | 219-247 | `detectQuestionType()` | Phân loại câu hỏi: yes_no / quantity / list / procedure / explanation |
| 15 | `apps/api/src/lib/answer.ts` | 299-317 | `classifySentence()` | Phân loại role: rule / condition / exception / detail |
| 16 | `apps/api/src/lib/answer.ts` | 319-442 | `formatStructuredAnswer()` | Format câu trả lời theo question type — "Theo {source}: {evidence}" + điều kiện + ngoại lệ |

### 1.4. Agent Prompt Templates

| # | File | Dòng | Hàm | Vai trò |
|---|------|------|-----|---------|
| 17 | `apps/api/src/lib/agent/query-analyzer.ts` | 18-44 | `ANALYSIS_PROMPT` | Template phân tích query: intent, complexity, strategy, entities + 5 few-shot examples |
| 18 | `apps/api/src/lib/agent/self-reflect.ts` | 16-42 | `REFLECTION_PROMPT` | Template đánh giá quality: score 1-5, 7 issue codes, 2 few-shot examples |

---

## Trụ 2: Generative LLM (The Brain)

**Mục tiêu**: Tổng hợp câu trả lời cuối cùng. Hỗ trợ 2 chế độ song song: Deterministic (local) và Generative (Gemini).

### 2.1. Gemini API Client

| # | File | Dòng | Hàm | Vai trò |
|---|------|------|-----|---------|
| 1 | `apps/api/src/lib/answer.ts` | 795-828 | `generateWithGeminiModel()` | **Core** — gọi Gemini REST API trực tiếp, 30s timeout, optional Google Search tool |
| 2 | `apps/api/src/lib/answer.ts` | 800-801 | endpoint construction | URL: `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` |
| 3 | `apps/api/src/lib/answer.ts` | 803-807 | request body | `{contents, tools: [{google_search: {}}]}` khi enable |
| 4 | `apps/api/src/lib/answer.ts` | 766-793 | `parseGeminiAnswer()` | Parse response: extract text + `groundingMetadata.groundingChunks` (external sources) |
| 5 | `apps/api/src/lib/agent/gemini-client.ts` | 88-120 | `callGemini()` | Agent-mode Gemini client — multi-turn, function calling support |
| 6 | `apps/api/src/lib/agent/gemini-client.ts` | 134-166 | `geminiGenerateWithTools()` | Public API: retry loop qua models, extract text + function calls |
| 7 | `apps/api/src/lib/agent/gemini-client.ts` | 171-186 | `geminiPromptWithTools()` | Convenience wrapper: inject system instruction → call Gemini |

### 2.2. Model Fallback Chain

| # | File | Dòng | Hàm | Vai trò |
|---|------|------|-----|---------|
| 8 | `apps/api/src/lib/answer.ts` | 749-751 | `normalizeGeminiModelName()` | Strip `models/` prefix |
| 9 | `apps/api/src/lib/answer.ts` | 753-755 | `isTextGeminiModel()` | Filter: chỉ giữ text models (exclude embedding/imagen/tts) |
| 10 | `apps/api/src/lib/answer.ts` | 835-860 | `listGeminiModels()` | List available models từ Gemini API (cache 30 phút) |
| 11 | `apps/api/src/lib/answer.ts` | 862-881 | `candidateGeminiModels()` | **Build fallback chain**: configured → strip `-latest` → `gemini-3.5-flash` → `gemini-3-flash` → `gemini-2.5-flash` → preferred → listed |
| 12 | `apps/api/src/lib/answer.ts` | 892-923 | `generateWithGemini()` | **Retry loop**: thử với Google Search trước → fallback không Google Search → qua từng model |
| 13 | `apps/api/src/lib/answer.ts` | 925-943 | `generateExternalReferenceWithGemini()` | External reference: thử models, require grounding sources > 0 |
| 14 | `apps/api/src/lib/agent/gemini-client.ts` | 70-76 | `CANDIDATE_MODELS` | Agent-mode fallback: `gemini-3.5-flash` → `gemini-3-flash` → `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-2.0-flash-lite` |

### 2.3. Deterministic Answer (Local Extractive — Không cần LLM)

| # | File | Dòng | Hàm | Vai trò |
|---|------|------|-----|---------|
| 15 | `apps/api/src/lib/answer.ts` | 556-694 | `createDeterministicAnswer()` | **Entry point** — BM25 scoring → triple-signal reranking → MMR → context enrichment → format |
| 16 | `apps/api/src/lib/answer.ts` | 34-37 | `tokenize()` | Tokenizer: lowercase, split non-alphanumeric, filter stop words |
| 17 | `apps/api/src/lib/answer.ts` | 51-68 | `tokenizeWithCompounds()` | Vietnamese compound-aware tokenizer (nghỉ_phép, bảo_hiểm, ...) |
| 18 | `apps/api/src/lib/answer.ts` | 103-135 | `scoreSentenceBm25()` | BM25 scoring: IDF × TF-norm + bigram boost + position decay |
| 19 | `apps/api/src/lib/answer.ts` | 178-214 | `scoreSentencesTripleSignal()` | **Triple-signal**: cross-encoder (0.50) + embedding cosine (0.30) + BM25 (0.20) |
| 20 | `apps/api/src/lib/answer.ts` | 185-188 | parallel execution | `Promise.all([scoreRerankerPair, embedText])` — chạy song song |
| 21 | `apps/api/src/lib/answer.ts` | 251-259 | `getMmrLambda()` | MMR lambda theo question type: yes_no=0.85, quantity=0.80, list=0.50, procedure=0.55, explanation=0.70 |
| 22 | `apps/api/src/lib/answer.ts` | 261-294 | `selectByMmr()` | Maximal Marginal Relevance: balance relevance vs diversity |
| 23 | `apps/api/src/lib/answer.ts` | 451-481 | `enrichWithContext()` | Bidirectional context window: thêm adjacent sentences (condition/exception/rule) từ cùng chunk |

### 2.4. Dual-Mode Selection

| # | File | Dòng | Hàm | Vai trò |
|---|------|------|-----|---------|
| 24 | `apps/api/src/lib/answer.ts` | 999-1140 | `answerQuestion()` | **Main entry** — quyết định deterministic vs gemini dựa trên `options.useGemini` |
| 25 | `apps/api/src/lib/answer.ts` | 1042 | deterministic path | `useGemini=false` → `createDeterministicAnswer()` |
| 26 | `apps/api/src/lib/answer.ts` | 1081-1082 | gemini path | `useGemini=true` → `generateWithGemini()` |
| 27 | `apps/api/src/lib/answer.ts` | 1103-1139 | fallback | Gemini fail → deterministic fallback + warning |

### 2.5. Orchestrator (Agent Mode)

| # | File | Dòng | Hàm | Vai trò |
|---|------|------|-----|---------|
| 28 | `apps/api/src/lib/agent/orchestrator.ts` | 74-190 | `runAgent()` | **Agent pipeline**: analyze → retrieve → generate → reflect → refine |
| 29 | `apps/api/src/lib/agent/query-analyzer.ts` | 82-112 | `analyzeQuery()` | Query analysis: quick path (pattern) → Gemini path → fallback |
| 30 | `apps/api/src/lib/agent/retrieval-engine.ts` | 147-176 | `executeRetrieval()` | Strategy dispatch: direct / decompose / multi_retrieve / clarify |
| 31 | `apps/api/src/lib/agent/retrieval-engine.ts` | 28-37 | `executeDirect()` | Strategy: single retrieve |
| 32 | `apps/api/src/lib/agent/retrieval-engine.ts` | 39-80 | `executeDecompose()` | Strategy: retrieve per sub-query + original → merge + dedup |
| 33 | `apps/api/src/lib/agent/retrieval-engine.ts` | 82-123 | `executeMultiRetrieve()` | Strategy: original + entity-enriched queries |
| 34 | `apps/api/src/lib/agent/retrieval-engine.ts` | 181-193 | `refineRetrieve()` | Re-retrieve với refined query (sau self-reflection) |

---

## Trụ 3: Output Guardrails (Security)

**Mục tiêu**: Validate câu trả lời trước khi hiển thị. Đảm bảo sources là thật, semantic alignment với context, bảo vệ credibility.

### 3.1. Pre-Generation Guardrails (Trước khi generate)

| # | File | Dòng | Hàm | Trigger | Hành động |
|---|------|------|-----|---------|-----------|
| 1 | `apps/api/src/lib/answer.ts` | 23 | `RELEVANCE_FLOOR` constant | `bestChunkScore < 0.25` | Refuse ngay — không generate |
| 2 | `apps/api/src/lib/answer.ts` | 1009-1013 | `answerQuestion()` | Score check | `createNotFoundResult()` — "Không tìm thấy" |
| 3 | `apps/api/src/lib/answer.ts` | 18 | `externalReferenceInternalScoreFloor` | `bestScore < 0.5` + external enabled | Fallback sang external reference |

### 3.2. Post-Generation Guardrails (Sau khi generate)

| # | File | Dòng | Hàm | Trigger | Hành động |
|---|------|------|-----|---------|-----------|
| 4 | `apps/api/src/lib/answer.ts` | 648-656 | `createDeterministicAnswer()` | Extract distinctive entities (n-grams 2,3 + single tokens) | Entity extraction |
| 5 | `apps/api/src/lib/answer.ts` | 670-674 | `createDeterministicAnswer()` | `entityCoverage = matched / total` | Tính coverage |
| 6 | `apps/api/src/lib/answer.ts` | 675-680 | `createDeterministicAnswer()` | `≥2 entities & coverage < 60%` | "Không đủ thông tin" |
| 7 | `apps/api/src/lib/answer.ts` | 682-687 | `createDeterministicAnswer()` | `1 entity & coverage < 50%` | "Không tìm thấy chính sách" |
| 8 | `apps/api/src/lib/answer.ts` | 484-517 | `detectContradictions()` | Conflicting numbers cho cùng unit (ngày, tháng, %, VND) | Warning: "Phát hiện số liệu khác nhau" |
| 9 | `apps/api/src/lib/answer.ts` | 519-549 | `computeConfidence()` | Always | Tính score 0-1: `0.3×topScore + 0.25×gap + 0.25×coverage + 0.2×evidence`. Penalty ×0.7 nếu contradiction |

### 3.3. Post-Generation Insufficiency Check (Gemini-specific)

| # | File | Dòng | Hàm | Trigger | Hành động |
|---|------|------|-----|---------|-----------|
| 10 | `apps/api/src/lib/answer.ts` | 949 | `insufficientStrongPattern` | Regex EN/VI: "not enough", "không đủ", "không tìm thấy", ... (match anywhere) | Mark insufficient |
| 11 | `apps/api/src/lib/answer.ts` | 950 | `insufficientWeakPattern` | Regex EN/VI: "no data", "không chứa", ... (chỉ match 200 chars đầu) | Mark insufficient |
| 12 | `apps/api/src/lib/answer.ts` | 952-956 | `appearsInsufficient()` | Strong pattern match anywhere OR weak pattern trong 200 chars đầu | Return boolean |
| 13 | `apps/api/src/lib/answer.ts` | 1083-1089 | `answerQuestion()` | `appearsInsufficient(geminiResult.answer)` + external enabled | Fallback: `createExternalReferenceResult()` |

### 3.4. Grounding Source Verification (External Search)

| # | File | Dòng | Hàm | Trigger | Hành động |
|---|------|------|-----|---------|-----------|
| 14 | `apps/api/src/lib/answer.ts` | 780-793 | `parseGeminiAnswer()` | `groundingMetadata.groundingChunks` | Extract `externalSources` với URI + title — đảm bảo nguồn web là thật |
| 15 | `apps/api/src/lib/answer.ts` | 935-937 | `generateExternalReferenceWithGemini()` | `externalSources.length === 0` | Reject: "returned no Google Search grounding sources" |

### 3.5. Self-Reflection (Agent Mode — LLM-based Quality Assessment)

| # | File | Dòng | Hàm | Trigger | Hành động |
|---|------|------|-----|---------|-----------|
| 16 | `apps/api/src/lib/agent/self-reflect.ts` | 75-114 | `tryQuickReflection()` | No chunks / refusal pattern / too short | Quick score 1-2, no LLM needed |
| 17 | `apps/api/src/lib/agent/self-reflect.ts` | 80-89 | `tryQuickReflection()` | `chunks.length === 0` | Score 1, issues: [no_citation, missing_entity] |
| 18 | `apps/api/src/lib/agent/self-reflect.ts` | 91-99 | `tryQuickReflection()` | Refusal regex: "xin lỗi", "không tìm thấy", ... | Score 1, issues: [irrelevant] |
| 19 | `apps/api/src/lib/agent/self-reflect.ts` | 101-110 | `tryQuickReflection()` | `answer.length < 50 && question.length > 20` | Score 2, issues: [vague, incomplete] |
| 20 | `apps/api/src/lib/agent/self-reflect.ts` | 121-169 | `selfReflect()` | Agent mode enabled | **Main entry** — quick path → Gemini path → heuristic fallback |
| 21 | `apps/api/src/lib/agent/self-reflect.ts` | 131-145 | `selfReflect()` | Gemini available | Call `geminiPromptWithTools(prompt, [], REFLECTION_PROMPT)` → parse JSON |
| 22 | `apps/api/src/lib/agent/self-reflect.ts` | 44-70 | `parseReflectionFromText()` | Gemini response | Parse JSON: isAdequate, qualityScore, issues, suggestedRefinement, reasoning |
| 23 | `apps/api/src/lib/agent/self-reflect.ts` | 150-168 | `selfReflect()` | Gemini fail | Heuristic fallback: refusal → inadequate, too short → inadequate, else → adequate |

### 3.6. Query Refinement (Sau Self-Reflection)

| # | File | Dòng | Hàm | Trigger | Hành động |
|---|------|------|-----|---------|-----------|
| 24 | `apps/api/src/lib/agent/orchestrator.ts` | 140 | `runAgent()` | `options.enableReflection === true` | Enter reflection block |
| 25 | `apps/api/src/lib/agent/orchestrator.ts` | 141-149 | `runAgent()` | Always khi reflection enabled | `selfReflect()` → emit reflect step |
| 26 | `apps/api/src/lib/agent/orchestrator.ts` | 151 | `runAgent()` | `!isAdequate && qualityScore < 3 && suggestedRefinement` | Trigger refinement |
| 27 | `apps/api/src/lib/agent/orchestrator.ts` | 152-155 | `runAgent()` | `refinedQuery !== currentQuestion` | Update currentQuestion |
| 28 | `apps/api/src/lib/agent/orchestrator.ts` | 157-159 | `runAgent()` | After refinement | `refineRetrieve(refinedQuery)` → re-retrieve |
| 29 | `apps/api/src/lib/agent/orchestrator.ts` | 161-163 | `runAgent()` | After re-retrieve | `answerQuestion(refinedQuery, newChunks)` → re-generate |

### 3.7. Guardrails Config (API Routes)

| # | File | Dòng | Hàm | Vai trò |
|---|------|------|-----|---------|
| 30 | `apps/api/src/routes/api.ts` | 279-285 | `/ask/agent` endpoint | AgentOptions: `enableReflection: true` |
| 31 | `apps/api/src/routes/api.ts` | 410-417 | `/conversations/:id/ask/agent` endpoint | AgentOptions: `enableReflection: true` |

---

## Flow Tổng Hợp: 3 Trụ Cột Hoạt Động Cùng Nhau

```
User: "So sánh nghỉ phép và bảo hiểm y tế" (Agent Mode)
  │
  │  ┌─────────────────────────────────────────────────────────┐
  │  │ TRỤ 2: LLM                                            │
  │  │ query-analyzer.ts:82  analyzeQuery()                    │
  │  │ → intent: comparative, strategy: decompose              │
  │  └─────────────────────────────────────────────────────────┘
  │
  │  ┌─────────────────────────────────────────────────────────┐
  │  │ TRỤ 2: LLM                                            │
  │  │ retrieval-engine.ts:39  executeDecompose()              │
  │  │ → retrieve cho mỗi sub-query + original                 │
  │  └─────────────────────────────────────────────────────────┘
  │
  │  ┌─────────────────────────────────────────────────────────┐
  │  │ TRỤ 1: PROMPT AUGMENTATION                             │
  │  │ answer.ts:696  composeGeminiPrompt()                    │
  │  │ → Query + [S1][S2]... + anti-hallucination rules        │
  │  │                                                         │
  │  │ TRỤ 2: LLM                                            │
  │  │ answer.ts:795  generateWithGeminiModel()                │
  │  │ → Gemini Flash generates answer                         │
  │  │                                                         │
  │  │ TRỤ 3: GUARDRAILS                                     │
  │  │ answer.ts:670  entity coverage check                    │
  │  │ answer.ts:484  contradiction detection                  │
  │  │ answer.ts:519  confidence scoring                       │
  │  │ answer.ts:952  appearsInsufficient()                    │
  │  └─────────────────────────────────────────────────────────┘
  │
  │  ┌─────────────────────────────────────────────────────────┐
  │  │ TRỤ 3: GUARDRAILS (Self-Reflection)                   │
  │  │ self-reflect.ts:121  selfReflect()                      │
  │  │ → score: 2/5, issues: [incomplete, missing_entity]     │
  │  │ → suggestedRefinement: "Chính sách bảo hiểm y tế"      │
  │  └─────────────────────────────────────────────────────────┘
  │
  │  ┌─────────────────────────────────────────────────────────┐
  │  │ TRỤ 3: GUARDRAILS (Query Refinement)                  │
  │  │ orchestrator.ts:151  score < 3 → refine                 │
  │  │ orchestrator.ts:157  refineRetrieve()                   │
  │  │ orchestrator.ts:161  answerQuestion() → re-generate     │
  │  └─────────────────────────────────────────────────────────┘
  │
  ▼
  Answer hoàn chỉnh: đủ cả nghỉ phép + bảo hiểm y tế
```
