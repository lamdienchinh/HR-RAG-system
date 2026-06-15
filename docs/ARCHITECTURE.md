# Kiến Trúc Hệ Thống (ARCHITECTURE)

Tài liệu này phân tích chi tiết cấu trúc dữ liệu, các luồng tương tác và cơ chế hoạt động cốt lõi của hệ thống **HR-RAG System** chạy từ giao diện người dùng tới trung tâm xử lý mô hình ngôn ngữ lớn (LLM).

---

## I. SƠ ĐỒ LUỒNG DỮ LIỆU TỔNG THỂ (SYSTEM DATAFLOW)

```
[ FRONTEND (React) ] ──(Gửi câu hỏi + Chế độ)──> [ API SERVER (Express) ]
         ▲                                                │
         │                                                ▼
         │                                       [ 1. Sanitization & Guardrails ]
         │                                       - Làm sạch mã độc đầu vào
         │                                       - Phân loại Intent (greeting, injection,...)
         │                                                │
         │                                                ▼
         │                                       [ 2. Agentic ReAct Loop (Model 1) ]
         │<──────(Phát các bước suy luận)──────── - Lên kế hoạch gọi Tools
         │                                                │
         │                             ┌──────────────────┴──────────────────┐
         │                             ▼ (search_hr_policies)                ▼ (calculate_leave_balance)
         │                    [ Hybrid Retrieval (Postgres) ]       [ DB / Postgres Query ]
         │                    - Vector Search (pgvector)            - Số ngày phép còn lại
         │                    - Full-Text Search (tsvector)                  │
         │                    - RRF Fusion + Cross-Rerank                    │
         │                             │                                     │
         │                             └──────────────────┬──────────────────┘
         │                                                │ (Tích lũy bối cảnh)
         │                                                ▼
         └───────(Stream câu trả lời)────────── [ 3. Main Answer Model (Model 2) ]
                                                 - Tổng hợp bối cảnh hệ thống
                                                 - So khớp trích dẫn S1, S2,...
```

---

## II. CHI TIẾT LUỒNG FRONTEND (FE CHAT FLOW)

Toàn bộ quá trình tương tác, hiển thị và dựng luồng stream đều được điều khiển tại trang `ChatPage.tsx` và API helper `api.ts`:

1. **Khởi động tin nhắn (`ChatPage.tsx` - Hàm `handleAsk`):**
   * Hệ thống kiểm tra ID phòng chat (`conversationId`). Nếu chưa có, hàm `ensureConversation()` sẽ gửi lệnh `POST /api/conversations` đến BE để tạo phòng chat lưu trạng thái (Stateful) vĩnh viễn trong Postgres.
   * Tin nhắn của User và tin nhắn trống của Assistant lập tức được đẩy vào React state để cập nhật giao diện mượt mà.
2. **Kích hoạt kết nối Stream SSE (Server-Sent Events):**
   * Tùy theo chế độ người dùng lựa chọn (Bật/Tắt nút gạt Agent), hàm `streamQuestion` hoặc `streamAgentQuestion` (tệp `apps/web/src/apis/api.ts`) sẽ gửi yêu cầu `POST` dạng luồng dữ liệu tới BE.
3. **Phân tích và Dựng giao diện (`ChatBubble.tsx`):**
   * Trong lúc nhận các token chữ từ BE, Frontend sử dụng thư viện `react-markdown` để render trực tiếp văn bản Markdown (chữ in đậm, gạch đầu dòng, danh sách chia đoạn).
   * Sử dụng biểu thức chính quy `[S(\d+)]` (`citation-utils.ts`) để trích xuất các nguồn tài liệu được mô hình sử dụng.
   * Nếu có trích dẫn, Frontend sẽ vẽ thêm khung **"Nguồn tham khảo"** tuyệt đẹp dưới bong bóng chat, cho phép người dùng click để mở tab xem chi tiết tệp chính sách gốc (`PolicyViewPage.tsx`).
   * Hiển thị bảng **"Luồng xử lý" (Agent Trace Panel)** cho phép người dùng theo dõi từng tích tắc suy luận của trí tuệ nhân tạo (Model thought, tool call, tool output).

---

## III. CHI TIẾT LUỒNG BACKEND (BE PROCESSING PIPELINE)

Khi BE nhận được kết nối HTTP POST stream từ FE, yêu cầu sẽ đi qua các trạm lọc và xử lý tuần tự:

### Trạm 1: Làm sạch & Thẩm định ý đồ (Guardrails / Security)
* **File:** `apps/api/src/lib/sanitize.ts` & `apps/api/src/lib/agent/query-analyzer.ts`
* **Quy trình:**
  1. Loại bỏ các ký tự điều khiển nguy hiểm, ngăn chặn XSS/SQL Injection thô sơ.
  2. Mô hình phân tích ý định (`analyzeQuery`) hoạt động như một lớp **Input Guardrail** phân loại câu hỏi gốc:
     * *Nếu là `off_topic` hoặc `injection`:* Chặn đứng lập tức, phát sự kiện stream từ chối thân thiện và ghi nhận tin nhắn vào DB hội thoại, tuyệt đối không cho phép câu hỏi đi tiếp vào database chính sách.

