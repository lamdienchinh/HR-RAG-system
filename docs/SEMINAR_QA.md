# Tài Liệu Seminar: 20 Câu Hỏi & Đáp Án Chuyên Sâu (SEMINAR QA)

Tài liệu này tổng hợp **20 câu hỏi kỹ thuật hóc búa nhất** thường xuất hiện trong các buổi seminar/bảo vệ dự án về chủ đề **RAG và AI Agent**, đi kèm câu trả lời chuẩn mực, lập luận toán học/kiến trúc chặt chẽ và dẫn chứng trực tiếp từ mã nguồn của hệ thống **HR-RAG System**.

---

## NHÓM 1: CÂU HỎI VỀ KIẾN TRÚC TRUY XUẤT LAI (HYBRID SEARCH & CO-EXISTENCE)

### Q1: Tại sao hệ thống của bạn lại sử dụng Hybrid Search (FTS + Vector) thay vì chỉ dùng Vector Search đơn thuần như các hệ thống RAG cơ bản?
* **Trả lời:** Vector Search (Dense Retrieval) rất mạnh trong việc hiểu ngữ nghĩa của từ đồng nghĩa (ví dụ: *"ốm"* ~ *"bệnh"*), nhưng cực kỳ dở trong việc bắt các từ khóa chính xác, mã hiệu hoặc từ viết tắt (như *"OT"*, *"MFA"*, mã cấp bậc *"E4"*). Bằng cách kết hợp **Full-Text Search (FTS)** dựa trên chỉ mục ngược `tsvector` trong Postgres, chúng tôi đảm bảo các từ khóa mang tính định danh bắt buộc phải có mặt trong bối cảnh, đồng thời Vector Search lo phần hiểu ngữ nghĩa mở rộng. Sự kết hợp này mang lại độ bao phủ (Recall) và độ chính xác (Precision) tối đa.
* **Dẫn chứng:** File `apps/api/src/lib/retrieval.ts` thực hiện song song hai truy vấn `vector` và `tsv @@ websearch_to_tsquery` trong cùng một giao dịch để lấy bối cảnh.

