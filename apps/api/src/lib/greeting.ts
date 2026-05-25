/**
 * Greeting Response Templates
 *
 * Intent detection (greeting, off-topic, meta) is handled by the LLM query analyzer.
 * This file only provides friendly response templates for greeting intent.
 */

const GREETING_RESPONSES = [
  `Xin chào! 👋 Tôi là trợ lý chính sách nhân sự.

Tôi có thể giúp bạn tìm hiểu về các chính sách của công ty. Dưới đây là một số câu hỏi bạn có thể thử:

- **Nghỉ phép**: "Nhân viên được nghỉ bao nhiêu ngày phép năm?"
- **Làm thêm giờ**: "Làm thêm giờ cuối tuần được tính như thế nào?"
- **Làm việc từ xa**: "Chính sách làm việc từ xa quy định gì?"
- **Bảo hiểm**: "Người phụ thuộc có được hưởng bảo hiểm không?"

Hãy đặt câu hỏi bất kỳ! 😊`,

  `Chào bạn! 🌟 Tôi sẵn sàng hỗ trợ bạn về các chính sách nhân sự.

Bạn có thể hỏi tôi về:

- 📅 **Nghỉ phép & vắng mặt** — số ngày, quy trình, điều kiện
- 💰 **Lương & phúc lợi** — khung lương, bảo hiểm, thưởng
- 🏠 **Làm việc từ xa** — số ngày, phê duyệt, thiết bị
- 🔒 **An toàn thông tin** — mật khẩu, MFA, VPN

Bạn muốn biết điều gì?`,

  `Hello! 👋 Tôi là HR Policy Assistant.

Tôi chuyên trả lời các câu hỏi về chính sách nhân sự. Thử hỏi tôi:

- "Điều kiện thăng tiến từ Senior lên Staff là gì?"
- "Mất laptop thì phải báo trong bao lâu?"
- "Thưởng giới thiệu nhân viên kỹ thuật là bao nhiêu?"

Tôi sẵn sàng giúp bạn! 💼`,
];

/**
 * Get a friendly greeting response.
 */
export const getGreetingResponse = (): string => {
  const index = Math.floor(Math.random() * GREETING_RESPONSES.length);
  return GREETING_RESPONSES[index];
};
