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
    BLOCKLISTED: {
      code: "PLACE_BLOCKLISTED",
      status: 400,
      message: "Địa điểm này nằm trong danh sách cấm hoặc không an toàn.",
    },
    AI_HALLUCINATION_FORBIDDEN: {
      code: "PLACE_AI_HALLUCINATION_FORBIDDEN",
      status: 422,
      message: "Nguồn AI không được phép ghi vào các trường thực tế nhạy cảm (giờ mở cửa, chi phí, góc chụp, tư thế).",
    },
    PUBLISH_HALTED_BY_CIRCUIT_BREAKER: {
      code: "PLACE_PUBLISH_HALTED_BY_CIRCUIT_BREAKER",
      status: 503,
      message: "Hệ thống tự động xuất bản đang tạm dừng khẩn cấp do kích hoạt phanh an toàn.",
    },
  },
  YOUTUBE: {
    QUOTA_EXCEEDED: {
      code: "YOUTUBE_QUOTA_EXCEEDED",
      status: 429,
      message: "Hạn mức gọi YouTube API trong ngày đã đạt ngưỡng an toàn (8.000 units).",
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
  MEMORY: {
    NOT_FOUND: { code: "MEMORY_NOT_FOUND", status: 404, message: "Không tìm thấy kỷ niệm này." },
    NOTE_NOT_FOUND: { code: "MEMORY_NOTE_NOT_FOUND", status: 404, message: "Không tìm thấy tờ giấy nhớ này." },
    NOTE_LIMIT_REACHED: {
      code: "MEMORY_NOTE_LIMIT_REACHED",
      status: 409,
      message: "Bảng kỷ niệm đã đầy 100 giấy nhớ, gỡ bớt rồi dán tiếp nha.",
    },
  },
  UPLOAD: {
    NOT_FOUND: { code: "UPLOAD_NOT_FOUND", status: 404, message: "Không tìm thấy tệp tải lên này." },
    INVALID_IMAGE: { code: "UPLOAD_INVALID_IMAGE", status: 400, message: "Tệp tải lên không phải là định dạng ảnh hợp lệ." },
    IMAGE_TOO_LARGE: { code: "UPLOAD_IMAGE_TOO_LARGE", status: 400, message: "Ảnh có độ phân giải quá lớn (vượt quá 16 megapixel), vui lòng nén trước." },
    QUOTA_EXCEEDED: { code: "UPLOAD_QUOTA_EXCEEDED", status: 413, message: "Phòng của bạn đã đạt giới hạn dung lượng 25MB hoặc tối đa 50 ảnh." },
    CONSENT_REQUIRED: { code: "UPLOAD_CONSENT_REQUIRED", status: 403, message: "Bạn cần đồng thuận chính sách bảo vệ dữ liệu cá nhân (Nghị định 13/2023) trước khi tải ảnh." },
  },
  VIDEO: {
    NOT_FOUND: { code: "VIDEO_NOT_FOUND", status: 404, message: "Không tìm thấy video này." },
    HOTSPOT_NOT_FOUND: { code: "VIDEO_HOTSPOT_NOT_FOUND", status: 404, message: "Không tìm thấy mốc địa điểm này." },
    HOTSPOT_DUPLICATE: {
      code: "VIDEO_HOTSPOT_DUPLICATE",
      status: 409,
      message: "Địa điểm này đã được ghim ở đúng giây đó rồi.",
    },
  },
  SWIPE: {
    NOT_FOUND: { code: "SWIPE_NOT_FOUND", status: 404, message: "Không có lượt quẹt nào để hoàn tác." },
    MATCH_PLANNED: {
      code: "SWIPE_MATCH_PLANNED",
      status: 409,
      message: "Địa điểm này đã được lên lịch hẹn, không hoàn tác lượt quẹt được nữa.",
    },
  },
  NOTICE: {
    NOT_FOUND: { code: "NOTICE_NOT_FOUND", status: 404, message: "Không tìm thấy thông báo này." },
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
