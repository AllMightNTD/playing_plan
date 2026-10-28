export const MAX_ROOM_MEMBERS = 2;
export const NICKNAME_MAX_LENGTH = 40;
export const ROOM_NAME_MAX_LENGTH = 100;
export const DEFAULT_NICKNAME = "Bạn";

export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
export const INVITE_CODE_LENGTH = 8;
/** Bỏ các ký tự dễ nhầm (0/O, 1/I) theo F02; đủ 32 ký tự để chia byte ngẫu nhiên không bị lệch. */
export const INVITE_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export const PLAN_STATUSES = ["planned", "done", "cancelled"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const SWIPE_CHOICES = ["like", "nope"] as const;
export type SwipeChoice = (typeof SWIPE_CHOICES)[number];

export const MAX_PLAN_STOPS = 20;
export const MAX_CHECKLIST_ITEMS = 50;
export const MAX_PLANS_LISTED = 100;
export const DEFAULT_STOP_DURATION_MIN = 60;
/** F19: mặc định mở khóa kế hoạch bất ngờ 2 giờ trước giờ hẹn. */
export const SECRET_REVEAL_LEAD_MS = 2 * 60 * 60 * 1000;
