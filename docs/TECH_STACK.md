# Quyết Định Công Nghệ & So Sánh (TECH STACK)

Tài liệu này tổng hợp chi tiết các quyết định công nghệ trong dự án **HR-RAG System**, phân tích ưu/nhược điểm và làm rõ lý do vì sao chúng tôi tự xây dựng Agent thuần (Pure Agent) thay vì sử dụng các khung kéo thả/phức tạp sẵn có trên thị trường.

---

## I. DANH SÁCH CÔNG NGHỆ & LÝ DO LỰA CHỌN

### 1. Backend: Node.js (TypeScript) & Express
* **Lý do lựa chọn:**
  * **Hiệu năng Stream cực cao:** Node.js hỗ trợ xử lý sự kiện I/O bất đồng bộ hoàn hảo, cực kỳ thích hợp cho các ứng dụng Server-Sent Events (SSE) để stream token thời gian thực về cho người dùng.
  * **Hệ sinh thái Javascript/TypeScript đồng bộ:** Cho phép chia sẻ dễ dàng định nghĩa kiểu dữ liệu (Types) giữa Frontend và Backend, giảm thiểu tối đa lỗi đồng bộ khi phát triển.

### 2. Cơ sở dữ liệu: PostgreSQL & Extension `pgvector`
* **Lý do lựa chọn:**
  * **Kiến trúc dữ liệu hợp nhất (Unified DB):** Thay vì cài đặt một Vector Database riêng (như Pinecone, Milvus) và một Relational Database riêng (để quản lý phòng chat, lịch sử tin nhắn, thông tin nhân viên) gây gánh nặng bảo trì và đồng bộ hóa, PostgreSQL giải quyết được cả hai thế giới:
    * Quản lý mối quan hệ, khóa ngoại, giao dịch ACID cực mạnh cho hội thoại (`conversations`, `messages`, `users`).
    * Thực hiện so khớp không gian Vector (`pgvector` Cosine Similarity `<=>`) và tạo chỉ mục tìm kiếm thưa (`tsvector`) trên cùng một bảng dữ liệu `document_chunks`.
  * **Tính nhất quán dữ liệu tuyệt đối:** Hỗ trợ cơ chế cô lập giao dịch `REPEATABLE READ` để đảm bảo khi người dùng đọc tài liệu, họ luôn nhìn thấy một bản snapshot nhất quán ngay cả khi quản trị viên đang chạy reindex cập nhật chính sách dưới nền.

### 3. Mô hình Nhúng & Reranker Cục bộ: ONNX Runtime (Hugging Face)
* **Các mô hình cụ thể:**
  * Embedding: `Xenova/paraphrase-multilingual-MiniLM-L12-v2` (384 chiều)
  * Reranker: `Xenova/bge-reranker-v2-m3` (Cross-Encoder)
* **Lý do lựa chọn:**
  * **Chi phí bằng 0:** Khởi chạy suy luận (Inference) hoàn toàn cục bộ trên CPU máy chủ, không phát sinh chi phí gọi API nhúng của OpenAI hay Cohere.
  * **Bảo mật tuyệt đối:** Văn bản nội bộ của công ty không bao giờ bị gửi ra ngoài Internet trong bước tìm kiếm và lọc bối cảnh.
  * **Độ trễ thấp:** ONNX Runtime lượng tử hóa 8-bit (`q8`) giúp mô hình chạy trên CPU thông thường cực kỳ nhanh (mất chưa đầy 15-40ms).

### 4. Mô hình Ngôn ngữ Lớn: Gemini API (Google GenAI)
* **Mô hình chính:** `gemini-2.5-flash`
* **Lý do lựa chọn:**
  * **Độ trễ cực thấp & Chi phí tối ưu:** Gemini 2.5 Flash hiện là mô hình có tốc độ sinh token nhanh nhất và chi phí tiết kiệm nhất phân khúc.
  * **Khả năng tuân thủ cấu trúc vượt trội:** Tuân thủ hệ thống quy tắc (System Instructions) rất nghiêm ngặt, cho phép chúng tôi khóa cấu trúc trích dẫn `[S1]`, `[S2]` ổn định 100%.
  * **Hỗ trợ Native Tool Calling:** Hỗ trợ đăng ký và gọi hàm OpenAPI Schema một cách tự nhiên mà không cần parse chuỗi văn bản thủ công rủi ro.

---

## II. PHÂN TÍCH ƯU ĐIỂM & NHƯỢC ĐIỂM CỦA HỆ THỐNG HIỆN TẠI