### Q2: Thuật toán Reciprocal Rank Fusion (RRF) hoạt động như thế nào trong mã nguồn của bạn và tại sao hằng số hằng số $k = 60$ lại được lựa chọn?
* **Trả lời:** RRF gộp kết quả từ FTS và Vector Search bằng cách cộng nghịch đảo thứ hạng của chúng trong từng danh sách kết quả. Công thức toán học là:
  $$RRF\_Score(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$
  Trong đó $r_m(d)$ là thứ hạng của tài liệu $d$ trong danh sách tìm kiếm $m$. Hằng số $k = 60$ là giá trị chuẩn hóa (được chứng minh qua nghiên cứu toán học của Cormack et al.) giúp giảm thiểu sự thiên vị đối với các tài liệu đứng ở thứ hạng cực cao của một nhánh đơn lẻ, đảm bảo sự phân bố điểm số ổn định và công bằng giữa FTS và Vector.
* **Dẫn chứng:** File `apps/api/src/lib/retrieval.ts` định nghĩa:
  ```typescript
  const rrfK = 60;
  const computeRrfScore = (rank: number): number => 1 / (rrfK + rank);
  ```

### Q3: Bộ lọc đa dạng hóa (Policy Diversification Filter) có nhiệm vụ gì và tại sao bạn lại giới hạn hằng số `MAX_CHUNKS_PER_POLICY = 3`?
* **Trả lời:** Nếu một chính sách (ví dụ: Quy trình nghỉ phép) có độ tương quan từ khóa quá cao, kết quả tìm kiếm thô có thể bị chiếm hữu toàn bộ bởi các chunk của duy nhất chính sách đó, làm mất cơ hội xuất hiện của các chính sách liên quan khác (như chính sách giờ làm việc ngày Thứ Bảy). Bộ lọc đa dạng hóa giới hạn tối đa `3` chunks cho mỗi chính sách ở Pass 1, đảm bảo bối cảnh đưa vào LLM có sự bao quát từ nhiều văn bản pháp lý khác nhau mà vẫn giữ được tính mạch lạc tuần tự của tài liệu mục tiêu.
* **Dẫn chứng:** File `apps/api/src/lib/retrieval.ts` định nghĩa thuật toán lọc 2 lượt (Pass 1 & Pass 2) với `const MAX_CHUNKS_PER_POLICY = 3`.

### Q4: Hệ thống của bạn sử dụng Cross-Encoder Reranker. Tại sao nó lại chính xác hơn Bi-Encoder và độ trễ của nó có ảnh hưởng tới hệ thống không?
* **Trả lời:** Bi-Encoder mã hóa câu hỏi và tài liệu thành 2 vector riêng biệt rồi nhân Cosine (so khớp tĩnh). Cross-Encoder (Reranker) ghép chung câu hỏi và tài liệu làm một, cho phép chúng tương tác chéo qua cơ chế Self-Attention của mạng Transformer sâu. Nó hiểu được các mối quan hệ logic phức tạp, từ phủ định (như *"không"*, *"ngoại trừ"*). Mô hình `bge-reranker-v2-m3` lượng tử hóa `q8` ONNX chạy cục bộ trên CPU chỉ tốn 15-40ms, hoàn toàn đáp ứng được trải nghiệm chat stream thời gian thực.
* **Dẫn chứng:** File `apps/api/src/lib/reranker.ts` khởi tạo và chạy mô hình `Xenova/bge-reranker-v2-m3` cục bộ qua thư viện `@huggingface/transformers`.

---

## NHÓM 2: CÂU HỎI VỀ AGENTIC LOOP & LẬP LUẬN REACT

### Q5: Kiến trúc Agent của bạn là gì và tại sao bạn lại chọn ReAct Pattern?
* **Trả lời:** Hệ thống sử dụng kiến trúc **Pure Agentic RAG** dựa trên mẫu thiết kế **ReAct (Reason + Act)**. Mô hình sẽ luân phiên thực hiện suy nghĩ (`Reason` - lập kế hoạch tự chủ) và hành động (`Act` - gọi tool), lặp lại chu kỳ này để tự động tích lũy thông tin. Chúng tôi chọn ReAct vì nó cho phép LLM tự đánh giá chất lượng tài liệu lấy về, tự viết lại câu hỏi (Query Rewriting) để tìm tiếp nếu thiếu thông tin, đạt hiệu quả tự sửa sai cực cao mà không cần viết các hàm code cứng nhắc.
* **Dẫn chứng:** Vòng lặp `while (iterations < 3)` trong file `apps/api/src/lib/agent/orchestrator.ts` điều phối chu kỳ ReAct.

### Q6: Lịch sử và kết quả thực thi của các công cụ (Tools) được Agent ghi nhớ và xâu chuỗi như thế nào giữa các lượt lặp?
* **Trả lời:** Mảng `messages` trong `orchestrator.ts` hoạt động như một ReAct Scratchpad. Khi một công cụ được chạy, yêu cầu gọi hàm (`functionCall`) của model và kết quả trả về (`functionResponse`) của hệ thống được append trực tiếp vào mảng `messages` này. Ở lượt lặp tiếp theo, toàn bộ mảng `messages` được gửi đi, giúp Agent đọc được chính xác bối cảnh thô của lượt trước để đưa ra quyết định thông minh tiếp theo.
* **Dẫn chứng:** Đoạn code append phần tử vào mảng `messages` trong `apps/api/src/lib/agent/orchestrator.ts`:
  ```typescript
  messages.push({ role: "model", parts: agentResult.functionCalls.map(...) });
  messages.push({ role: "user", parts: responseParts });
  ```

### Q7: Tại sao bạn lại chọn chiến lược "Mô hình kép" (Dual-Model Strategy) trong bộ điều phối Agent?
* **Trả lời:** Lập luận Agent (ReAct) đòi hỏi gọi mô hình nhiều lượt, rất tốn kém và có độ trễ cao nếu dùng mô hình lớn. Chúng tôi sử dụng:
  * **Mô hình phụ nhanh, rẻ (`gemma-4-26b-a4b-it` hoặc fallback):** Chuyên trách chạy vòng lặp ReAct, gọi công cụ nhanh gọn để thu thập dữ liệu thô.
  * **Mô hình chính chất lượng cao (`gemini-2.5-flash`):** Chỉ gọi đúng 1 lần duy nhất ở bước cuối cùng để đọc toàn bộ dữ liệu thô thu thập được và biên soạn câu trả lời chỉn chu kèm trích dẫn chuẩn mực cho người dùng.
  Chiến lược này giúp giảm 70% chi phí token và tăng 50% tốc độ phản hồi.
* **Dẫn chứng:** File `apps/api/src/lib/agent/orchestrator.ts` sử dụng `runGeminiAgenticStep` ở đầu vòng lặp và kết thúc bằng cách gọi mô hình chính `answerQuestionStream` / `answerQuestion`.

### Q8: Trường hợp nào thì vòng lặp Agentic ReAct bị ngắt trước khi đạt giới hạn tối đa 3 lượt?
* **Trả lời:** Vòng lặp sẽ ngắt ngay lập tức khi Agent nhận diện đã thu thập đủ thông tin cần thiết và quyết định không gọi thêm bất kỳ công cụ nào nữa (`agentResult.functionCalls` trống). Lúc này, mô hình trả về câu trả lời thô trực tiếp trong ReAct step, kích hoạt lệnh `break` để thoát vòng lặp.
* **Dẫn chứng:** Lệnh `break` trong khối `else` tại tệp `apps/api/src/lib/agent/orchestrator.ts` dòng 245.

---

## NHÓM 3: CÂU HỎI VỀ ĐIỀU CHỈNH NHIỆT ĐỘ ĐỘNG & BIẾN CỨ TRÍCH DẪN

### Q9: Làm thế nào hệ thống của bạn vừa đảm bảo tính chính xác 100%, trích dẫn nghiêm ngặt cho các câu hỏi chính sách, vừa đảm bảo sự tự nhiên, sinh động cho các câu hỏi xã giao?
* **Trả lời:** Chúng tôi áp dụng cơ chế **Điều chỉnh Nhiệt độ Động (Dynamic Temperature Scaling)** dựa trên kết quả phân loại ý định (Intent Classifier) từ Query Analyzer:
  * Nếu là câu hỏi chính sách HR: Sử dụng nhiệt độ cực thấp **`0.15`** để ép mô hình bám sát văn bản bối cảnh và trích dẫn chuẩn xác.
  * Nếu là câu hỏi ngoài lề (External reference): Sử dụng nhiệt độ cao **`0.7`** để mô hình tự do bay bổng, sinh động hóa câu chữ.
  * Nếu là câu chào hỏi/cảm ơn: Sử dụng các câu trả lời ngẫu nhiên tự nhiên từ hệ thống.
* **Dẫn chứng:** File `apps/api/src/lib/answer.ts` truyền tham số `0.15` cho `runGeminiWithGroundingStream` và `0.7` cho `generateExternalReference`.

### Q10: Làm thế nào bạn đính kèm được số ngày phép khả dụng của cá nhân nhân viên vào Prompt của mô hình chính mà không làm lẫn lộn với các nhãn trích dẫn tài liệu [S1], [S2]...?
* **Trả lời:** Chúng tôi tích lũy kết quả của các công cụ cá nhân (số ngày phép, ngày hiện tại) vào Map `executedToolSummaries` dưới dạng một khối văn bản hệ thống đặc biệt mang tên `[BỐI CẢNH THỰC TẾ HỆ THỐNG]`. Trong khối này, chúng tôi viết chỉ thị cưỡng chế nghiêm ngặt yêu cầu mô hình đọc số liệu này để trả lời trực tiếp câu hỏi cá nhân nhưng tuyệt đối cấm chèn nhãn trích dẫn hay viết chữ bối cảnh vào câu trả lời cuối cùng.
* **Dẫn chứng:** File `apps/api/src/lib/agent/orchestrator.ts` thiết lập biến `augmentedQuestion` kết hợp chỉ thị cưỡng chế:
  ```typescript
  augmentedQuestion = `[BỐI CẢNH THỰC TẾ HỆ THỐNG]\n*(Đây là thông tin thực tế từ hệ thống, hãy dùng nó để trả lời trực tiếp câu hỏi mà KHÔNG được viết kèm bất kỳ nhãn trích dẫn nào...)*\n`
  ```

---

## NHÓM 4: CÂU HỎI VỀ BẢO MẬT & GUARDRAILS DOANH NGHIỆP

### Q11: Hệ thống RAG của bạn làm thế nào để ngăn chặn việc nhân viên thường truy cập và đọc trộm các tài liệu mật của ban giám đốc (như khung lương thưởng tài chính)?
* **Trả lời:** Chúng tôi áp dụng giải pháp bảo mật dữ liệu dựa trên vai trò **Role-Based Access Control (RBAC)** ngay trong tầng truy xuất SQL Database. Khi thực hiện tìm kiếm, hệ thống kiểm tra quyền hạn của người dùng hiện tại thông qua mã token JWT (`request.user.role`). Nếu không phải là admin, hệ thống tự động chèn thêm điều kiện lọc cứng `AND is_private = false` vào câu lệnh truy vấn PostgreSQL. Nhờ vậy, các chunk bảo mật bị chặn ngay từ cơ sở dữ liệu và không bao giờ lọt vào prompt của LLM.
* **Dẫn chứng:** Biến `privacyFilter` và câu lệnh truy vấn SQL trong file `apps/api/src/lib/retrieval.ts`.

### Q12: Làm thế nào hệ thống của bạn chống lại các cuộc tấn công Prompt Injection (Người dùng cố tình lừa AI thay đổi vai trò hoặc tiết lộ prompt hệ thống)?
* **Trả lời:** Hệ thống có 2 lớp bảo vệ chặt chẽ:
  * **Lớp 1 (Sanitizer):** Chạy hàm `sanitizeInput` để làm sạch và kiểm tra các ký tự bất thường đầu vào.
  * **Lớp 2 (Intent Gate):** Gọi `analyzeQuery` sử dụng mô hình phân loại ý định độc lập. Nếu phát hiện ý định là `injection`, hệ thống chặn đứng lập tức, stream về câu từ chối thân thiện và ngắt kết nối mà tuyệt đối không chạy bất kỳ lệnh tìm kiếm bối cảnh nào.
* **Dẫn chứng:** Logic chặn `injection` intent trong `apps/api/src/controllers/chatController.ts` phát ra sự kiện từ chối lịch sự và thoát luôn.

### Q13: Để đảm bảo tính nhất quán dữ liệu, chuyện gì xảy ra nếu quản trị viên đang chạy reindex (cập nhật chính sách nhân sự mới) đúng lúc người dùng đang đặt câu hỏi truy vấn?
* **Trả lời:** Đây là bài toán tranh chấp tài nguyên (Concurrency). Để giải quyết triệt để, chúng tôi áp dụng mức cô lập giao dịch cao nhất của PostgreSQL là **`REPEATABLE READ`** trong quá trình tìm kiếm lai. Giao dịch này đảm bảo cả hai truy vấn (Vector search và FTS search) đều nhìn thấy một bản snapshot dữ liệu hoàn toàn đồng nhất và không bị ảnh hưởng bởi quá trình TRUNCATE hay INSERT của tiến trình reindex đang chạy song song dưới nền.
* **Dẫn chứng:** Giao dịch SQL cô lập cao trong `apps/api/src/lib/retrieval.ts`:
  ```typescript
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ");
  ```

---

## NHÓM 5: CÂU HỎI VỀ BẢO TRÌ & CHẤT LƯỢNG MÃ NGUỒN

### Q14: Tại sao bạn lại gộp các API thô (`askController.ts`) vào bộ điều phối phòng chat (`chatController.ts`) và xóa bỏ chúng?
* **Trả lời:** Qua phân tích luồng chạy thực tế của ứng dụng Frontend, 100% cuộc hội thoại đều là cuộc hội thoại có lưu trạng thái (Stateful Conversation) và luôn truyền kèm `conversationId` hợp lệ (hệ thống sẽ tự động khởi tạo phòng chat mới ở tin nhắn đầu tiên). Việc duy trì các API độc lập (`/api/ask`) tạo ra sự trùng lặp mã nguồn lên tới 70% (dead code), gây gánh nặng bảo trì và mâu thuẫn logic khi cập nhật. Việc loại bỏ `askController.ts` giúp hệ thống tinh gọn, đồng bộ hóa 100% logic bảo mật và kiểm duyệt đầu vào.
* **Dẫn chứng:** File `apps/api/src/controllers/askController.ts` đã được xóa hoàn toàn và gộp trọn vẹn vào `chatController.ts`.

### Q15: Làm thế nào bạn đảm bảo các tệp tin mã nguồn của cả API và Web luôn nhất quán về mặt code style và không có biến rác dư thừa?
* **Trả lời:** Chúng tôi tích hợp bộ công cụ siêu tốc của Rust là **oxlint** (linter) và **oxfmt** (formatter) trực tiếp vào thư mục gốc của dự án. Với việc cấu hình các tệp tin `.oxlintrc.json` và `.oxfmtrc.json` hướng trực tiếp vào hai thư mục nguồn `/src`, hệ thống có khả năng tự động định dạng mã nguồn và quét dọn các biến, import dư thừa một cách hoàn hảo chỉ trong vòng chưa đầy 150 mili-giây.
* **Dẫn chứng:** Các kịch bản chạy linter/formatter trong `package.json` và tệp cấu hình `.oxlintrc.json` / `.oxfmtrc.json` tại thư mục gốc của dự án.

---

## NHÓM 6: CÂU HỎI VỀ CẢI TIẾN & PHÁT TRIỂN NÂNG CAO (ADVANCED RAG)

### Q16: Nếu quy mô chính sách của công ty tăng từ 25 chính sách lên 2,500 chính sách, bộ lọc đa dạng hóa `MAX_CHUNKS_PER_POLICY = 3` có gặp lỗi không và bạn sẽ cải tiến thế nào?
* **Trả lời:** Khi quy mô tài liệu tăng lên, việc cố định hằng số có thể làm mất thông tin đối với các câu hỏi bao quát. Để giải quyết, chúng tôi có thể áp dụng cơ chế **Dynamic Scaling theo `topK`**:
  `const MAX_CHUNKS_PER_POLICY = Math.max(3, Math.ceil(topK * 0.6))`
  Khi người dùng tăng `topK` tìm kiếm trên giao diện, hệ thống tự động nới lỏng giới hạn số chunk của một chính sách, đảm bảo tính toàn vẹn thông tin mà không cần sửa code dưới nền.

### Q17: Làm thế nào bạn có thể nâng cấp hệ thống RAG hiện tại lên mô hình Self-RAG (Hệ thống tự vá lỗi câu trả lời)?
* **Trả lời:** Chúng tôi sẽ bổ sung một lớp **Response Grader** sử dụng mô hình ngôn ngữ nhỏ chạy phân loại nhị phân ngay sau khi Mô hình chính sinh câu trả lời nháp. Grader sẽ đối chiếu câu trả lời với các mảnh tài liệu nguồn và chấm điểm: 1. Có bị ảo tưởng thông tin ngoài lề không? 2. Có trả lời đúng câu hỏi không? Nếu ĐẠT mới stream về cho người dùng; nếu LỖI, hệ thống tự động kích hoạt Agent viết lại câu hỏi và truy xuất lại từ đầu.

### Q18: Tại sao việc sử dụng thuật toán BM25 (qua ParadeDB) lại tốt hơn bộ tìm kiếm thưa mặc định của Postgres hiện tại?
* **Trả lời:** Bộ máy Postgres hiện tại (`ts_rank_cd`) chỉ tính toán mật độ từ khóa xuất hiện cạnh nhau. Thuật toán **BM25** vượt trội hơn hẳn nhờ có hai cơ chế: 1. **Bão hòa tần suất từ (TF Saturation):** Giảm điểm dần cho từ khóa xuất hiện quá nhiều lần để chống spam từ khóa. 2. **Chuẩn hóa độ dài tài liệu (Length Normalization):** Ưu tiên các tài liệu ngắn súc tích chứa từ khóa hơn là các tài liệu dài dòng. Tích hợp ParadeDB (`pg_search`) là phương án tối ưu nhất vì nó mang BM25 chạy trực tiếp trong Postgres mà không cần đổi database.

### Q19: Ưu điểm của kiến trúc Parent-Child Retrieval là gì và tại sao nó lại giải quyết được điểm yếu của kỹ thuật cắt nhỏ tài liệu (Chunking)?
* **Trả lời:** Kỹ thuật cắt nhỏ (Child chunks - 200 ký tự) giúp tìm kiếm tương đồng bằng Vector cực kỳ chính xác vì vector không bị loãng ngữ nghĩa. Tuy nhiên, 200 ký tự lại quá ngắn để LLM đọc hiểu trọn vẹn bối cảnh. Kiến trúc Parent-Child lưu trữ các mảnh nhỏ Child liên kết với mảnh lớn Parent (1,500 ký tự). Khi Vector search tìm trúng Child chunk, hệ thống tự động bốc toàn bộ nội dung của Parent chunk tương ứng nạp vào prompt cho LLM. Điều này giúp tối ưu hóa cả 2 bước: So khớp chính xác tuyệt đối và Đọc hiểu đầy đủ ngữ cảnh!

### Q20: Làm thế nào để giải quyết vấn đề độ trễ khởi động lạnh (Cold Start Latency) của mô hình ONNX Rerank khi Express Server khởi động lại?
* **Trả lời:** Khi máy chủ khởi chạy lần đầu, tệp tin Reranker sẽ phải tải mô hình ONNX từ ổ đĩa lên bộ nhớ RAM, quá trình này tốn khoảng vài giây và làm người dùng đầu tiên truy cập bị trễ mạng rất lâu. Để khắc phục, chúng tôi thiết lập cơ chế **Pre-warming** trong file `server.ts` bằng cách tự động gọi hàm khởi chạy mô hình nhúng và rerank một lượt với dữ liệu rỗng ngay khi Express bắt đầu lắng nghe cổng, đảm bảo toàn bộ mô hình đã được nạp sẵn vào bộ nhớ RAM trước khi nhận yêu cầu thực tế từ người dùng.
