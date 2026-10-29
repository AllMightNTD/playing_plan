import { nanoid } from "nanoid";
import { getUserRepositories } from "@/server/db/repositories";
import { getAllPublishedPlaces } from "@/server/services/user/places.service";
import { loadEditablePlan, toPlanScope, toPlanTouch } from "@/server/services/user/plan.service";
import { createRoomNotice } from "@/server/services/user/room-notice.service";
import { assertWithinRateLimit, recordRateLimitHit, RATE_LIMITS } from "@/server/http/rate-limit";
import { AppError, ERRORS } from "@/server/http/errors";
import type { MemberSession, PlanRsvpRecord } from "@/server/db/repositories/types";

export interface PlanShareDto {
  shareToken: string;
  shareUrl: string;
  shareExpiresAt: Date;
}

export interface PublicPlanPosterDto {
  title: string;
  planDate: string;
  startTime: string;
  stops: Array<{
    id: string;
    name: string;
    plannedTime: string | null;
    durationMin: number;
  }>;
  isExpired: boolean;
}

export interface SubmitRsvpBody {
  responderName: string;
  status: "confirmed" | "change_requested";
  changeNote?: string | null;
}

/**
 * Tạo token chia sẻ kế hoạch (72 giờ) phục vụ xuất thiệp mời & poster Story
 */
export async function createPlanShareToken(
  session: MemberSession,
  planId: string
): Promise<PlanShareDto> {
  const scope = toPlanScope(session, planId);
  await loadEditablePlan(session, planId);

  const shareToken = nanoid(32);
  const shareExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h

  await getUserRepositories().plans.updatePlan(
    scope,
    { shareToken, shareExpiresAt },
    toPlanTouch(session)
  );

  return {
    shareToken,
    shareUrl: `/p/share/${shareToken}`,
    shareExpiresAt,
  };
}

/**
 * Thu hồi token chia sẻ kế hoạch
 */
export async function revokePlanShareToken(
  session: MemberSession,
  planId: string
): Promise<void> {
  const scope = toPlanScope(session, planId);
  await loadEditablePlan(session, planId);

  await getUserRepositories().plans.updatePlan(
    scope,
    { shareToken: null, shareExpiresAt: null },
    toPlanTouch(session)
  );
}

/**
 * Đọc dữ liệu kế hoạch công khai bằng shareToken (Read-only, không yêu cầu session)
 */
export async function getPublicPlanByShareToken(
  shareToken: string
): Promise<PublicPlanPosterDto> {
  const { plans } = getUserRepositories();
  const plan = await plans.findByShareToken(shareToken);

  if (!plan || !plan.shareExpiresAt) {
    throw new AppError(ERRORS.PLAN.NOT_FOUND);
  }

  const isExpired = new Date() > new Date(plan.shareExpiresAt);
  if (isExpired) {
    throw new AppError(ERRORS.PLAN.NOT_FOUND);
  }

  const stops = await plans.listStops({ roomId: plan.roomId, planId: plan.id });

  return {
    title: plan.title,
    planDate: plan.planDate,
    startTime: plan.startTime,
    stops: stops.map((s) => ({
      id: s.id,
      name: s.customName || "Điểm hẹn hò",
      plannedTime: s.plannedTime,
      durationMin: s.durationMin,
    })),
    isExpired: false,
  };
}

export interface PlanPosterDataDto {
  planId: string;
  title: string;
  planDate: string;
  startTime: string;
  shareToken: string | null;
  shareExpiresAt: Date | null;
  publicShareUrl: string | null;
  stops: Array<{
    id: string;
    sortOrder: number;
    placeId: string | null;
    placeName: string;
    area: string;
    category: string;
    plannedTime: string | null;
    durationMin: number;
    travelMinutes: number;
    note: string | null;
  }>;
}

/**
 * Lấy dữ liệu dàn trang Canvas Scrapbook Poster:
 * - Bảo mật: Chỉ thành viên trong phòng mới gọi được
 * - Hỗ trợ Privacy Toggle: Ẩn mốc giờ và địa điểm chính xác trên ảnh
 */