### 1. Ưu điểm nổi bật:
* **Hòa quyện Lexical và Semantic Search (Hybrid RAG):** Sự kết hợp giữa `tsvector` FTS (bắt từ khóa cứng như "OT", "MFA") và `pgvector` (hiểu từ đồng nghĩa ngữ nghĩa) cùng thuật toán trộn RRF tạo ra một hệ thống tìm kiếm vô cùng chính xác, không bỏ sót tài liệu.
* **Cơ chế Điều chỉnh Nhiệt độ Động (Dynamic Temperature Scaling):**
  * Đặt `temperature = 0.15` cho các câu hỏi HR để ép mô hình trả lời chính xác, trích dẫn chuẩn hóa không sai lệch.
  * Đặt `temperature = 0.7` cho các câu hỏi kiến thức mở để hành văn bay bổng, sinh động, tự nhiên.
* **Hàng rào Bảo vệ Đa lớp (Robust Guardrails):**
  * Chặn XSS/SQL Injection (`sanitizeInput`).
  * Khóa chặt tài liệu mật đối với nhân viên thường thông qua bộ lọc SQL quyền hạn tự động (`is_private = false`).
  * Chặn đứng câu hỏi lạc đề hay prompt injection ngay từ cổng ngõ mà không tốn tài nguyên gọi mô hình RAG đắt tiền.

### 2. Nhược điểm cần cải tiến:
* **Nút thắt cổ chai CPU khi Rerank:** Khi số lượng tài liệu tăng lên hàng vạn mảnh, việc chạy mô hình Cross-Encoder ONNX trên CPU có thể bị quá tải và tăng độ trễ (Latency).
* **Thiếu cơ chế Tự đánh giá Đáp án (Response Grader):** Hệ thống sinh câu trả lời và stream ngay về cho người dùng, chưa có bước thẩm định tự động xem đáp án sinh ra có bị ảo tưởng (hallucination) so với tài liệu gốc hay không.

---

## III. TẠI SAO CHÚNG TÔI TỰ XÂY DỰNG AGENT THUẦN (PURE AGENT)?
*(So sánh chi tiết với LangChain / LangGraph)*

Trong quá trình thiết kế hệ thống, chúng tôi đã chủ động từ chối sử dụng các thư viện cồng kềnh như LangChain hay LangGraph để tự tay xây dựng bộ điều phối Agentic ReAct thuần túy (`orchestrator.ts`). Dưới đây là lý do:

| Tiêu chí so sánh | Sử dụng LangChain / LangGraph | Tự xây dựng Agent thuần (Pure Agent - Dự án của bạn) |
| :--- | :--- | :--- |
| **Độ phức tạp mã nguồn** | **Cực cao.** Phải học cú pháp độc quyền, liên tục thay đổi qua các phiên bản (breaking changes). | **Cực thấp.** Chỉ sử dụng các cấu trúc lập trình cơ bản của TypeScript (vòng lặp `while`, câu lệnh `if-else`). |
| **Khả năng kiểm soát (Control)** | **Thấp.** Rất khó can thiệp sâu vào cách Prompt được sinh ra, các lớp trừu tượng (Abstraction Layers) che giấu quá nhiều chi tiết dưới nền. | **Tuyệt đối.** Lập trình viên kiểm soát từng dòng chữ trong bối cảnh, từng token lịch sử gửi đi và cấu trúc của từng công cụ. |
| **Hiệu năng & Kích thước** | **Nặng nề.** Kéo theo hàng trăm dependencies thừa làm tăng dung lượng bundle và làm chậm thời gian khởi động Server. | **Siêu nhẹ.** Zero-dependency ngoài SDK chuẩn của Google GenAI. Thời gian khởi chạy máy chủ chưa đầy 1 giây. |
| **Độ trễ (Latency)** | **Cao.** Việc chia nhỏ thành các Node đồ thị buộc phải gọi API LLM liên tục nhiều lần một cách cứng nhắc. | **Tối ưu.** Tận dụng khả năng suy luận tự nhiên của 1 mô hình duy nhất trong chuỗi ReAct, gom nhiều lượt gọi công cụ vào 1 bước. |
| **Tính an toàn biên dịch** | Khó bảo trì kiểu dữ liệu tĩnh do các lớp trừu tượng của LangChain che giấu kiểu thực tế. | Tận dụng sức mạnh tối đa của TypeScript, đảm bảo an toàn kiểu (Type-safe) từ bộ gán dữ liệu đến SDK. |

### Kết luận kiến trúc:
Việc tự xây dựng Agent thuần túy giúp dự án **HR-RAG System** đạt được hiệu năng tối đa, dễ dàng gộp và tối ưu hóa các bước suy luận, đồng thời cho phép hệ thống chạy mượt mà trên các tài nguyên phần cứng thông thường của doanh nghiệp mà không phụ thuộc vào bất kỳ nhà cung cấp dịch vụ hay thư viện trung gian nào!
