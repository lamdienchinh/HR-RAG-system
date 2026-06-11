import type { QuestionSpec, SeedPolicy } from "./types.js";
import { policiesEn, questionsEn } from "./seedData.en.js";

export type Locale = "vi" | "en";

const policiesVi: readonly SeedPolicy[] = [
  {
    id: "time-off-policy",
    title: "Chính Sách Nghỉ Phép",
    category: "time-off",
    version: "2026.1",
    status: "current",
    sensitivity: "internal",
    content: `# Chính Sách Nghỉ Phép

Nhân viên chính thức được hưởng 18 ngày phép năm có lương mỗi năm dương lịch. Nhân viên thử việc được hưởng số ngày phép tỷ lệ theo số tháng còn lại trong năm.

Nhân viên có thể chuyển tối đa 5 ngày phép chưa sử dụng sang năm tiếp theo. Số ngày phép chuyển sẽ hết hạn vào ngày 31 tháng 3 trừ khi Phòng Nhân sự cấp ngoại lệ vì lý do công việc trọng yếu.

Yêu cầu nghỉ phép từ 3 ngày làm việc liên tiếp trở xuống cần được quản lý phê duyệt trước ít nhất 3 ngày làm việc. Yêu cầu nghỉ phép trên 3 ngày làm việc liên tiếp cần báo trước 10 ngày làm việc.

Nghỉ phép không lương có thể được xem xét theo từng trường hợp, yêu cầu phê duyệt từ quản lý trực tiếp và HRBP. Thời gian nghỉ phép không lương không được vượt quá 30 ngày dương lịch trong một năm.`,
  },
  {
    id: "overtime-policy",
    title: "Chính Sách Làm Thêm Giờ",
    category: "overtime",
    version: "2026.1",
    status: "current",
    sensitivity: "internal",
    content: `# Chính Sách Làm Thêm Giờ

Làm thêm giờ phải được quản lý trực tiếp phê duyệt trước khi bắt đầu. Làm thêm giờ chưa được phê duyệt sẽ không được hoàn trả trừ khi Phòng Nhân sự cấp ngoại lệ cho sự cố production đã được ghi nhận.

Làm thêm giờ ngày thường được trả 1.5 lần mức lương giờ tương đương. Làm việc ngày Thứ Bảy hoặc Chủ Nhật được tính là làm thêm giờ cuối tuần. Làm thêm giờ cuối tuần được trả 2.0 lần mức lương giờ tương đương khi đã được phê duyệt trước.

Làm thêm giờ cuối tuần liên quan đến sự cố production Severity 1 có thể được phê duyệt bổ sung trong vòng 24 giờ nếu incident commander thêm nhân viên vào bản ghi sự cố và quản lý xác nhận số giờ.

Nhân viên phải nộp yêu cầu thanh toán làm thêm giờ trong vòng 5 ngày làm việc kèm mã phê duyệt, ngày, giờ bắt đầu, giờ kết thúc và mã sự cố hoặc dự án.`,
  },
  {
    id: "leave-of-absence",
    title: "Chính Sách Nghỉ Vắng Mặt",
    category: "leave",
    version: "2026.1",
    status: "current",
    sensitivity: "internal",
    content: `# Chính Sách Nghỉ Vắng Mặt

Nhân viên được sử dụng tối đa 10 ngày nghỉ ốm có lương mỗi năm. Nghỉ ốm 3 ngày có thể được ghi nhận là nghỉ ốm và chỉ yêu cầu giấy xác nhận y tế khi nghỉ vượt quá 3 ngày làm việc liên tiếp.

Nghỉ thai sản cung cấp 16 tuần có lương cho người chăm sóc chính và 4 tuần có lương cho người chăm sóc phụ. Yêu cầu nên được nộp trước ít nhất 30 ngày dương lịch trước ngày dự kiến bắt đầu khi có thể.`,
  },
  {
    id: "remote-work-policy",
    title: "Chính Sách Làm Việc Từ Xa",
    category: "remote-work",
    version: "2026.1",
    status: "current",
    sensitivity: "internal",
    content: `# Chính Sách Làm Việc Từ Xa

Nhân viên có thể làm việc từ xa tối đa 3 ngày mỗi tuần với sự phê duyệt của quản lý.

Làm việc từ xa ở nước ngoài yêu cầu phê duyệt từ quản lý, HRBP và Phòng Pháp chế trước ít nhất 15 ngày làm việc trước khi đi. Phê duyệt phụ thuộc vào các ràng buộc về bảng lương, thuế, kiểm soát xuất khẩu và xử lý dữ liệu khách hàng.`,
  },
  {
    id: "expense-policy",
    title: "Chính Sách Chi Phí và Công Tác",
    category: "expense",
    version: "2026.1",
    status: "current",
    sensitivity: "internal",
    content: `# Chính Sách Chi Phí và Công Tác

Nhân viên phải nộp yêu cầu hoàn trả chi phí trong vòng 30 ngày dương lịch kể từ ngày giao dịch. Hóa đơn bắt buộc với các khoản chi trên 500.000 VNĐ hoặc tương đương.

Công tác nội địa yêu cầu phê duyệt của quản lý trước khi đặt vé. Công tác quốc tế yêu cầu phê duyệt của quản lý và Phòng Tài chính trước khi đặt vé.

Chi phí tiếp khách trên 3.000.000 VNĐ yêu cầu phê duyệt từ trưởng phòng và phải ghi rõ mục đích kinh doanh trong báo cáo chi phí.`,
  },
  {
    id: "compensation-policy",
    title: "Chính Sách Lương và Cấp Bậc",
    category: "compensation",
    version: "2026.1",
    status: "current",
    sensitivity: "confidential",
    content: `# Chính Sách Lương và Cấp Bậc

Khung lương là tài liệu mật nội bộ. Senior Backend Engineer thuộc cấp bậc E4. Khung lương cơ bản E4 là 72.000 USD đến 105.000 USD hàng năm, điều chỉnh theo vùng thị trường quốc gia.

Thăng tiến từ E4 lên E5 yêu cầu phạm vi công việc trải rộng ít nhất hai nhóm, khả năng lãnh đạo kỹ thuật nhất quán, và phê duyệt hiệu chuẩn từ lãnh đạo Engineering và HRBP.

Ngoại lệ lương vượt mức trung vị khung yêu cầu phê duyệt từ VP phòng ban, HRBP và Compensation Partner.`,
  },
  {
    id: "equipment-policy",
    title: "Chính Sách Thiết Bị và Tài Sản",
    category: "equipment",
    version: "2026.1",
    status: "current",
    sensitivity: "internal",
    content: `# Chính Sách Thiết Bị và Tài Sản

Nhân viên mới nhận laptop công ty, sạc, security key và các thiết bị ngoại vi tiêu chuẩn trước ngày bắt đầu khi yêu cầu onboarding được nộp trước ít nhất 7 ngày làm việc.

Nhân viên có thể yêu cầu một màn hình, bàn phím, chuột và tai nghe mỗi 24 tháng. Thiết bị trên 10.000.000 VNĐ yêu cầu phê duyệt của quản lý và dán nhãn tài sản IT.

Thiết bị bị mất hoặc bị đánh cắp phải được báo cáo cho IT Security trong vòng 2 giờ để thiết bị có thể bị khóa và quyền truy cập dữ liệu khách hàng được rà soát.`,
  },
  {
    id: "access-control-policy",
    title: "Chính Sách Kiểm Soát Truy Cập và Xử Lý Dữ Liệu",
    category: "security",
    version: "2026.1",
    status: "current",
    sensitivity: "restricted",
    content: `# Chính Sách Kiểm Soát Truy Cập và Xử Lý Dữ Liệu

Truy cập hệ thống production yêu cầu phê duyệt của quản lý, phê duyệt của chủ sở hữu hệ thống, và hoàn thành đào tạo bảo mật trong vòng 12 tháng gần nhất.

Dữ liệu khách hàng không được sao chép vào công cụ cá nhân, chatbot AI công khai, hoặc thiết bị không được quản lý. Trích đoạn đã được ẩn danh có thể được sử dụng để debug chỉ khi được incident commander phê duyệt.

Rà soát quyền truy cập diễn ra hàng quý. Quản lý phải thu hồi quyền truy cập của nhân viên đã thay đổi vai trò, chuyển nhóm, hoặc không còn cần hệ thống.`,
  },
  {
    id: "performance-review-policy",
    title: "Chính Sách Đánh Giá Hiệu Suất",
    category: "performance",
    version: "2026.1",
    status: "current",
    sensitivity: "internal",
    content: `# Chính Sách Đánh Giá Hiệu Suất

Đánh giá hiệu suất diễn ra hai lần mỗi năm: hiệu chuẩn giữa năm vào tháng 6 và hiệu chuẩn cuối năm vào tháng 12.

Nhân viên cần nộp bản tự đánh giá trước ít nhất 5 ngày làm việc trước buổi đánh giá với quản lý. Quản lý phải đưa ra các ví dụ cụ thể về tác động, khả năng hợp tác và kỳ vọng vai trò.

Kế hoạch cải thiện hiệu suất (PIP) yêu cầu HRBP xem xét trước khi gửi cho nhân viên và phải bao gồm kỳ vọng đo lường được, hành động hỗ trợ, và ngày đánh giá lại.`,
  },
  {
    id: "onboarding-offboarding-policy",
    title: "Chính Sách Onboarding và Offboarding",
    category: "employee-lifecycle",
    version: "2026.1",
    status: "current",
    sensitivity: "internal",
    content: `# Chính Sách Onboarding và Offboarding

Quản lý tuyển dụng phải nộp yêu cầu onboarding trước ít nhất 7 ngày làm việc trước ngày bắt đầu của nhân viên. Yêu cầu nộp muộn có thể gây chậm trễ giao thiết bị và cấp quyền truy cập hệ thống.

Với trường hợp nghỉ việc, quản lý phải nộp offboarding trong vòng 1 ngày làm việc kể từ khi nhận thông báo. IT sẽ vô hiệu hóa quyền truy cập tiêu chuẩn vào cuối ngày làm việc cuối cùng trừ khi Phòng Pháp chế hoặc Security yêu cầu hành động sớm hơn.

Nhân viên nghỉ việc phải trả lại laptop, security key, thẻ nhân viên và mọi thiết bị có nhãn tài sản trong vòng 5 ngày làm việc sau ngày làm việc cuối cùng.`,
  },
  {
    id: "old-overtime-policy-2024",
    title: "Chính Sách Làm Thêm Giờ Cũ 2024",
    category: "overtime",
    version: "2024.4",
    status: "stale",
    sensitivity: "internal",
    content: `# Chính Sách Làm Thêm Giờ Cũ 2024

Chính sách cũ này cho phép yêu cầu thanh toán làm thêm giờ cuối tuần trong vòng 7 ngày dương lịch sau khi hoàn thành công việc khi quản lý xác nhận số giờ. Chính sách hiện tại đã thay thế quy trình này bằng yêu cầu phê duyệt trước và cho phép phê duyệt bổ sung trong 24 giờ chỉ áp dụng cho sự cố production Severity 1.`,
  },
  {
    id: "training-development-policy",
    title: "Chính Sách Đào Tạo và Phát Triển",
    category: "training",
    version: "2026.1",
    status: "current",
    sensitivity: "internal",
    content: `# Chính Sách Đào Tạo và Phát Triển

Mỗi nhân viên được cấp ngân sách đào tạo 20.000.000 VNĐ mỗi năm dương lịch cho các khóa học, chứng chỉ và hội thảo liên quan đến công việc. Ngân sách không được chuyển sang năm sau.

Yêu cầu đào tạo cần được quản lý trực tiếp phê duyệt trước khi đăng ký. Chứng chỉ kỹ thuật (AWS, GCP, Kubernetes) được ưu tiên phê duyệt. Chi phí vượt ngân sách yêu cầu phê duyệt từ trưởng phòng.

Nhân viên hoàn thành khóa học phải chia sẻ kiến thức với nhóm trong vòng 30 ngày thông qua presentation hoặc tài liệu nội bộ. Thời gian học trong giờ làm việc được giới hạn tối đa 4 giờ mỗi tuần.

Nhân viên nghỉ việc trong vòng 12 tháng sau khi hoàn thành đào tạo có chi phí trên 10.000.000 VNĐ phải hoàn trả 50% chi phí đào tạo.`,
  },
  {
    id: "code-of-conduct-policy",
    title: "Quy Tắc Ứng Xử và Đạo Đức",
    category: "conduct",
    version: "2026.1",
    status: "current",
    sensitivity: "internal",
    content: `# Quy Tắc Ứng Xử và Đạo Đức

Nhân viên phải đối xử tôn trọng với đồng nghiệp, khách hàng và đối tác. Quấy rối, phân biệt đối xử và bắt nạt không được dung thứ dưới mọi hình thức.

Nhân viên phải tránh xung đột lợi ích. Mọi mối quan hệ cá nhân có thể ảnh hưởng đến quyết định kinh doanh phải được báo cáo cho HRBP. Đầu tư vào nhà cung cấp hoặc đối thủ cạnh tranh yêu cầu phê duyệt từ Phòng Pháp chế.

Quà tặng từ nhà cung cấp hoặc đối tác không được vượt quá 500.000 VNĐ. Quà tặng trên ngưỡng này phải được báo cáo và nộp vào quỹ công ty. Tiền mặt hoặc thẻ quà tặng không được chấp nhận dưới mọi hình thức.

Nhân viên không được sử dụng tài sản công ty cho mục đích cá nhân trừ khi được chính sách khác cho phép cụ thể.`,
  },
  {
    id: "data-privacy-policy",
    title: "Chính Sách Bảo Vệ Dữ Liệu Cá Nhân",
    category: "privacy",
    version: "2026.1",
    status: "current",
    sensitivity: "restricted",
    content: `# Chính Sách Bảo Vệ Dữ Liệu Cá Nhân

Dữ liệu cá nhân của nhân viên và khách hàng được xử lý theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân. Dữ liệu cá nhân nhạy cảm bao gồm: sức khỏe, tài chính, sinh trắc học, tín ngưỡng, và đời sống riêng tư.

Nhân viên chỉ được truy cập dữ liệu cá nhân khi cần thiết để thực hiện công việc (principle of least privilege). Truy cập dữ liệu phải được ghi nhận và kiểm tra định kỳ.

Vi phạm bảo vệ dữ liệu phải được báo cáo cho Phòng Pháp chế và DPO trong vòng 24 giờ. Báo cáo phải bao gồm: loại dữ liệu bị ảnh hưởng, số lượng người bị ảnh hưởng, và biện pháp khắc phục.

Dữ liệu cá nhân phải được xóa hoặc ẩn danh khi không còn cần thiết cho mục đích thu thập. Thời gian lưu giữ tối đa cho dữ liệu nhân viên là 10 năm sau khi nghỉ việc.`,
  },
  {
    id: "workplace-safety-policy",
    title: "Chính Sách An Toàn Lao Động",
    category: "safety",
    version: "2026.1",
    status: "current",
    sensitivity: "internal",
    content: `# Chính Sách An Toàn Lao Động

Mọi nhân viên phải hoàn thành đào tạo an toàn khi onboard và cập nhật hàng năm. Tai nạn lao động phải được báo cáo cho quản lý và bộ phận an toàn trong vòng 1 giờ.

Phòng làm việc phải tuân thủ tiêu chuẩn PCCC. Lối thoát hiểm không được bị chặn. Thiết bị cứu hỏa phải được kiểm tra hàng tháng. Nhân viên không được tự ý sửa chữa thiết bị điện trong văn phòng.

Làm việc tại nhà cũng phải tuân thủ các tiêu chuẩn an toàn cơ bản: bàn ghế ergonomic, ánh sáng đầy đủ, và ổ cắm điện an toàn. Công ty hỗ trợ 2.000.000 VNĐ mỗi năm cho nhân viên làm việc từ xa để mua thiết bị ergonomic.

Sự cố an toàn phải được ghi nhận trong hệ thống báo cáo sự cố trong vòng 24 giờ. Báo cáo phải bao gồm: mô tả sự cố, nguyên nhân, người liên quan, và biện pháp phòng ngừa.`,
  },
  {
    id: "referral-bonus-policy",
    title: "Chính Sách Thưởng Giới Thiệu Nhân Viên",
    category: "referral",
    version: "2026.1",
    status: "current",
    sensitivity: "internal",
    content: `# Chính Sách Thưởng Giới Thiệu Nhân Viên

Nhân viên giới thiệu ứng viên thành công sẽ nhận thưởng giới thiệu sau khi ứng viên hoàn thành 90 ngày làm việc đầu tiên. Mức thưởng: 15.000.000 VNĐ cho vị trí kỹ thuật, 10.000.000 VNĐ cho vị trí non-technical.

Người giới thiệu phải nộp hồ sơ giới thiệu trước khi ứng viên nộp đơn trực tiếp. Ứng viên hiện tại trong hệ thống ATS không đủ điều kiện nhận thưởng.

Thưởng giới thiệu được chi trả cùng lương tháng. Thuế thu nhập cá nhân áp dụng theo quy định hiện hành. Nhân viên quản lý trực tiếp không được nhận thưởng cho vị trí trong nhóm của mình.

Chương trình giới thiệu không áp dụng cho hợp đồng thời vụ, thực tập sinh, và nhà thầu. Thưởng có thể được điều chỉnh hoặc tạm ngưng theo quyết định của Phòng Nhân sự.`,
  },
  {
    id: "disciplinary-policy",
    title: "Chính Sách Kỷ Luật Lao Động",
    category: "disciplinary",
    version: "2026.1",
    status: "current",
    sensitivity: "internal",
    content: `# Chính Sách Kỷ Luật Lao Động

Quy trình kỷ luật bao gồm 4 bước: nhắc nhở miệng, cảnh cáo bằng văn bản, đình chỉ công tác, và chấm dứt hợp đồng. Mỗi bước phải được ghi nhận bằng văn bản.

Nhân viên bị kỷ luật có quyền trình bày và khiếu nại. Khiếu nại phải được nộp trong vòng 5 ngày làm việc kể từ ngày nhận quyết định kỷ luật. Hội đồng kỷ luật bao gồm đại diện HRBP, quản lý cấp trên, và đại diện nhân viên.

Vi phạm nghiêm trọng (gian lận, trộm cắp, bạo lực, tiết lộ bí mật) có thể dẫn đến chấm dứt hợp đồng ngay lập tức mà không cần qua các bước nhắc nhở.

Hồ sơ kỷ luật được lưu giữ trong hệ thống HRIS và chỉ được truy cập bởi HRBP và quản lý trực tiếp. Hồ sơ tự động xóa sau 3 năm kể từ ngày kỷ luật cuối cùng trừ khi liên quan đến vụ việc pháp lý.`,
  },
  {
    id: "it-security-policy",
    title: "Chính Sách An Toàn Thông Tin",
    category: "security",
    version: "2026.2",
    status: "current",
    sensitivity: "restricted",
    content: `# Chính Sách An Toàn Thông Tin

Mật khẩu phải có ít nhất 12 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt. Mật khẩu phải được thay đổi mỗi 90 ngày. Mật khẩu cũ không được sử dụng lại trong 12 lần gần nhất.

Xác thực đa yếu tố (MFA) bắt buộc cho tất cả hệ thống nội bộ và cloud. Nhân viên phải sử dụng ứng dụng authenticator thay vì SMS khi có thể. Hardware security key được khuyến nghị cho tài khoản có quyền admin.

VPN bắt buộc khi truy cập hệ thống nội bộ từ mạng bên ngoài. Kết nối VPN phải sử dụng giao thức WireGuard hoặc IPSec. SSH key phải được xoay vòng mỗi 6 tháng.

Phát hiện sự cố bảo mật phải được báo cáo ngay lập tức qua kênh #security-incident trên Slack hoặc hotline an ninh 24/7. Nhân viên không được tự ý điều tra hoặc khắc phục sự cố bảo mật mà không có hướng dẫn từ Security team.`,
  },
  {
    id: "health-insurance-policy",
    title: "Chính Sách Bảo Hiểm và Phúc Lợi",
    category: "benefits",
    version: "2026.1",
    status: "current",
    sensitivity: "internal",
    content: `# Chính Sách Bảo Hiểm và Phúc Lợi

Nhân viên chính thức được hưởng bảo hiểm sức khỏe nhóm bao gồm: khám bệnh, nhập viện, nha khoa và nhãn khoa. Bảo hiểm có hiệu lực từ ngày đầu tiên làm việc. Người phụ thuộc (vợ/chồng, con dưới 18 tuổi) có thể được đăng ký thêm với chi phí công ty hỗ trợ 50%.

Ngân sách phúc lợi hàng năm: 5.000.000 VNĐ cho nhân viên, 8.000.000 VNĐ cho nhân viên có người phụ thuộc. Ngân sách sử dụng cho: gym, yoga, thể thao, hoặc các hoạt động wellness khác.

Khám sức khỏe định kỳ được tổ chức hàng năm tại bệnh viện đối tác. Kết quả khám được bảo mật và chỉ nhân viên được thông báo. Công ty không truy cập kết quả khám sức khỏe của nhân viên.

Nhân viên nghỉ việc vẫn được hưởng bảo hiểm đến cuối tháng nghỉ việc. COBRA không áp dụng tại Việt Nam, nhưng nhân viên có thể chuyển sang bảo hiểm cá nhân theo quy định của nhà bảo hiểm.`,
  },
  {
    id: "promotion-policy",
    title: "Chính Sách Thăng Tiến và Đánh Giá Cấp Bậc",
    category: "career",
    version: "2026.1",
    status: "current",
    sensitivity: "confidential",
    content: `# Chính Sách Thăng Tiến và Đánh Giá Cấp Bậc

Hệ thống cấp bậc bao gồm: E1 (Intern), E2 (Junior), E3 (Mid), E4 (Senior), E5 (Staff), E6 (Principal), E7 (Distinguished). Mỗi cấp bậc có khung năng lực và kỳ vọng rõ ràng.

Thăng tiến từ E3 lên E4 yêu cầu: ít nhất 18 tháng ở cấp hiện tại, đánh giá hiệu suất đạt Expectations trở lên trong 2 chu kỳ liên tiếp, và đề cử từ quản lý trực tiếp.

Thăng tiến từ E4 lên E5 yêu cầu: phạm vi ảnh hưởng ít nhất 2 nhóm, mentoring ít nhất 1 nhân viên junior, và delivery dự án có tác động cấp team/department.

Quy trình thăng tiến diễn ra hàng quý. Hồ sơ bao gồm: tự đánh giá, đánh giá từ quản lý, peer feedback (ít nhất 3 người), và portfolio công việc. Hội đồng calibration gồm Engineering Manager, HRBP, và Director.

Từ chối thăng tiến phải được giải thích bằng văn bản. Nhân viên có thể nộp lại hồ sơ sau 6 tháng. Không có giới hạn số lần nộp hồ sơ thăng tiến.`,
  },
  {
    id: "intern-policy",
    title: "Chính Sách Thực Tập Sinh",
    category: "intern",
    version: "2026.1",
    status: "current",
    sensitivity: "internal",
    content: `# Chính Sách Thực Tập Sinh

Thực tập sinh được hưởng trợ cấp 5.000.000 VNĐ/tháng cho chương trình 6 tháng. Thời gian làm việc tối đa 40 giờ/tuần. Thực tập sinh không được làm thêm giờ.

Mỗi thực tập sinh được chỉ định một mentor là nhân viên chính thức từ E3 trở lên. Mentor phải dành ít nhất 2 giờ mỗi tuần cho coaching và review công việc.

Thực tập sinh không được truy cập hệ thống production hoặc dữ liệu khách hàng. Truy cập sandbox và staging được cấp theo yêu cầu của mentor.

Thực tập sinh hoàn thành chương trình tốt sẽ được xem xét offer vị trí chính thức. Quyết định offer do quản lý bộ phận và HRBP phê duyệt. Thực tập sinh không tự động được chuyển sang nhân viên chính thức.`,
  },
  {
    id: "old-remote-work-policy-2024",
    title: "Chính Sách Làm Việc Từ Xa Cũ 2024",
    category: "remote-work",
    version: "2024.3",
    status: "stale",
    sensitivity: "internal",
    content: `# Chính Sách Làm Việc Từ Xa Cũ 2024

Chính sách cũ cho phép làm việc từ xa không giới hạn số ngày với sự phê duyệt của quản lý. Không có yêu cầu về số ngày có mặt tại văn phòng.

Chính sách hiện tại đã giới hạn xuống còn 3 ngày mỗi tuần và yêu cầu phê duyệt đặc biệt cho làm việc từ nước ngoài.`,
  },
  {
    id: "working-hours-policy",
    title: "Chính Sách Giờ Làm Việc và Chấm Công",
    category: "attendance",
    version: "2026.1",
    status: "current",
    sensitivity: "internal",
    content: `# Chính Sách Giờ Làm Việc và Chấm Công

Giờ làm việc tiêu chuẩn của công ty là 8 tiếng một ngày, từ Thứ Hai đến Thứ Sáu hàng tuần. Khung giờ làm việc chuẩn là từ 08:30 đến 17:30, nghỉ trưa 1 tiếng từ 12:00 đến 13:00 (không tính vào giờ làm việc).

Công ty áp dụng cơ chế Giờ làm việc linh hoạt (Flexitime). Nhân viên có thể thực hiện check-in trong khoảng thời gian từ 08:00 đến 09:30 và ra về sau khi đã hoàn thành đủ 8 giờ làm việc tại văn phòng (ví dụ: check-in lúc 09:15 sẽ check-out lúc 18:15).

Nhân viên bắt buộc phải thực hiện chấm công bằng vân tay hoặc qua ứng dụng di động nội bộ của công ty khi đến và khi về. Trường hợp quên chấm công phải gửi yêu cầu phê duyệt giải trình từ quản lý trực tiếp trong vòng 48 giờ.

Đi muộn (sau 09:30) quá 3 lần trong một tháng dương lịch mà không có lý do chính đáng được quản lý phê duyệt trước sẽ bị nhắc nhở bằng văn bản bởi Bộ phận Nhân sự.`,
  },
  {
    id: "public-holidays-policy",
    title: "Chính Sách Ngày Nghỉ Lễ và Nghỉ Đặc Biệt",
    category: "time-off",
    version: "2026.1",
    status: "current",
    sensitivity: "internal",
    content: `# Chính Sách Ngày Nghỉ Lễ và Nghỉ Đặc Biệt

Công ty áp dụng lịch nghỉ lễ, Tết có hưởng nguyên lương theo đúng quy định của Luật Lao động Việt Nam, bao gồm: Tết Dương Lịch, Tết Nguyên Đán, Giỗ tổ Hùng Vương, Ngày Chiến thắng (30/04), Ngày Quốc tế Lao động (01/05) và Ngày Quốc khánh (02/09).

Ngoài các ngày lễ quốc gia, công ty cung cấp các ngày nghỉ đặc biệt hưởng nguyên lương sau đây:
- **Ngày sinh nhật nhân viên:** Được nghỉ 1 ngày trong tháng sinh nhật (yêu cầu báo trước quản lý 5 ngày làm việc).
- **Kết hôn:** Bản thân kết hôn được nghỉ 3 ngày làm việc; con kết hôn được nghỉ 1 ngày làm việc.
- **Nghỉ hiếu:** Bố mẹ đẻ, bố mẹ vợ/chồng, vợ hoặc chồng, con mất được nghỉ 3 ngày làm việc. Anh, chị, em ruột mất được nghỉ 1 ngày làm việc.

If a national public holiday falls on a weekend (Saturday or Sunday), employees will receive a compensatory day off on the next working day, following specific instructions from the HR Department for each holiday period.`,
  },
  {
    id: "lunch-and-benefits-policy",
    title: "Chính Sách Phụ Cấp Ăn Trưa và Phúc Lợi Văn Phòng",
    category: "benefits",
    version: "2026.1",
    status: "current",
    sensitivity: "internal",
    content: `# Chính Sách Phụ Cấp Ăn Trưa và Phúc Lợi Văn Phòng

Nhân viên chính thức của công ty được hưởng khoản Phụ cấp ăn trưa trị giá 1.200.000 VNĐ mỗi tháng. Phụ cấp này được tính tỷ lệ theo số ngày công làm việc thực tế tại văn phòng (mức tương đương 55.000 VNĐ/ngày). Phụ cấp ăn trưa không được áp dụng cho những ngày làm việc từ xa (WFH) hoặc những ngày nghỉ phép dài ngày (trên 3 ngày liên tiếp).

Công ty hỗ trợ chi phí gửi xe máy tại hầm tòa nhà văn phòng với mức 200.000 VNĐ/tháng, hoặc cấp thẻ gửi xe ô tô miễn phí cho các nhân sự cấp Quản lý (từ cấp bậc E5 trở lên).

Vào lúc 16:00 chiều Thứ Sáu hàng tuần, công ty tổ chức chương trình "Happy Hour" tại khu vực Pantry văn phòng. Toàn bộ chi phí đồ ăn nhẹ, trà sữa, hoa quả và đồ uống nhẹ sẽ do công ty tài trợ nhằm khuyến khích sự gắn kết giữa các phòng ban.`,
  },
  {
    id: "wfh-allowance-policy",
    title: "Chính Sách Hỗ Trợ Thiết Bị Làm Việc Từ Xa",
    category: "benefits",
    version: "2026.1",
    status: "current",
    sensitivity: "internal",
    content: `# Chính Sách Hỗ Trợ Thiết Bị Làm Việc Từ Xa

Để đảm bảo sức khỏe và hiệu suất làm việc khi áp dụng cơ chế làm việc từ xa (WFH) hoặc Hybrid, công ty hỗ trợ một lần chi phí mua sắm thiết bị công thái học cho nhân viên chính thức ký hợp đồng lao động từ 1 năm trở lên.

Mức hỗ trợ tối đa là 2.500.000 VNĐ dùng để chi trả cho các danh mục: Ghế công thái học, Bàn làm việc điều chỉnh độ cao, hoặc Màn hình phụ. Nhân viên mua hàng trước, sau đó nộp hóa đơn đỏ (VAT) ghi thông tin công ty lên hệ thống thanh toán chi phí trong vòng 30 ngày kể từ ngày mua.

Ngoài ra, nhân viên tham gia lịch làm việc Hybrid cố định sẽ được nhận khoản phụ cấp hỗ trợ cước Internet cố định trị giá 300.000 VNĐ/tháng, được chi trả trực tiếp cùng kỳ lương hàng tháng.`,
  },
  {
    id: "dress-code-policy",
    title: "Chính Sách Trang Phục và Tác Phong Công Sở",
    category: "culture",
    version: "2026.1",
    status: "current",
    sensitivity: "internal",
    content: `# Chính Sách Trang Phục và Tác Phong Công Sở

Công ty xây dựng môi trường làm việc cởi mở, sáng tạo nhưng vẫn đảm bảo tính lịch sự và chuyên nghiệp.

**Quy định về trang phục (Dress Code):**
- **Hàng ngày (Casual):** Nhân viên được tự do lựa chọn trang phục thoải mái, trẻ trung phù hợp với môi trường công nghệ (áo thun, áo polo, quần jeans, quần kaki, giày thể thao, giày búp bê, xăng đan lịch sự).
- **Trang phục không phù hợp:** Nghiêm cấm mặc quần đùi, quần short ngắn thể thao, áo ba lỗ, áo hai dây hở hang hoặc đi dép lê trong phòng làm việc.
- **Khi tiếp đối tác/khách hàng hoặc các ngày lễ lớn:** Yêu cầu mặc trang phục trang nhã, lịch sự (Business Casual - áo sơ mi, quần tây, chân váy công sở).

**Quy định về tác phong văn phòng (Office Etiquette):**
- **Tránh tiếng ồn:** Để đảm bảo sự tập trung cho đồng nghiệp xung quanh, không nói chuyện hoặc tranh luận quá ồn ào tại không gian làm việc chung. Nhân viên bắt buộc sử dụng tai nghe khi nghe nhạc, xem video hoặc tham gia các cuộc họp online tại bàn làm việc.
- **Pantry văn phòng:** Giữ gìn vệ sinh chung tại khu vực Pantry. Đồ ăn, nước uống sau khi sử dụng xong phải dọn dẹp sạch sẽ. Thực phẩm lưu trữ trong tủ lạnh chung quá 3 ngày không sử dụng sẽ bị nhân sự dọn dẹp vào chiều Thứ Sáu hàng tuần.`,
  },
];