export async function getPlanPosterData(
  session: MemberSession,
  planId: string,
  privacy: boolean = false
): Promise<PlanPosterDataDto> {
  const scope = toPlanScope(session, planId);
  const plan = await loadEditablePlan(session, planId);
  const stops = await getUserRepositories().plans.listStops(scope);
  const places = await getAllPublishedPlaces();
  const placeMap = new Map(places.map((p) => [p.id, p]));

  const posterStops = stops.map((stop, idx) => {
    const place = stop.placeId ? placeMap.get(stop.placeId) : null;
    const realName = stop.customName || place?.name || `Trạm dừng #${idx + 1}`;
    const realArea = place?.area || "Hà Nội";
    const realTime = stop.plannedTime || null;

    return {
      id: stop.id,
      sortOrder: stop.sortOrder,
      placeId: stop.placeId,
      placeName: privacy ? `Trạm dừng bí mật #${idx + 1}` : realName,
      area: privacy ? "Hà Nội" : realArea,
      category: place?.categoryLabel || place?.category || "Điểm hẹn",
      plannedTime: privacy ? "??:??" : realTime,
      durationMin: stop.durationMin,
      travelMinutes: stop.travelMinutes ?? 15,
      note: privacy ? null : stop.note,
    };
  });

  return {
    planId: plan.id,
    title: plan.title,
    planDate: plan.planDate,
    startTime: privacy ? "??:??" : plan.startTime,
    shareToken: plan.shareToken ?? null,
    shareExpiresAt: plan.shareExpiresAt ?? null,
    publicShareUrl: plan.shareToken ? `/p/share/${plan.shareToken}` : null,
    stops: posterStops,
  };
}

/**
 * Khách phản hồi thiệp mời kế hoạch (Scoped RSVP):
 * - Xác thực bằng inviteToken (shareToken)
 * - Có Rate Limit theo IP
 * - Bắn thông báo vào room_notices cho hai bạn trong phòng
 * - TUYỆT ĐỐI không cấp cookie session phòng
 */
export async function submitGuestRsvp(
  clientIp: string,
  inviteToken: string,
  input: SubmitRsvpBody
): Promise<{ success: boolean; status: string; responderName: string }> {
  // Rate limit chống spam phản hồi
  assertWithinRateLimit(RATE_LIMITS.INVITE_FAILURE, clientIp);

  const { plans } = getUserRepositories();
  const plan = await plans.findByShareToken(inviteToken);

  if (!plan || !plan.shareExpiresAt || new Date() > new Date(plan.shareExpiresAt)) {
    recordRateLimitHit(RATE_LIMITS.INVITE_FAILURE, clientIp);
    throw new AppError(ERRORS.PLAN.NOT_FOUND);
  }

  const responderName = input.responderName.trim().slice(0, 60);
  if (!responderName) {
    throw new AppError(ERRORS.COMMON.VALIDATION_FAILED);
  }

  const rsvpRecord: PlanRsvpRecord = {
    id: nanoid(21),
    planId: plan.id,
    roomId: plan.roomId,
    responderName,
    status: input.status,
    changeNote: input.changeNote?.trim().slice(0, 500) || null,
    createdAt: new Date(),
  };

  await plans.saveRsvp(rsvpRecord);

  // Bắn thông báo nội bộ cho phòng
  const isConfirmed = input.status === "confirmed";
  await createRoomNotice(plan.roomId, {
    noticeType: "plan_rsvp",
    title: isConfirmed
      ? `💌 ${responderName} đã đồng ý lời mời: "${plan.title}"!`
      : `⏰ ${responderName} xin điều chỉnh giờ cho buổi hẹn: "${plan.title}"`,
    content: input.changeNote ? `Ghi chú: "${input.changeNote}"` : (isConfirmed ? "Đã chốt kèo, chuẩn bị lên đồ thôi!" : "Hãy xem và điều chỉnh lại giờ nhé."),
    metadata: {
      planId: plan.id,
      rsvpId: rsvpRecord.id,
      status: input.status,
      responderName,
    },
  });

  return {
    success: true,
    status: input.status,
    responderName,
  };
}
