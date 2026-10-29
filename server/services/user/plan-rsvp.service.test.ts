import { describe, expect, it, beforeEach } from "vitest";
import { resetMemoryStore } from "@/server/db/demo/memory-store";
import { ensureRoomSession } from "@/server/services/user/room.service";
import { createPlan } from "@/server/services/user/plan.service";
import { addStop } from "@/server/services/user/plan-items.service";
import {
  createPlanShareToken,
  revokePlanShareToken,
  getPublicPlanByShareToken,
  submitGuestRsvp,
} from "./plan-rsvp.service";
import { listRoomNotices } from "./room-notice.service";
import { AppError } from "@/server/http/errors";

let ipCounter = 0;
const nextIp = () => `10.10.0.${++ipCounter}`;

beforeEach(() => {
  resetMemoryStore();
});

describe("Plan RSVP & Share Service (Phase 1)", () => {
  it("should generate 72h shareToken and allow public viewing without session", async () => {
    const user = await ensureRoomSession(null, nextIp(), "Partner A");

    const plan = await createPlan(user.session, {
      title: "Thiệp mời sinh nhật em",
      planDate: "2026-11-20",
      startTime: "18:30",
    });

    await addStop(user.session, plan.id, {
      customName: "Nhà hàng Steak",
      plannedTime: "18:30",
    });

    // Tạo shareToken
    const share = await createPlanShareToken(user.session, plan.id);
    expect(share.shareToken).toBeDefined();
    expect(share.shareUrl).toBe(`/p/share/${share.shareToken}`);

    // Khách xem poster bằng shareToken (Không cần session)
    const poster = await getPublicPlanByShareToken(share.shareToken);
    expect(poster.title).toBe("Thiệp mời sinh nhật em");
    expect(poster.stops.length).toBe(1);
    expect(poster.isExpired).toBe(false);

    // Thu hồi shareToken
    await revokePlanShareToken(user.session, plan.id);

    // Xem lại sau khi thu hồi -> Phải báo 404
    await expect(getPublicPlanByShareToken(share.shareToken)).rejects.toThrowError(AppError);
  });

  it("should accept guest RSVP, save response, and notify room members without issuing room session", async () => {
    const user = await ensureRoomSession(null, nextIp(), "Partner A");

    const plan = await createPlan(user.session, {
      title: "Buổi hẹn cuối tuần",
      planDate: "2026-11-25",
      startTime: "19:00",
    });

    const share = await createPlanShareToken(user.session, plan.id);

    // Khách gửi RSVP đồng ý
    const guestIp = nextIp();
    const rsvpResult = await submitGuestRsvp(guestIp, share.shareToken, {
      responderName: "Em iu",
      status: "confirmed",
      changeNote: "Em thích lắm, em sẽ đến đúng giờ!",
    });

    expect(rsvpResult.success).toBe(true);
    expect(rsvpResult.status).toBe("confirmed");
    expect(rsvpResult.responderName).toBe("Em iu");

    // Thành viên trong phòng nhận được thông báo trong room_notices
    const notices = await listRoomNotices(user.session);
    expect(notices.length).toBe(1);
    expect(notices[0].noticeType).toBe("plan_rsvp");
    expect(notices[0].title).toContain("Em iu đã đồng ý lời mời");
    expect(notices[0].content).toContain("Em thích lắm");
  });

  it("should accept change request RSVP and notify room members", async () => {
    const user = await ensureRoomSession(null, nextIp(), "Partner A");

    const plan = await createPlan(user.session, {
      title: "Hẹn ăn tối",
      planDate: "2026-11-26",
      startTime: "18:00",
    });

    const share = await createPlanShareToken(user.session, plan.id);

    // Khách xin đổi giờ
    const guestIp = nextIp();
    const rsvpResult = await submitGuestRsvp(guestIp, share.shareToken, {
      responderName: "Anh ấy",
      status: "change_requested",
      changeNote: "Anh bận họp đến 18:30, lùi lại 19:00 được không em?",
    });

    expect(rsvpResult.status).toBe("change_requested");

    const notices = await listRoomNotices(user.session);
    expect(notices.length).toBe(1);
    expect(notices[0].title).toContain("Anh ấy xin điều chỉnh giờ");
    expect(notices[0].content).toContain("lùi lại 19:00");
  });

  it("should get plan poster data and support privacy mode masking", async () => {
    const userA = await ensureRoomSession(null, nextIp(), "Partner A");
    const userB = await ensureRoomSession(null, nextIp(), "User B");

    const plan = await createPlan(userA.session, {
      title: "Chiều thu Hà Nội",
      planDate: "2026-11-28",
      startTime: "16:30",
    });

    await addStop(userA.session, plan.id, {
      customName: "Serein Café",
      plannedTime: "16:30",
    });

    const { getPlanPosterData } = await import("./plan-rsvp.service");

    // Lấy poster bình thường
    const normalPoster = await getPlanPosterData(userA.session, plan.id, false);
    expect(normalPoster.title).toBe("Chiều thu Hà Nội");
    expect(normalPoster.startTime).toBe("16:30");
    expect(normalPoster.stops[0].placeName).toBe("Serein Café");
    expect(normalPoster.stops[0].plannedTime).toBe("16:30");

    // Lấy poster chế độ riêng tư (Privacy mode)
    const privacyPoster = await getPlanPosterData(userA.session, plan.id, true);
    expect(privacyPoster.startTime).toBe("??:??");
    expect(privacyPoster.stops[0].placeName).toBe("Trạm dừng bí mật #1");
    expect(privacyPoster.stops[0].plannedTime).toBe("??:??");

    // User B từ phòng khác không thể lấy poster data -> Báo 404
    await expect(getPlanPosterData(userB.session, plan.id)).rejects.toThrow();
  });
});
