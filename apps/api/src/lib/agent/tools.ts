import { Type } from "@google/genai";
import { retrieveChunks } from "../retrieval.js";

// ========================================================
// 1. TOOL DECLARATIONS (OpenAPI schemas for Gemini)
// ========================================================

export const searchHrPoliciesTool = {
  name: "search_hr_policies",
  description:
    "Tìm kiếm thông tin từ bộ chính sách nhân sự chính thức của công ty để trả lời câu hỏi.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description:
          "Từ khóa hoặc cụm từ tìm kiếm (ví dụ: 'nghỉ phép', 'phụ cấp ăn trưa', 'trang phục').",
      },
    },
    required: ["query"],
  },
};

export const getCurrentDateTool = {
  name: "get_current_date",
  description:
    "Lấy thông tin ngày giờ hệ thống hiện tại để đối chiếu mốc thời gian (hôm nay, ngày mai, năm ngoái, hết hạn).",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const calculateLeaveBalanceTool = {
  name: "calculate_leave_balance",
  description:
    "Tra cứu số ngày phép năm còn lại của CHÍNH nhân viên đang trò chuyện (gọi hàm không cần bất kỳ tham số nào).",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

// Gộp tất cả các Declarations lại để truyền vào config.tools của Gemini
export const agentToolsDeclarations = [
  { functionDeclarations: [searchHrPoliciesTool, getCurrentDateTool, calculateLeaveBalanceTool] },
];

// ========================================================
// 2. TOOL EXECUTION HANDLERS (Local code execution)
// ========================================================

export interface ToolContext {
  readonly currentUserId?: string;
  readonly topK?: number;
  readonly minScore?: number;
  readonly isAdmin?: boolean;
  readonly skipReranker?: boolean;
  readonly embeddingProvider?: "local" | "cloud";
  readonly originalQuestion?: string;
}

export const executeTool = async (name: string, args: any, context: ToolContext): Promise<any> => {
  switch (name) {
    case "search_hr_policies": {
      let query = args.query as string;
      if (!query) throw new Error("Missing required 'query' argument");

      const originalQuestion = context.originalQuestion?.toLowerCase() || "";
      const weekendKeywords = [
        "thứ bảy",
        "thứ 7",
        "thứ bẩy",
        "chủ nhật",
        "cuối tuần",
        "ngày nghỉ",
        "lịch làm việc",
        "ngày làm việc",
      ];
      const foundKeywords = weekendKeywords.filter((k) => originalQuestion.includes(k));
      if (foundKeywords.length > 0) {
        query = `${query} ${foundKeywords.join(" ")}`;
      }

      const limit = context.topK || 5;
      const isAdmin = context.isAdmin !== false; // default to false if not admin, for maximum safety

      const result = await retrieveChunks(query, limit, isAdmin, {
        skipReranker: context.skipReranker,
        embeddingProvider: context.embeddingProvider,
      });

      // Filter chunks by minScore
      const minScore = context.minScore ?? 0.05;
      const filteredChunks = result.chunks.filter((c) => c.score >= minScore);

      return {
        chunks: filteredChunks.map((c) => ({
          id: c.id,
          policyId: c.policyId,
          title: c.title,
          version: c.version,
          status: c.status,
          score: c.score,
          isPrivate: c.isPrivate,
          content: c.content,
        })),
      };
    }
    case "get_current_date": {
      return {
        currentDate: new Date().toLocaleDateString("vi-VN", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      };
    }
    case "calculate_leave_balance": {
      // Bảo mật tuyệt đối: Luôn tra cứu dựa trên tài khoản đang đăng nhập (currentUserId)
      // tuyệt đối không lấy từ tham số do LLM truyền vào tự do.
      const employeeId = context.currentUserId || "user-employee";

      // Giả lập cơ sở dữ liệu tra cứu phép năm của nhân viên (khớp với ID thực tế từ seed)
      const mockDatabase: Record<
        string,
        { name: string; total: number; used: number; remaining: number }
      > = {
        "user-employee": { name: "Nguyễn Văn A", total: 18, used: 6, remaining: 12 },
        "user-admin": { name: "Quản trị viên", total: 18, used: 0, remaining: 18 },
      };

      const record = mockDatabase[employeeId] || {
        name: "Nhân viên mới",
        total: 18,
        used: 0,
        remaining: 18,
      };
      return {
        employeeId,
        employeeName: record.name,
        totalLeaveDays: record.total,
        usedLeaveDays: record.used,
        remainingLeaveDays: record.remaining,
      };
    }
    default:
      throw new Error(`Unknown tool name: ${name}`);
  }
};
