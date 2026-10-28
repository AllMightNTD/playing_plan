export interface ErrorDefinition {
  code: string;
  status: number;
  message: string;
}

/**
 * Registry mã lỗi duy nhất của hệ thống. Message hiển thị cho người dùng, không lộ thông tin nội bộ.
 */
export const ERRORS = {
  COMMON: {
    VALIDATION_FAILED: { code: "VALIDATION_FAILED", status: 400, message: "Dữ liệu gửi lên chưa hợp lệ." },
    INTERNAL_ERROR: { code: "INTERNAL_ERROR", status: 500, message: "Có lỗi xảy ra, thử lại sau nhé." },
    DB_NOT_CONFIGURED: {
      code: "DB_NOT_CONFIGURED",
      status: 503,
      message: "Dịch vụ dữ liệu chưa sẵn sàng, thử lại sau nhé.",
    },
    RATE_LIMITED: { code: "RATE_LIMITED", status: 429, message: "Bạn thao tác hơi nhanh, nghỉ chút rồi thử lại nhé." },
  },
  SESSION: {
    UNAUTHORIZED: { code: "UNAUTHORIZED", status: 401, message: "Bạn chưa có phiên phòng hợp lệ." },
  },
  ROOM: {
    INVITE_INVALID: {
      code: "ROOM_INVITE_INVALID",
      status: 400,
      message: "Mã mời không đúng hoặc đã hết hạn rồi.",
    },
    ALREADY_IN_ROOM: {
      code: "ROOM_ALREADY_IN_ROOM",
      status: 409,
      message: "Bạn đang ở trong một phòng đôi rồi, rời phòng trước nhé.",
    },
    ALREADY_PAIRED: { code: "ROOM_ALREADY_PAIRED", status: 409, message: "Phòng đã đủ hai người rồi." },
    MEMBER_NOT_FOUND: { code: "ROOM_MEMBER_NOT_FOUND", status: 404, message: "Không tìm thấy thiết bị này trong phòng." },
    CANNOT_REVOKE_SELF: {
      code: "ROOM_CANNOT_REVOKE_SELF",
      status: 400,
      message: "Muốn tự rời phòng thì dùng nút Rời phòng nha.",
    },
    RECOVERY_INVALID: {
      code: "ROOM_RECOVERY_INVALID",
      status: 400,
      message: "Khóa khôi phục không đúng hoặc đã bị thay mới.",
    },
  },
  ADMIN: {
    UNAUTHENTICATED: { code: "ADMIN_UNAUTHENTICATED", status: 401, message: "Bạn cần đăng nhập quản trị." },
    FORBIDDEN: { code: "FORBIDDEN", status: 403, message: "Bạn không có quyền truy cập khu vực này." },
  },
  PLACE: {
    NOT_FOUND: { code: "PLACE_NOT_FOUND", status: 404, message: "Không tìm thấy địa điểm này." },
    NO_CANDIDATE: {
      code: "PLACE_NO_CANDIDATE",
      status: 404,
      message: "Chưa có nơi hợp bộ lọc, thử bỏ bớt nhé.",
    },
    SLUG_TAKEN: { code: "PLACE_SLUG_TAKEN", status: 409, message: "Slug này đã được dùng cho địa điểm khác." },
    NOT_READY_TO_PUBLISH: {
      code: "PLACE_NOT_READY_TO_PUBLISH",
      status: 422,
      message: "Địa điểm còn thiếu thông tin bắt buộc trước khi xuất bản.",
    },
  },
  AI: {
    INVALID_RESPONSE: {
      code: "AI_INVALID_RESPONSE",
      status: 502,
      message: "AI trả về dữ liệu không đúng định dạng, thử lại nhé.",
    },
  },
  PLAN: {
    NOT_FOUND: { code: "PLAN_NOT_FOUND", status: 404, message: "Không tìm thấy kế hoạch này." },
    STOP_NOT_FOUND: { code: "PLAN_STOP_NOT_FOUND", status: 404, message: "Không tìm thấy điểm dừng này." },
    SECRET_LOCKED: {
      code: "PLAN_SECRET_LOCKED",
      status: 403,
      message: "Đây là buổi hẹn bất ngờ, chưa tới lúc mở khóa đâu nha.",
    },
    CONFLICT: { code: "PLAN_CONFLICT", status: 409, message: "Người ấy vừa sửa kế hoạch, tải lại nhé?" },
    STOPS_CHANGED: {
      code: "PLAN_STOPS_CHANGED",
      status: 409,
      message: "Danh sách điểm dừng vừa thay đổi, tải lại nhé.",
    },
    STOP_LIMIT_REACHED: {
      code: "PLAN_STOP_LIMIT_REACHED",
      status: 409,
      message: "Một buổi hẹn tối đa 20 điểm dừng thôi nha.",
    },
    CHECKLIST_ITEM_NOT_FOUND: {
      code: "PLAN_CHECKLIST_ITEM_NOT_FOUND",
      status: 404,
      message: "Không tìm thấy mục chuẩn bị này.",
    },
    CHECKLIST_LIMIT_REACHED: {
      code: "PLAN_CHECKLIST_LIMIT_REACHED",
      status: 409,
      message: "Checklist tối đa 50 mục thôi nha.",
    },
  },
} as const satisfies Record<string, Record<string, ErrorDefinition>>;

export class AppError extends Error {
  constructor(
    readonly definition: ErrorDefinition,
    readonly fields?: Record<string, string>
  ) {
    super(definition.code);
    this.name = "AppError";
  }
}
