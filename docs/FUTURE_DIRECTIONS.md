# Định Hướng Phát Triển Tương Lai (FUTURE DIRECTIONS)

Tài liệu này vạch ra các bản thiết kế kỹ thuật cụ thể để nâng cấp hệ thống **HR-RAG System** hiện tại từ cấp độ **Agentic RAG nâng cao** lên cấp độ **Production-Grade Self-Corrective RAG (Hệ thống RAG tự sửa sai doanh nghiệp)**.

---

## 1. TRIỂN KHAI BỘ CHẤM ĐIỂM ĐÁP ÁN (RESPONSE GRADER / SELF-RAG)

### Thách thức hiện tại:
Hệ thống hiện tại tạo ra câu trả lời dựa trên bối cảnh bốc ra và trả về ngay lập tức cho người dùng, thiếu bước thẩm định chất lượng để chống ảo tưởng (Hallucination) hoặc trả lời lạc đề.

### Giải pháp thiết kế:
Bổ sung một lớp thẩm định tự động (Response Grader Node) chạy trực tiếp sau khi Mô hình chính sinh xong câu trả lời nháp (Draft Answer), hoạt động theo sơ đồ khép kín:

```
    [ Sinh câu trả lời nháp ] ──> [ LLM Response Grader (YES/NO) ]
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               ▼ (Chấm điểm: ĐẠT - YES)                                  ▼ (Chấm điểm: LỖI - NO)
        [ Stream về cho User ]                                   [ Tự động sửa lại ]
                                                                 - Chạy lại ReAct Loop hoặc
                                                                 - Tự Rewrite Query tìm lại
```

### Cách triển khai mã nguồn:
Sử dụng một mô hình ngôn ngữ nhỏ hơn để chạy phân loại nhị phân siêu tốc:
```typescript
// Ý tưởng triển khai trong apps/api/src/lib/agent/grader.ts

export const gradeResponse = async (
  question: string,
  answer: string,
  chunks: readonly RetrievedChunk[]
): Promise<boolean> => {
  const graderPrompt = `
    Nhiệm vụ: Hãy đóng vai trò là một Kiểm toán viên câu trả lời AI (RAG Auditor).
    
    TÀI LIỆU CHÍNH SÁCH:
    ${chunks.map((c, i) => `[S${i+1}] ${c.content}`).join("\n\n")}
    
    CÂU HỎI: "${question}"
    CÂU TRẢ LỜI CỦA AI: "${answer}"
    
    Hãy chấm điểm câu trả lời dựa trên quy tắc:
    1. Câu trả lời có chứa thông tin KHÔNG có trong tài liệu chính sách không? (Hallucination)
    2. Câu trả lời có trả lời đúng trọng tâm câu hỏi không? (Relevance)
    
    Trả về định dạng JSON duy nhất:
    { "isFactual": true/false, "isRelevant": true/false, "reason": "Lý do ngắn gọn" }
  `;
  
  // Gọi Gemini để chấm điểm nhanh
  ...
};
```

---

## 2. NÂNG CẤP KIẾN TRÚC TRUY XUẤT CHA - CON (PARENT-CHILD RETRIEVAL)

### Thách thức hiện tại:
Văn bản chính sách thường rất dài. Nếu cắt (chunking) quá nhỏ, mô hình sẽ bị mất ngữ cảnh xung quanh. Nếu cắt quá lớn, mô hình sẽ bị loãng bối cảnh, lãng phí token và ảnh hưởng tiêu cực tới độ chính xác của Vector.

### Giải pháp thiết kế:
Tách rời bối cảnh dùng để so khớp Vector với bối cảnh thực tế truyền vào cho LLM đọc:

* **Child Chunks (200 - 300 ký tự):** Cắt cực kỳ nhỏ và mịn để tối ưu hóa việc so khớp ngữ nghĩa dày bằng Vector search.
* **Parent Documents (1000 - 1500 ký tự):** Đoạn văn bản lớn chứa trọn vẹn ngữ cảnh xung quanh Child Chunks đó.

