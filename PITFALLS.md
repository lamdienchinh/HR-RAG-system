# HR Policy RAG — Pit Falls & Known Limitations

Tài liệu tổng hợp các điểm yếu, giới hạn, và edge cases của hệ thống RAG hiện tại. Được cập nhật sau mỗi lần review và testing.

---

## 1. Conversational AI Limitations

### 1.1. Không có Context Carryover

**Mức độ**: 🔴 Nghiêm trọng

Mỗi câu hỏi được xử lý độc lập, không mang ngữ cảnh từ turn trước.

```
Turn 1: "Chính sách nghỉ phép bao nhiêu ngày?"
  → "Nhân viên được nghỉ 18 ngày phép năm." ✅

Turn 2: "Còn bảo hiểm thì sao?"
  → Retrieval "bảo hiểm" → có thể tìm đúng ✅

Turn 3: "So sánh hai chính sách đó"
  → ❌ Không biết "hai chính sách đó" là gì
```

**Root cause**: Không có query rewriting dựa trên conversation history.

**Impact**: Multi-turn conversations bị break ở turn 3+ khi user dùng đại từ chỉ định ("đó", "cái này", "hai chính sách đó").

### 1.2. Không có Pronoun Resolution

**Mức độ**: 🔴 Nghiêm trọng

```
"Chính sách đó quy định gì?"
  → "đó" = ? (không biết refer to policy nào)
  → Retrieval lung tung → trả lời không chính xác
```

**Root cause**: Không có NLP pipeline để resolve pronouns.

### 1.3. Không có Topic Tracking

**Mức độ**: 🟡 Trung bình

```
Turn 1: "Nghỉ phép bao nhiêu ngày?" → topic: time-off-policy
Turn 2: "Còn bảo hiểm?" → topic: health-insurance-policy
Turn 3: "So sánh hai cái đó" → cần biết 2 topics trước
  → ❌ Không track topics → fail
```

**Root cause**: Không có conversation state machine.

### 1.4. Không có Clarification Requests

**Mức độ**: 🟡 Trung bình

```
"Chính sách lương" → ambiguous (khung lương? mức lương? lương cơ bản?)
  → Hệ thống hiện tại: retrieval lung tung → trả lời không chính xác
  → Conversational AI: "Bạn muốn hỏi về khung lương, mức lương, hay lương cơ bản?"
```

**Root cause**: Không có ambiguity detection + clarification generation.

---

## 2. Retrieval Limitations

### 2.1. Multi-hop Question Failures

**Mức độ**: 🔴 Nghiêm trọng

Câu hỏi quá rộng/broad không match đúng policies.

```
Q: "Một nhân viên mới bắt đầu cần những gì từ IT, HR và quản lý?"
Expected: [onboarding-offboarding, equipment, access-control]
Retrieved: [code-of-conduct, time-off, training, workplace-safety, ...]
Recall: 0.000
```

**Root cause**: Câu hỏi quá rộng, không có keywords cụ thể. Embedding model không capture semantic meaning tốt cho broad questions.

**Impact**: Multi-hop questions với nhiều policy references bị miss hoàn toàn.

### 2.2. Precision@K Ceiling

**Mức độ**: 🟡 Trung bình

Với topK=6 và 1 expected policy, max precision = 1/6 ≈ 0.167.

```
Recall@K: 1.0 (tất cả expected policies được tìm)
Precision@K: 0.167 (chỉ 1/6 chunks là relevant)
```

**Root cause**: Retrieval trả về nhiều chunks từ policies khác nhau. Không phải bug, nhưng metric threshold cần adjust.

### 2.3. Embedding Model Limitations

**Mức độ**: 🟡 Trung bình

Model `paraphrase-multilingual-MiniLM-L12-v2` (384 chiều) có giới hạn:
- Không capture tốt semantic meaning cho broad/ambiguous queries
- Vietnamese compound words không được handle tốt
- Không support domain-specific terminology

### 2.4. FTS Synonym Map Coverage

**Mức độ**: 🟢 Thấp

Synonym map chỉ cover ~30 HR terms. Các thuật ngữ mới hoặc domain-specific không được expand.

---

## 3. Generation Limitations

### 3.1. Answer Relevance Metric

**Mức độ**: 🟡 Trung bình

Metric hiện tại: `0.5 * tokenScore + 0.3 * bigramScore + 0.2 * keyPhraseScore`

