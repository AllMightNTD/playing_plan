import { describe, expect, it, beforeEach } from "vitest";
import { resetMemoryStore } from "@/server/db/demo/memory-store";
import { ensureRoomSession } from "@/server/services/user/room.service";
import {
  generateVirtualVideoScript,
  assertZeroPii,
  clearMemoryVideoCache,
  type AnonymizedVideoPromptPayload,
} from "./memory-script.service";
import { createPlan } from "@/server/services/user/plan.service";
import { getUserRepositories } from "@/server/db/repositories";
import { AppError } from "@/server/http/errors";

let ipCounter = 0;
const nextIp = () => `10.8.0.${++ipCounter}`;

beforeEach(() => {
  resetMemoryStore();
  clearMemoryVideoCache();
});

describe("Virtual Video AI Script Service (Phase 4)", () => {
  it("should generate virtual video slides with beatmap and anonymized payload", async () => {
    const user = await ensureRoomSession(null, nextIp(), "Dũng");

    const result = await generateVirtualVideoScript(user.session, "memory-1", {
      trackId: "hanoi-autumn-lofi",
    });

    expect(result.memoryId).toBe("memory-1");
    expect(result.track.id).toBe("hanoi-autumn-lofi");
    expect(result.track.bpm).toBe(85);
    expect(result.slides.length).toBeGreaterThanOrEqual(3);

    // Kiểm tra cấu trúc từng slide Ken Burns
    for (const slide of result.slides) {
      expect(slide.imageUrl).toBeTruthy();
      expect(slide.caption).toBeTruthy();
      expect(slide.durationSec).toBeGreaterThan(0);
      expect(["zoom-in", "zoom-out", "pan-left", "pan-right"]).toContain(slide.panDirection);
    }

    // Kiểm tra Zero PII payload
    expect(result.anonymizedPayload.stops).toBeDefined();
    expect(result.anonymizedPayload.moods).toContain("#langman");
    expect(result.anonymizedPayload.weather).toBe("29C_clear");
  });

  it("should enforce Zero PII invariant and reject emails, phones, or room IDs", () => {
    const validPayload: AnonymizedVideoPromptPayload = {
      stops: ["cafe", "sunset_spot"],
      moods: ["#langman", "#hoanghon"],
      weather: "29C_clear",
      photoCount: 3,
    };
    expect(() => assertZeroPii(validPayload)).not.toThrow();

    const leakedEmailPayload: AnonymizedVideoPromptPayload = {
      stops: ["cafe"],
      moods: ["#love_dung_linh@gmail.com"],
      weather: "29C_clear",
      photoCount: 1,
    };
    expect(() => assertZeroPii(leakedEmailPayload)).toThrow(/VIOLATION: Phát hiện PII/);

    const leakedPhonePayload: AnonymizedVideoPromptPayload = {
      stops: ["0912345678"],
      moods: ["#langman"],
      weather: "29C_clear",
      photoCount: 1,
    };
    expect(() => assertZeroPii(leakedPhonePayload)).toThrow(/VIOLATION: Phát hiện PII/);

    const leakedRoomIdPayload: AnonymizedVideoPromptPayload = {
      stops: ["room_1234567890abcdef"],
      moods: ["#langman"],
      weather: "29C_clear",
      photoCount: 1,
    };
    expect(() => assertZeroPii(leakedRoomIdPayload)).toThrow(/VIOLATION: Phát hiện PII/);
  });

  it("should trigger Fallback Heuristic Template when simulate429 is true", async () => {
    const user = await ensureRoomSession(null, nextIp(), "Linh");

    const result = await generateVirtualVideoScript(user.session, "mem-sim-429", {
      simulate429: true,
      trackId: "westlake-sunset-acoustic",
    });

    expect(result.isFallback).toBe(true);
    expect(result.fallbackReason).toContain("HTTP 429");
    expect(result.slides.length).toBeGreaterThanOrEqual(3);
    expect(result.slides[0].caption).toContain("Long Biên");
  });

  it("should cache generated virtual video scripts for subsequent requests", async () => {
    const user = await ensureRoomSession(null, nextIp(), "Dũng");

    const res1 = await generateVirtualVideoScript(user.session, "cached-memory", {
      simulate429: true,
    });
    const res2 = await generateVirtualVideoScript(user.session, "cached-memory", {
      simulate429: true,
    });

    expect(res1.createdAt).toBe(res2.createdAt);
    expect(res1.slides[0].caption).toBe(res2.slides[0].caption);
  });

  it("should use real uploaded photos from room_uploads when available", async () => {
    const user = await ensureRoomSession(null, nextIp(), "Couple User");
    const uploadsRepo = getUserRepositories().uploads;

    // Giả lập 2 ảnh thật đã upload của phòng
    await uploadsRepo.insertUpload({
      id: "up_photo_1",
      roomId: user.session.roomId,
      memberId: user.session.memberId,
      memoryId: "mem-real",
      fileName: "real-date-1.webp",
      mimeType: "image/webp",
      sizeBytes: 150000,
      width: 1200,
      height: 900,
      relativePath: `rooms/${user.session.roomId}/memories/up_photo_1.webp`,
      createdAt: new Date(),
      deletedAt: null,
    });

    await uploadsRepo.insertUpload({
      id: "up_photo_2",
      roomId: user.session.roomId,
      memberId: user.session.memberId,
      memoryId: "mem-real",
      fileName: "real-date-2.webp",
      mimeType: "image/webp",
      sizeBytes: 180000,
      width: 1200,
      height: 900,
      relativePath: `rooms/${user.session.roomId}/memories/up_photo_2.webp`,
      createdAt: new Date(),
      deletedAt: null,
    });

    const result = await generateVirtualVideoScript(user.session, "mem-real");
    expect(result.slides.length).toBe(2);
    expect(result.slides[0].imageUrl).toBe("/api/v1/user/uploads/up_photo_1");
    expect(result.slides[1].imageUrl).toBe("/api/v1/user/uploads/up_photo_2");
  });

  it("should enforce room isolation: User B cannot generate virtual video for Room A memory", async () => {
    const userA = await ensureRoomSession(null, nextIp(), "User A");
    const userB = await ensureRoomSession(null, nextIp(), "User B");

    // Tạo kế hoạch/kỷ niệm của Room A
    const planA = await createPlan(userA.session, {
      title: "Kỷ niệm mật ngọt Room A",
      planDate: "2026-11-05",
      startTime: "18:00",
    });

    // User A sinh kịch bản thành công
    const resultA = await generateVirtualVideoScript(userA.session, planA.id);
    expect(resultA.memoryId).toBe(planA.id);

    // User B cố tình dùng planId của Room A -> Phải ném 404 NOT_FOUND!
    await expect(generateVirtualVideoScript(userB.session, planA.id)).rejects.toThrowError(
      AppError
    );

    // User B cố tình dùng ID phòng ngoại -> Phải ném 404 NOT_FOUND!
    await expect(generateVirtualVideoScript(userB.session, "foreign-room-123")).rejects.toThrowError(
      AppError
    );
  });
});