```
 Bảng document_chunks (DB)
 ┌────────────────────────────────────────────────────────┐
 │ [Parent Chunk #001] (1200 ký tự chứa toàn bộ quy trình)│
 │                                                        │
 │  ┌──────────────────────┐  ┌──────────────────────┐    │
 │  │ [Child Chunk #01]    │  │ [Child Chunk #02]    │    │
 │  │ (200 ký tự - Vector) │  │ (200 ký tự - Vector) │    │
 │  └──────────────────────┘  └──────────────────────┘    │
 └────────────────────────────────────────────────────────┘
```

### Cách hoạt động:
1. Tìm kiếm Vector tìm trúng mảnh nhỏ `Child Chunk #01`.
2. Hệ thống đọc ID liên kết và **tự động truy xuất ngược toàn bộ nội dung của `Parent Chunk #001`** từ database.
3. Đưa khối văn bản toàn vẹn `Parent Chunk #001` vào Prompt gửi cho Gemini.
4. Điều này giúp loại bỏ hoàn toàn hiện tượng mất ngữ cảnh khi phân mảnh tài liệu!

---

## 3. NÂNG CẤP SPARSE EMBEDDING QUA SPLADE HOẶC BM25 CHUYÊN DỤNG

### Thách thức hiện tại:
Bộ máy FTS mặc định của Postgres (`tsvector` kết hợp `ts_rank_cd`) chỉ dựa trên mật độ chữ viết chính xác, chưa xử lý tốt từ đồng nghĩa và thiếu cơ chế bão hòa từ cũng như chuẩn hóa độ dài tài liệu của BM25.

### Giải pháp thiết kế:

#### Phương án A: Tích hợp ParadeDB (`pg_search` extension)
* **Chi tiết:** Cài đặt extension ParadeDB trực tiếp vào PostgreSQL hiện tại.
* **Lợi ích:** Mang thuật toán BM25 chuẩn công nghiệp chạy trực tiếp trong Postgres thông qua chỉ mục `BM25 index` thay thế hoàn toàn cho `tsvector`. Câu lệnh truy vấn cực kỳ đơn giản và giữ nguyên kiến trúc 1 database duy nhất của Postgres.

#### Phương án B: Kỹ thuật Document Expansion bằng SPLADE
* **Chi tiết:** Khi chạy Reindex, văn bản được đưa qua mô hình học sâu **SPLADE (Sparse Lexical and Expansion)** cục bộ để tự động bổ sung thêm các từ đồng nghĩa vào cơ sở dữ liệu (ví dụ: văn bản *"chăm sóc sức khỏe"* $\rightarrow$ SPLADE tự động sinh và lưu thêm các từ *"bảo hiểm, y tế, bệnh viện, khám bệnh"* vào DB).
* **Lợi ích:** Bộ tìm kiếm FTS (`tsvector`) hiện tại của bạn sẽ tự động khớp được từ đồng nghĩa mà không cần sửa đổi bất kỳ câu lệnh SQL hay cấu trúc bảng dữ liệu nào dưới nền.

---

## 4. TỐI ƯU HÓA HIỆU NĂNG PHẦN CỨNG BẰNG GPU & PRE-WARMING

### Thách thức hiện tại:
Chạy suy luận nhúng (Embedding) và xếp hạng lại (Reranking) bằng ONNX trên CPU có thể bị nghẽn (bottleneck) khi khối lượng truy vấn tăng cao đột biến.

### Giải pháp thiết kế:
* **CUDA Execution Provider:** Cấu hình thư viện `@huggingface/transformers` sử dụng nhân CUDA để đẩy toàn bộ quá trình tính toán ma trận của Reranker (`Xenova/bge-reranker-v2-m3`) lên GPU Nvidia. Tốc độ sẽ tăng gấp **10-15 lần** (từ 40ms giảm xuống còn dưới 3ms).
* **Offline Pre-warming:** Tạo cơ chế khởi chạy trước và tải nóng (warm-up) toàn bộ các mô hình ONNX lên RAM ngay khi khởi động Server Express (trong tệp `server.ts`), tránh việc người dùng đầu tiên truy cập bị trễ mạng (Cold Start Latency).