### Trạm 2: Vòng lặp suy luận ReAct (`apps/api/src/lib/agent/orchestrator.ts`)
Nếu câu hỏi hợp lệ và cần Agent xử lý, `runAgent` sẽ được kích hoạt với vòng lặp ReAct tối đa 3 bước suy luận:

1. **Plan (Suy nghĩ):** Mô hình `gemma-4-26b-a4b-it` (hoặc fallback) nhận bối cảnh hội thoại và bộ công cụ khả dụng (`agentToolsDeclarations` trong `tools.ts`). Mô hình phân tích và quyết định hành động (`functionCall`).
2. **Act (Hành động):** BE nhận diện yêu cầu gọi hàm và thực thi công cụ tương ứng cục bộ (`executeTool`):
   * *`get_current_date`:* Trả về ngày hiện tại đã định dạng Việt hóa.
   * *`calculate_leave_balance`:* Truy vấn Postgres lấy chính xác số dư phép khả dụng của nhân viên.
   * *`search_hr_policies`:* Kích hoạt bộ máy **Hybrid Retrieval Engine** để tìm kiếm tài liệu.
3. **Observe (Quan sát):** Kết quả của công cụ (`toolResult`) được lưu ngược vào bảng nháp lịch sử suy luận (`messages`) dưới dạng `functionResponse` để Agent đọc hiểu ở lượt suy luận tiếp theo.
4. **Tích lũy bối cảnh:** Các thông tin cá nhân tra cứu được (như số ngày phép thực tế, ngày hiện tại) được đưa vào một cấu trúc Map tĩnh mang tên `executedToolSummaries` để tránh bị trùng lặp dữ liệu giữa các lượt lặp.

### Trạm 3: Bộ máy Tìm kiếm Lai kết hợp xếp hạng lại (`apps/api/src/lib/retrieval.ts`)
Đây là trái tim của hệ thống RAG tĩnh và động. Khi công cụ `search_hr_policies` được gọi, nó kích hoạt quy trình tìm kiếm lai tinh vi:

1. **Embedding Generator (`embeddings.ts`):** Tạo vector 384 chiều của câu hỏi thông qua mô hình cục bộ `Xenova/paraphrase-multilingual-MiniLM-L12-v2`.
2. **Double DB Retrieval (Postgres):**
   * *Nhánh 1 (Vector Search):* Tìm kiếm khoảng cách Cosine (`<=>`) của các vector trong bảng `document_chunks`.
   * *Nhánh 2 (Full-Text Search):* Mở rộng từ đồng nghĩa (`expandQueryTerms` trong `retrieval.ts`) và tìm kiếm từ khóa chính xác thông qua trường chỉ mục ngược `tsv` (`tsvector`) bằng thuật toán Cover Density `ts_rank_cd`.
   * *Bộ lọc Quyền riêng tư (RBAC):* Nhân viên thường bị tự động chèn thêm điều kiện loại bỏ các mảnh tài liệu mật (`is_private = false`).
3. **RRF Fusion (Reciprocal Rank Fusion):** Gộp kết quả của cả hai nhánh tìm kiếm dựa trên thứ hạng xuất hiện của chúng để cho ra danh sách ứng viên tối ưu nhất.
4. **Policy Diversification (Đa dạng hóa chính sách):** Áp dụng bộ lọc chỉ cho phép tối đa **3 chunks** của cùng một chính sách được lọt vào vòng trong để bảo toàn dòng chảy bối cảnh mà không làm loãng thông tin của các chính sách khác.
5. **Cross-Encoder Reranker (`reranker.ts`):** Sử dụng mô hình `Xenova/bge-reranker-v2-m3` cục bộ để cho điểm tương tác chéo giữa câu hỏi gốc và từng chunk bối cảnh, sắp xếp lại danh sách ứng viên một cách hoàn hảo nhất.

### Trạm 4: Tổng hợp & Phản hồi trích dẫn chuẩn hóa (`apps/api/src/lib/answer.ts`)
* **File:** `apps/api/src/lib/answer.ts` (Hàm `answerQuestionStream`)
* **Quy trình:**
  1. Gộp toàn bộ dữ liệu bối cảnh thực tế hệ thống (`executedToolSummaries`) và các chunk chính sách đã được lọc trùng xếp hạng cao nhất vào Prompt tổng hợp mẫu (`composeGeminiPrompt`).
  2. Chỉ đạo Mô hình chính (`gemini-2.5-flash` được thiết lập ở nhiệt độ cực thấp `0.15` để tăng tính tuân thủ) đọc bối cảnh và viết câu trả lời.
  3. Mô hình chính chèn các ký hiệu `[S1]`, `[S2]`,... ngay sau mỗi dòng dữ liệu nó lấy từ tài liệu bối cảnh tương ứng.
  4. Stream trực tiếp các token chữ về cho người dùng và lưu trữ toàn bộ lịch sử câu trả lời kèm trích dẫn độc bản vào bảng `messages` trong Postgres để phục vụ cho các lượt hội thoại kế tiếp.