```
Answer Relevance: 0.594 (threshold: 0.30) → PASS nhưng chưa cao
```

**Root cause**: Vietnamese n-grams thường không match exact do paraphrasing. Metric cần cải thiện fuzzy matching.

### 3.2. Faithfulness Metric (Simulated)

**Mức độ**: 🟢 Thấp

Metric hiện tại dựa trên n-gram overlap giữa answer và chunks. Không phải semantic faithfulness.

```
Faithfulness: 0.900 (threshold: 0.50) → PASS
```

**Root cause**: Chỉ check surface-level overlap, không check semantic consistency.

### 3.3. Deterministic Fallback Quality

**Mức độ**: 🟡 Trung bình

Khi Gemini fail, fallback to deterministic extractive answer. Quality kém hơn Gemini answer.

```
Gemini answer: "Theo chính sách nghỉ phép, nhân viên được hưởng 18 ngày phép năm có lương."
Deterministic: "Nhân viên được hưởng 18 ngày phép năm. Thời gian nghỉ không vượt quá 30 ngày."
```

**Root cause**: Deterministic answer chỉ extract sentences, không tổng hợp.

---

## 4. Agent Mode Limitations

### 4.1. Self-Reflection Always Returns Original Query

**Mức độ**: 🟡 Trung bình

`tryQuickReflection()` trả `suggestedRefinement: question` (original) cho tất cả cases:
- No chunks → `suggestedRefinement: question`
- Refusal pattern → `suggestedRefinement: question`
- Too short → `suggestedRefinement: question`

**Impact**: Loop detection catches it, nhưng refinement không có giá trị.

### 4.2. Query Analysis Fallback

**Mức độ**: 🟢 Thấp

Khi Gemini fail, default to `{intent: "factual", complexity: "simple", strategy: "direct"}`.

**Impact**: Agent mode degrade to direct mode khi Gemini unavailable.

### 4.3. Agent Latency

**Mức độ**: 🟡 Trung bình

Agent mode chạy nhiều steps: analyze → retrieve → generate → reflect → refine.

```
Simple question: ~2-3s (skip reflection)
Complex question: ~5-6s (with reflection)
With refinement: ~8-10s
```

**Root cause**: Mỗi step gọi Gemini API (~200-500ms).

---

## 5. Greeting Detection Limitations

### 5.1. Strip Pattern Coverage

**Mức độ**: 🟢 Thấp

`stripGreetingPrefix()` không cover tất cả edge cases:

```
"Chào bạn, nhân viên được nghỉ bao nhiêu ngày?" → "bạn, nhân viên được nghỉ..."
  → "bạn," bị giữ lại
```

**Root cause**: Pattern `chào\s+(?:bạn|thầy|...)` match "Chào bạn" nhưng "bạn," vẫn còn.

### 5.2. Trailing Softener Patterns

**Mức độ**: 🟢 Thấp

Một số trailing softeners không được strip:

```
"Chính sách lương cho tôi biết với" → vẫn giữ nguyên
```

**Root cause**: Pattern `giúp\s+(?:tôi|em)\s+(?:trả\s+lời|với)` không match "cho tôi biết với".

---

## 6. UI/UX Limitations

### 6.1. Scroll Pinning

**Mức độ**: 🟢 Thấp

Scroll pinning dùng `getBoundingClientRect()` — chính xác hơn `offsetTop` nhưng vẫn có edge case khi container có scroll position thay đổi giữa render.

### 6.2. Streaming Token Display

**Mức độ**: 🟢 Thấp

Markdown rendering trong streaming: tokens được append từng cái một. Markdown renderer có thể render sai khi chưa nhận đủ tokens (e.g., bold `**text**` khi mới nhận `**te`).

---

## 7. Infrastructure Limitations

### 7.1. No CI/CD Pipeline

**Mức độ**: 🟡 Trung bình

Không có GitHub Actions, không có automated testing trên PR.

### 7.2. No Model Versioning

**Mức độ**: 🟢 Thấp

Embedding model và reranker model không có versioning. Nếu model bị update, quality có thể thay đổi.

### 7.3. Database Single Point of Failure

**Mức độ**: 🟡 Trung bình

PostgreSQL là single point of failure. Không có replication hay backup strategy.

---

## 8. Testing Limitations

### 8.1. No Integration Tests with Real DB

**Mức độ**: 🟡 Trung bình

