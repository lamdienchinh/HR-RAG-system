# Tài Liệu Hệ Thống HR-RAG System

Chào mừng bạn đến với thư mục tài liệu chính thức của hệ thống **HR-RAG System** (Hệ thống Hỏi đáp Chính sách Nhân sự thông minh dựa trên Agentic RAG). 

Thư mục này chứa toàn bộ các tài liệu phân tích kỹ thuật sâu sắc, hướng dẫn kiến trúc, các quyết định công nghệ và tài liệu chuẩn bị cho buổi hội thảo (seminar) về chủ đề RAG.

## 📚 Danh Mục Tài Liệu

### 1. [Kiến Trúc Hệ Thống (ARCHITECTURE.md)](./ARCHITECTURE.md)
* Phân tích luồng dữ liệu chi tiết của Frontend (FE) và Backend (BE).
* Sơ đồ chi tiết của bộ điều phối Agentic ReAct Loop.
* Cơ chế tìm kiếm lai (Hybrid Search) kết hợp Full-Text Search (FTS) và Vector Search.
* Cơ chế xếp hạng lại bằng Cross-Encoder (Reranker).

### 2. [Quyết Định Công Nghệ & So Sánh (TECH_STACK.md)](./TECH_STACK.md)
* Danh sách các công nghệ sử dụng trong dự án và lý do lựa chọn.
* Đánh giá chi tiết Ưu điểm & Nhược điểm của hệ thống hiện tại.
* So sánh chi tiết giữa việc tự xây dựng Agent thuần (Pure Agent) với các khung kéo thả/pipeline (như LangChain, LangGraph).

### 3. [Định Hướng Phát Triển Tương Lai (FUTURE_DIRECTIONS.md)](./FUTURE_DIRECTIONS.md)
* Phân tích các kỹ thuật cải tiến hệ thống Advanced RAG nâng cao.
* Hướng dẫn tích hợp Self-RAG (Response Grader / Thẩm định câu trả lời).
* Kiến trúc Parent-Child Retrieval (Truy xuất Cha-Con).
* Phương án mở rộng Tìm kiếm thưa nâng cao qua SPLADE (Document Expansion) hoặc BM25 (ParadeDB).

### 4. [Tài Liệu Hội Thảo & 20 Câu Hỏi QA (SEMINAR_QA.md)](./SEMINAR_QA.md)
* Tổng hợp 20 câu hỏi kỹ thuật chuyên sâu xoay quanh chủ đề RAG và kiến trúc dự án thực tế.
* Các câu trả lời chuẩn mực, lập luận toán học/kiến trúc chặt chẽ kèm dẫn chứng (citations) trực tiếp từ mã nguồn hệ thống.

---

## 🛠️ Cách Khởi Chạy Nhanh Cho Lập Trình Viên

Mọi công cụ hỗ trợ phát triển và dọn dẹp mã nguồn đều được tối ưu hóa bằng các ngôn ngữ hiệu năng cao (Rust, Go/TypeScript):

* **Định dạng code:**
  ```bash
  pnpm demo:fmt
  ```
* **Quét lỗi & Dọn dẹp code thừa (linter):**
  ```bash
  pnpm demo:lint
  ```
* **Tự động vá lỗi lint nhanh:**
  ```bash
  pnpm demo:lint:fix
  ```
* **Khởi chạy máy chủ phát triển (Dev Server):**
  ```bash
  pnpm demo:run
  ```
