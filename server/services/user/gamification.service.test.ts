import { describe, expect, it, beforeEach } from "vitest";
import { resetMemoryStore } from "@/server/db/demo/memory-store";
import { ensureRoomSession } from "@/server/services/user/room.service";
import {
  createBlindDateTicket,
  getBlindDateTicket,
  checkInPlace,
  getScratchMap,
  createSecretNote,
  listSecretNotes,
} from "./gamification.service";
import { getUserRepositories } from "@/server/db/repositories";

let ipCounter = 0;
const nextIp = () => `10.9.0.${++ipCounter}`;

beforeEach(() => {
  resetMemoryStore();
});

describe("Gamification Service (Phase 5)", () => {
  describe("Blind Date Ticket (Vé Mù Hẹn Hò & Server-side Masking)", () => {
    it("should initialize blind date ticket and mask destinations of future steps", async () => {
      const user = await ensureRoomSession(null, nextIp(), "Dũng");

      const ticket = await getBlindDateTicket(user.session);
      expect(ticket.currentStep).toBe(1);
      expect(ticket.totalSteps).toBe(3);
      expect(ticket.steps.length).toBe(3);

      // Chặng 1 đã mở: Có tên quán cụ thể
      expect(ticket.steps[0].isUnlocked).toBe(true);
      expect(ticket.steps[0].placeName).not.toBe("🔒 Server Locked");

      // Chặng 2 và 3 BẮT BUỘC bị server che hoàn toàn (Server-side Masking)
      expect(ticket.steps[1].isUnlocked).toBe(false);
      expect(ticket.steps[1].placeName).toBe("🔒 Server Locked");
      expect(ticket.steps[1].district).toBe("");

      expect(ticket.steps[2].isUnlocked).toBe(false);
      expect(ticket.steps[2].placeName).toBe("🔒 Server Locked");
      expect(ticket.steps[2].district).toBe("");
    });

    it("should create new blind date ticket with different budget tiers", async () => {
      const user = await ensureRoomSession(null, nextIp(), "Linh");

      const budgetTicket = await createBlindDateTicket(user.session, "budget");
      expect(budgetTicket.budgetTier).toBe("budget");
      expect(budgetTicket.steps[0].placeName).toContain("Café Giảng");

      const luxuryTicket = await createBlindDateTicket(user.session, "luxury");
      expect(luxuryTicket.budgetTier).toBe("luxury");
      expect(luxuryTicket.steps[0].placeName).toContain("Sunset Bar");
    });
  });

  describe("Check-in Engine & Ripple Unlock", () => {
    it("should advance blind date ticket upon check-in and unlock next step", async () => {
      const user = await ensureRoomSession(null, nextIp(), "Couple 1");

      const initialTicket = await getBlindDateTicket(user.session);
      expect(initialTicket.currentStep).toBe(1);

      // Check-in chặng 1
      const checkinResult = await checkInPlace(user.session, {
        placeName: "Serein Café Cầu Long Biên",
        district: "hoan_kiem",
        method: "gps_auto",
      });

      expect(checkinResult.advancedBlindStep).toBe(true);
      expect(checkinResult.checkin.district).toBe("hoan_kiem");

      // Server mở khóa chặng 2
      const updatedTicket = await getBlindDateTicket(user.session);
      expect(updatedTicket.currentStep).toBe(2);
      expect(updatedTicket.steps[1].isUnlocked).toBe(true);
      expect(updatedTicket.steps[1].placeName).toContain("Bãi đá sông Hồng");

      // Chặng 3 vẫn bị server khóa
      expect(updatedTicket.steps[2].isUnlocked).toBe(false);
      expect(updatedTicket.steps[2].placeName).toBe("🔒 Server Locked");
    });

    it("should update scratch map percentage based on check-ins across 7 districts", async () => {
      const user = await ensureRoomSession(null, nextIp(), "Traveler");

      const initialMap = await getScratchMap(user.session);
      expect(initialMap.scratchedCount).toBe(0);
      expect(initialMap.unlockedPercentage).toBe(0);

      // Check-in quận Tây Hồ
      await checkInPlace(user.session, {
        placeName: "Cà phê ven hồ",
        district: "tay_ho",
        method: "manual_confirm",
      });

      const mapAfter1 = await getScratchMap(user.session);
      expect(mapAfter1.scratchedCount).toBe(1);
      expect(mapAfter1.unlockedPercentage).toBe(Math.round((1 / 7) * 100)); // 14%

      // Check-in quận Hoàn Kiếm
      await checkInPlace(user.session, {
        placeName: "Tràng Tiền",
        district: "hoan_kiem",
        method: "gps_auto",
      });

      const mapAfter2 = await getScratchMap(user.session);
      expect(mapAfter2.scratchedCount).toBe(2);
      expect(mapAfter2.unlockedPercentage).toBe(Math.round((2 / 7) * 100)); // 29%
    });
  });

  describe("Secret Notes (Thư Tình Ẩn Tại Quán & Notice Trigger)", () => {
    it("should create secret note and mask content until check-in at the place", async () => {
      const user = await ensureRoomSession(null, nextIp(), "Romeo");

      // 1. Tạo thư tình giấu tại quán
      const createdNote = await createSecretNote(user.session, {
        placeName: "Serein Café Cầu Long Biên",
        district: "hoan_kiem",
        hint: "Quán cà phê ngắm tàu",
        content: "Em là điều tuyệt vời nhất mùa thu này trao cho anh! ❤️",
      });

      expect(createdNote.isUnlocked).toBe(false);

      // 2. Danh sách thư hiển thị bị server mask
      const notesBefore = await listSecretNotes(user.session);
      expect(notesBefore.length).toBe(1);
      expect(notesBefore[0].isUnlocked).toBe(false);
      expect(notesBefore[0].content).toContain("🔒 Nội dung thư đang được mã hóa");

      // 3. Người thương tới quán và Check-in
      const checkinRes = await checkInPlace(user.session, {
        placeName: "Serein Café Cầu Long Biên",
        district: "hoan_kiem",
        method: "gps_auto",
      });

      expect(checkinRes.unlockedSecretNotesCount).toBe(1);

      // 4. Thư tình đã được mở khóa, hiện nội dung thật
      const notesAfter = await listSecretNotes(user.session);
      expect(notesAfter[0].isUnlocked).toBe(true);
      expect(notesAfter[0].content).toBe("Em là điều tuyệt vời nhất mùa thu này trao cho anh! ❤️");

      // 5. Kiểm tra thông báo bắn vào room_notices
      const notices = await getUserRepositories().notices.listNotices(user.session.roomId);
      const secretNotice = notices.find((n) => n.noticeType === "secret_note_unlocked");
      expect(secretNotice).toBeDefined();
      expect(secretNotice?.title).toContain("Thư tình bí mật đã mở khóa");
    });
  });

  describe("Multi-Tenant Room Isolation (Gamification)", () => {
    it("should strictly isolate blind date tickets and secret notes between Room A and Room B", async () => {
      const userA = await ensureRoomSession(null, nextIp(), "User A");
      const userB = await ensureRoomSession(null, nextIp(), "User B");

      // Room A tạo thư tình
      await createSecretNote(userA.session, {
        placeName: "Quán riêng Room A",
        content: "Thư bí mật Room A",
      });

      // Room B không thấy thư của Room A
      const notesB = await listSecretNotes(userB.session);
      expect(notesB.length).toBe(0);

      // Room A check-in không làm thay đổi bản đồ cào của Room B
      await checkInPlace(userA.session, {
        placeName: "Quán riêng Room A",
        district: "tay_ho",
        method: "gps_auto",
      });

      const mapA = await getScratchMap(userA.session);
      const mapB = await getScratchMap(userB.session);

      expect(mapA.scratchedCount).toBe(1);
      expect(mapB.scratchedCount).toBe(0);
    });
  });
});