Tests hiện tại dùng mock data. Không có integration tests chạy against real PostgreSQL + pgvector.

### 8.2. No E2E Tests

**Mức độ**: 🟡 Trung bình

Không có end-to-end tests cho full pipeline: user input → API → retrieval → generation → response.

### 8.3. Simulated Evaluation

**Mức độ**: 🟡 Trung bình

RAG evaluation tests dùng simulated answers, không phải real Gemini answers. Metrics có thể không reflect actual quality.

---

## 9. Priority Matrix

| # | Pit Fall | Mức độ | Impact | Effort | Ưu tiên |
|---|----------|--------|--------|--------|---------|
| 1.1 | Context Carryover | 🔴 | High | High | P1 |
| 1.2 | Pronoun Resolution | 🔴 | High | High | P1 |
| 2.1 | Multi-hop Questions | 🔴 | High | Medium | P1 |
| 1.3 | Topic Tracking | 🟡 | Medium | Medium | P2 |
| 1.4 | Clarification Requests | 🟡 | Medium | Medium | P2 |
| 3.1 | Answer Relevance | 🟡 | Medium | Low | P2 |
| 4.1 | Self-Reflection Quality | 🟡 | Medium | Low | P2 |
| 4.3 | Agent Latency | 🟡 | Medium | High | P3 |
| 5.1 | Strip Pattern Coverage | 🟢 | Low | Low | P3 |
| 6.1 | Scroll Pinning | 🟢 | Low | Low | P3 |
| 7.1 | No CI/CD | 🟡 | Medium | Medium | P3 |

---

## 10. Recommended Fixes

### P1: Conversational AI Foundation

```
1. Query Rewriting với Gemini
   - Input: conversationHistory + current question
   - Output: rewritten query với đầy đủ context
   - File: lib/conversation-context.ts (mới)

2. Reference Resolution
   - Detect pronouns: "đó", "cái này", "nó", "thiết bị đó"
   - Resolve với conversation history
   - File: lib/reference-resolver.ts (mới)

3. Multi-hop Retrieval Improvement
   - Decompose broad queries thành sub-queries
   - Retrieve cho mỗi sub-query + merge
   - File: lib/agent/retrieval-engine.ts (update)
```

### P2: Quality Improvements

```
4. Answer Relevance Metric
   - Add fuzzy matching cho Vietnamese n-grams
   - Use character-level trigrams
   - File: lib/eval/rag-eval.ts (update)

5. Self-Reflection Quality
   - Return actual suggested refinement, không phải original query
   - Add confidence-based refinement strategy
   - File: lib/agent/self-reflect.ts (update)
```

### P3: Infrastructure

```
6. CI/CD Pipeline
   - GitHub Actions cho tests
   - Automated deployment
   - File: .github/workflows/test.yml (mới)

7. Integration Tests
   - Test với real PostgreSQL + pgvector
   - File: lib/eval/rag-eval.integration.test.ts (mới)
```

---

## 11. Monitoring & Metrics

### Current Metrics (Evaluation Suite)

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Recall@K | 1.000 | ≥ 0.70 | ✅ PASS |
| Precision@K | 0.247 | ≥ 0.15 | ✅ PASS |
| MRR | 0.900 | ≥ 0.50 | ✅ PASS |
| NDCG@K | 0.900 | ≥ 0.50 | ✅ PASS |
| Hit Rate | 1.000 | ≥ 0.75 | ✅ PASS |
| Faithfulness | 0.900 | ≥ 0.50 | ✅ PASS |
| Answer Relevance | 0.594 | ≥ 0.30 | ✅ PASS |
| Refusal Accuracy | 1.000 | ≥ 0.80 | ✅ PASS |

### Metrics to Add

| Metric | Description | Priority |
|--------|-------------|----------|
| Context Carryover Rate | % follow-up questions answered correctly | P1 |
| Pronoun Resolution Accuracy | % pronouns resolved correctly | P1 |
| Multi-hop Recall | % multi-hop questions with all policies retrieved | P1 |
| Clarification Rate | % ambiguous questions that get clarification | P2 |
| Response Latency P95 | 95th percentile response time | P2 |

---

## 12. Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-06-04 | Initial creation | System Review |
| 2026-06-04 | Added conversational AI limitations | System Review |
| 2026-06-04 | Added retrieval limitations | System Review |
| 2026-06-04 | Added agent mode limitations | System Review |
| 2026-06-04 | Added priority matrix | System Review |