const questionsVi: readonly QuestionSpec[] = [
  // Basic lookup
  {
    id: "hr-time-off-carryover",
    question: "Nhân viên được chuyển bao nhiêu ngày phép sang năm sau?",
    expectedPolicyIds: ["time-off-policy"],
    answerable: true,
  },
  {
    id: "hr-ot-weekend-no-approval",
    question:
      "Tôi có thể yêu cầu thanh toán OT nếu làm Thứ Bảy mà chưa được duyệt không?",
    expectedPolicyIds: ["overtime-policy"],
    answerable: true,
  },
  {
    id: "hr-remote-work-abroad",
    question: "Cần những phê duyệt nào để làm việc từ xa ở nước ngoài?",
    expectedPolicyIds: ["remote-work-policy"],
    answerable: true,
  },
  {
    id: "hr-three-day-illness",
    question: "Nghỉ ốm 3 ngày thì áp dụng chính sách nào?",
    expectedPolicyIds: ["leave-of-absence"],
    answerable: true,
  },
  {
    id: "hr-salary-band",
    question: "Khung lương nào áp dụng cho Senior Backend Engineer?",
    expectedPolicyIds: ["compensation-policy"],
    answerable: true,
  },
  {
    id: "hr-equipment-new-hire",
    question: "Nhân viên mới được nhận những thiết bị gì trước ngày bắt đầu?",
    expectedPolicyIds: ["equipment-policy"],
    answerable: true,
  },
  {
    id: "hr-lost-device",
    question: "Mất laptop thì phải báo trong bao lâu?",
    expectedPolicyIds: ["equipment-policy"],
    answerable: true,
  },
  {
    id: "hr-production-access",
    question: "Cần phê duyệt gì để truy cập hệ thống production?",
    expectedPolicyIds: ["access-control-policy"],
    answerable: true,
  },
  {
    id: "hr-customer-data-ai-tools",
    question:
      "Dữ liệu khách hàng có được sao chép vào chatbot AI công khai không?",
    expectedPolicyIds: ["access-control-policy"],
    answerable: true,
  },
  {
    id: "hr-performance-review-cycle",
    question: "Đánh giá hiệu suất diễn ra khi nào?",
    expectedPolicyIds: ["performance-review-policy"],
    answerable: true,
  },
  {
    id: "hr-onboarding-request-window",
    question: "Yêu cầu onboarding cần nộp trước bao lâu?",
    expectedPolicyIds: ["onboarding-offboarding-policy"],
    answerable: true,
  },
  // New policy questions
  {
    id: "hr-training-budget",
    question: "Ngân sách đào tạo hàng năm cho mỗi nhân viên là bao nhiêu?",
    expectedPolicyIds: ["training-development-policy"],
    answerable: true,
  },
  {
    id: "hr-training-payback",
    question: "Nếu nghỉ việc sau khi hoàn thành khóa học đắt tiền thì sao?",
    expectedPolicyIds: ["training-development-policy"],
    answerable: true,
  },
  {
    id: "hr-gift-limit",
    question: "Nhận quà từ nhà cung cấp tối đa bao nhiêu?",
    expectedPolicyIds: ["code-of-conduct-policy"],
    answerable: true,
  },
  {
    id: "hr-referral-bonus",
    question: "Thưởng giới thiệu nhân viên kỹ thuật là bao nhiêu?",
    expectedPolicyIds: ["referral-bonus-policy"],
    answerable: true,
  },
  {
    id: "hr-password-requirements",
    question: "Yêu cầu mật khẩu theo chính sách an toàn thông tin là gì?",
    expectedPolicyIds: ["it-security-policy"],
    answerable: true,
  },
  {
    id: "hr-mfa-required",
    question: "Xác thực đa yếu tố có bắt buộc không?",
    expectedPolicyIds: ["it-security-policy"],
    answerable: true,
  },
  {
    id: "hr-data-breach-report",
    question: "Vi phạm dữ liệu phải báo cáo trong bao lâu?",
    expectedPolicyIds: ["data-privacy-policy"],
    answerable: true,
  },
  {
    id: "hr-health-insurance-dependents",
    question: "Người phụ thuộc có được hưởng bảo hiểm không?",
    expectedPolicyIds: ["health-insurance-policy"],
    answerable: true,
  },
  {
    id: "hr-wellness-budget",
    question: "Ngân sách phúc lợi wellness hàng năm là bao nhiêu?",
    expectedPolicyIds: ["health-insurance-policy"],
    answerable: true,
  },
  {
    id: "hr-promotion-senior-to-staff",
    question: "Điều kiện thăng tiến từ Senior lên Staff là gì?",
    expectedPolicyIds: ["promotion-policy"],
    answerable: true,
  },
  {
    id: "hr-discipline-steps",
    question: "Quy trình kỷ luật bao gồm những bước nào?",
    expectedPolicyIds: ["disciplinary-policy"],
    answerable: true,
  },
  {
    id: "hr-intern-production-access",
    question: "Thực tập sinh có được truy cập hệ thống production không?",
    expectedPolicyIds: ["intern-policy"],
    answerable: true,
  },
  {
    id: "hr-work-safety-wfh",
    question: "Làm việc tại nhà cần tuân thủ an toàn lao động như thế nào?",
    expectedPolicyIds: ["workplace-safety-policy"],
    answerable: true,
  },
  // Multi-hop questions (require combining info from multiple policies)
  {
    id: "hr-new-hire-full-setup",
    question: "Một nhân viên mới bắt đầu cần những gì từ IT, HR và quản lý?",
    expectedPolicyIds: [
      "onboarding-offboarding-policy",
      "equipment-policy",
      "access-control-policy",
    ],
    answerable: true,
  },
  {
    id: "hr-leave-comparison",
    question:
      "So sánh nghỉ phép năm, nghỉ ốm và nghỉ thai sản — mỗi loại được bao nhiêu ngày?",
    expectedPolicyIds: ["time-off-policy", "leave-of-absence"],
    answerable: true,
  },
  {
    id: "hr-departure-process",
    question:
      "Khi nhân viên nghỉ việc, cần làm những gì về thiết bị, quyền truy cập và bàn giao?",
    expectedPolicyIds: [
      "onboarding-offboarding-policy",
      "equipment-policy",
      "access-control-policy",
    ],
    answerable: true,
  },
  // Edge cases
  {
    id: "hr-stock-forecast",
    question: "Giá cổ phiếu công ty quý tới sẽ thế nào?",
    expectedPolicyIds: [],
    answerable: false,
  },
  {
    id: "hr-lunch-menu",
    question: "Thực đơn căng tin hôm nay có gì?",
    expectedPolicyIds: [],
    answerable: false,
  },
  {
    id: "hr-personal-loan",
    question: "Tôi có thể vay tiền công ty không?",
    expectedPolicyIds: [],
    answerable: false,
  },
];

export const getSeedPolicies = (locale: Locale): readonly SeedPolicy[] =>
  locale === "vi" ? policiesVi : policiesEn;

export const getPresetQuestions = (locale: Locale): readonly QuestionSpec[] =>
  locale === "vi" ? questionsVi : questionsEn;

// Default exports for backward compatibility
export const seedPolicies = policiesVi;
export const presetQuestions = questionsVi;
