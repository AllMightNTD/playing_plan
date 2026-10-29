import { describe, expect, it, beforeEach } from "vitest";
import { resetMemoryStore } from "@/server/db/demo/memory-store";
import { ensureRoomSession } from "@/server/services/user/room.service";
import {
  buildBlindDateSteps,
  createBlindDateTicket,
  getBlindDateTicket,
  checkInPlace,
  getScratchMap,
  createSecretNote,
  listSecretNotes,
} from "./gamification.service";
import { getUserRepositories } from "@/server/db/repositories";
import { HANOI_PLACES } from "@/lib/mock-data";

let ipCounter = 0;
const nextIp = () => `10.9.0.${++ipCounter}`;

beforeEach(() => {
  resetMemoryStore();
});

describe("Gamification Service (Phase 5)", () => {
  // Không có DB nên catalog là bộ seed: p8 = cà phê Hoàn Kiếm, p3 = Tây Hồ, p6 = Ba Đình
  const SEED_IDS = new Set(HANOI_PLACES.map((p) => p.id));

  describe("Blind Date Ticket (Vé Mù Hẹn Hò & Server-side Masking)", () => {
    it("should initialize blind date ticket and mask destinations of future steps", async () => {
      const user = await ensureRoomSession(null, nextIp(), "Dũng");

      const ticket = await getBlindDateTicket(user.session);
      expect(ticket.currentStep).toBe(1);
      expect(ticket.totalSteps).toBe(3);
      expect(ticket.steps.length).toBe(3);

      // Chặng 1 đã mở: địa điểm thật trong catalog
      expect(ticket.steps[0].isUnlocked).toBe(true);
      expect(SEED_IDS.has(ticket.steps[0].placeId)).toBe(true);
      expect(ticket.steps[0].placeName).not.toBe("🔒 Server Locked");

      // Chặng 2 và 3 BẮT BUỘC bị server che hoàn toàn (Server-side Masking)
      for (const step of ticket.steps.slice(1)) {
        expect(step.isUnlocked).toBe(false);
        expect(step.placeName).toBe("🔒 Server Locked");
        expect(step.placeId).toBe("");
        expect(step.district).toBe("");
      }
    });

    it("builds 3 distinct real steps and respects the price tier when the catalog allows", () => {
      const budget = buildBlindDateSteps(HANOI_PLACES, "budget");
      expect(budget.map((s) => s.step)).toEqual([1, 2, 3]);
      expect(new Set(budget.map((s) => s.placeId)).size).toBe(3);
      for (const step of budget) {
        const place = HANOI_PLACES.find((p) => p.id === step.placeId);
        expect(place?.priceLevel).toBe(1);
        expect(step.hint).not.toContain(place!.name);
      }

      // Seed chỉ có 2 địa điểm giá 2-3 nên luxury nới ra toàn catalog thay vì bịa địa điểm
      const luxury = buildBlindDateSteps(HANOI_PLACES, "luxury");
      expect(luxury.every((s) => SEED_IDS.has(s.placeId))).toBe(true);
    });

    it("should create new blind date ticket with different budget tiers", async () => {
      const user = await ensureRoomSession(null, nextIp(), "Linh");

      const budgetTicket = await createBlindDateTicket(user.session, "budget");
      expect(budgetTicket.budgetTier).toBe("budget");
      expect(SEED_IDS.has(budgetTicket.steps[0].placeId)).toBe(true);

      const luxuryTicket = await createBlindDateTicket(user.session, "luxury");
      expect(luxuryTicket.budgetTier).toBe("luxury");
    });
  });

  describe("Check-in Engine & Ripple Unlock", () => {
    it("advances the blind ticket only when checking in at the current step's place", async () => {
      const user = await ensureRoomSession(null, nextIp(), "Couple 1");

      const initialTicket = await getBlindDateTicket(user.session);
      const step1PlaceId = initialTicket.steps[0].placeId;
      const otherPlace = HANOI_PLACES.find((p) => !initialTicket.steps.some((s) => s.placeId === p.id))!;

      // Check-in sai chỗ không mở chặng
      const wrong = await checkInPlace(user.session, { placeId: otherPlace.id, method: "manual_confirm" });
      expect(wrong.advancedBlindStep).toBe(false);

      // Check-in đúng chặng 1
      const checkinResult = await checkInPlace(user.session, { placeId: step1PlaceId, method: "gps_auto" });
      expect(checkinResult.advancedBlindStep).toBe(true);
      expect(checkinResult.checkin.placeId).toBe(step1PlaceId);

      // Server mở khóa chặng 2
      const updatedTicket = await getBlindDateTicket(user.session);
      expect(updatedTicket.currentStep).toBe(2);
      expect(updatedTicket.steps[1].isUnlocked).toBe(true);
      expect(SEED_IDS.has(updatedTicket.steps[1].placeId)).toBe(true);

      // Chặng 3 vẫn bị server khóa
      expect(updatedTicket.steps[2].isUnlocked).toBe(false);
      expect(updatedTicket.steps[2].placeName).toBe("🔒 Server Locked");
    });

    it("derives district from the catalog and scratches the map per district", async () => {
      const user = await ensureRoomSession(null, nextIp(), "Traveler");

      const initialMap = await getScratchMap(user.session);
      expect(initialMap.scratchedCount).toBe(0);
      expect(initialMap.unlockedPercentage).toBe(0);

      // p3 ở Tây Hồ
      const res = await checkInPlace(user.session, { placeId: "p3", method: "manual_confirm" });
      expect(res.checkin.district).toBe("tay_ho");

      const mapAfter1 = await getScratchMap(user.session);
      expect(mapAfter1.scratchedCount).toBe(1);
      expect(mapAfter1.unlockedPercentage).toBe(Math.round((1 / 7) * 100)); // 14%

      // p8 ở Hoàn Kiếm
      await checkInPlace(user.session, { placeId: "p8", method: "gps_auto" });

      const mapAfter2 = await getScratchMap(user.session);
      expect(mapAfter2.scratchedCount).toBe(2);
      expect(mapAfter2.unlockedPercentage).toBe(Math.round((2 / 7) * 100)); // 29%
    });

    it("rejects check-in at a place that is not in the published catalog", async () => {
      const user = await ensureRoomSession(null, nextIp(), "Faker");
      await expect(checkInPlace(user.session, { placeId: "plc_fake", method: "gps_auto" })).rejects.toThrow();
    });
  });

  describe("Secret Notes (Thư Tình Ẩn Tại Quán & Notice Trigger)", () => {
    it("should create secret note and mask content until check-in at the place", async () => {
      const user = await ensureRoomSession(null, nextIp(), "Romeo");

      // 1. Tạo thư tình giấu tại quán: tên và quận lấy từ catalog
      const createdNote = await createSecretNote(user.session, {
        placeId: "p8",
        hint: "Quán cà phê ngắm tàu",
        content: "Em là điều tuyệt vời nhất mùa thu này trao cho anh! ❤️",
      });

      expect(createdNote.isUnlocked).toBe(false);
      expect(createdNote.placeName).toBe(HANOI_PLACES.find((p) => p.id === "p8")!.name);
      expect(createdNote.district).toBe("hoan_kiem");

      // 2. Danh sách thư hiển thị bị server mask
      const notesBefore = await listSecretNotes(user.session);
      expect(notesBefore.length).toBe(1);
      expect(notesBefore[0].isUnlocked).toBe(false);
      expect(notesBefore[0].content).toContain("🔒 Nội dung thư đang được mã hóa");

      // 3. Check-in quán khác không mở thư
      const elsewhere = await checkInPlace(user.session, { placeId: "p3", method: "gps_auto" });
      expect(elsewhere.unlockedSecretNotesCount).toBe(0);

      // 4. Người thương tới đúng quán và Check-in
      const checkinRes = await checkInPlace(user.session, { placeId: "p8", method: "gps_auto" });
      expect(checkinRes.unlockedSecretNotesCount).toBe(1);

      // 5. Thư tình đã được mở khóa, hiện nội dung thật
      const notesAfter = await listSecretNotes(user.session);
      expect(notesAfter[0].isUnlocked).toBe(true);
      expect(notesAfter[0].content).toBe("Em là điều tuyệt vời nhất mùa thu này trao cho anh! ❤️");

      // 6. Kiểm tra thông báo bắn vào room_notices
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
      await createSecretNote(userA.session, { placeId: "p3", content: "Thư bí mật Room A" });

      // Room B không thấy thư của Room A
      const notesB = await listSecretNotes(userB.session);
      expect(notesB.length).toBe(0);

      // Room A check-in không làm thay đổi bản đồ cào của Room B
      await checkInPlace(userA.session, { placeId: "p3", method: "gps_auto" });

      const mapA = await getScratchMap(userA.session);
      const mapB = await getScratchMap(userB.session);

      expect(mapA.scratchedCount).toBe(1);
      expect(mapB.scratchedCount).toBe(0);
    });
  });
});
