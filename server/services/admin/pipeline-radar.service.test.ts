import { beforeEach, describe, expect, it, vi } from "vitest";
import { gradeSampleItem, rollbackBatch, setPublishPauseByAdmin } from "./pipeline-radar.service";
import { countGradesSince, insertSampleGrade } from "@/server/db/queries/admin/pipeline-control.queries";
import { getPublishPauseState, setPublishPaused, SYSTEM_ACTOR } from "@/server/services/pipeline/pipeline-control.service";

vi.mock("@/server/db/queries/admin/pipeline-control.queries", () => ({
  countGradesSince: vi.fn(),
  insertSampleGrade: vi.fn(),
  notGraded: vi.fn(),
}));
vi.mock("@/server/services/pipeline/pipeline-control.service", () => ({
  SYSTEM_ACTOR: "system:circuit-breaker",
  getPublishPauseState: vi.fn(),
  setPublishPaused: vi.fn(),
}));

const NOT_PAUSED = { isPaused: false, source: null, reason: null, updatedBy: null, updatedAt: null };
const ADMIN = "admin@datemate.vn";

describe("Pipeline Radar Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPublishPauseState).mockResolvedValue(NOT_PAUSED);
  });

  describe("gradeSampleItem & Circuit Breaker", () => {
    it("lưu lượt chấm vào DB kèm người chấm và tính accuracy từ DB", async () => {
      vi.mocked(countGradesSince).mockResolvedValue({ total: 4, correct: 3 });

      const res = await gradeSampleItem({ itemId: "cand_1", type: "place", isCorrect: true, feedback: " ok " }, ADMIN);

      expect(insertSampleGrade).toHaveBeenCalledWith(
        expect.objectContaining({ itemId: "cand_1", itemType: "place", isCorrect: true, feedback: "ok", gradedBy: ADMIN })
      );
      expect(res.newRollingAccuracy).toBe(75);
      expect(res.autoPaused).toBe(false); // mới 4 mẫu, chưa đủ để phanh
      expect(setPublishPaused).not.toHaveBeenCalled();
    });

    it("bật phanh publish trong DB khi accuracy < 85% trên đủ 10 mẫu", async () => {
      vi.mocked(countGradesSince).mockResolvedValue({ total: 10, correct: 8 });

      const res = await gradeSampleItem({ itemId: "cand_2", type: "place", isCorrect: false }, ADMIN);

      expect(res.autoPaused).toBe(true);
      expect(setPublishPaused).toHaveBeenCalledWith(true, SYSTEM_ACTOR, expect.stringContaining("80%"));
    });

    it("không ghi đè phanh đang bật", async () => {
      vi.mocked(countGradesSince).mockResolvedValue({ total: 20, correct: 10 });
      vi.mocked(getPublishPauseState).mockResolvedValue({ ...NOT_PAUSED, isPaused: true, source: "admin" });

      const res = await gradeSampleItem({ itemId: "cand_3", type: "place", isCorrect: false }, ADMIN);

      expect(res.autoPaused).toBe(true);
      expect(setPublishPaused).not.toHaveBeenCalled();
    });

    it("accuracy null khi chưa có lượt chấm", async () => {
      vi.mocked(countGradesSince).mockResolvedValue({ total: 0, correct: 0 });
      const res = await gradeSampleItem({ itemId: "cand_4", type: "place", isCorrect: true }, ADMIN);
      expect(res.newRollingAccuracy).toBeNull();
    });
  });

  describe("setPublishPauseByAdmin", () => {
    it("không cho gỡ phanh khi phanh đến từ biến môi trường", async () => {
      vi.mocked(getPublishPauseState).mockResolvedValue({ ...NOT_PAUSED, isPaused: true, source: "env" });
      await expect(setPublishPauseByAdmin(ADMIN, false, "đã kiểm tra")).rejects.toThrow();
      expect(setPublishPaused).not.toHaveBeenCalled();
    });

    it("ghi cờ kèm email admin và lý do", async () => {
      await setPublishPauseByAdmin(ADMIN, false, "Đã rà lại mẫu sai");
      expect(setPublishPaused).toHaveBeenCalledWith(false, ADMIN, "Đã rà lại mẫu sai");
    });
  });

  describe("rollbackBatch", () => {
    it("should throw error if batchId is missing", async () => {
      await expect(rollbackBatch("")).rejects.toThrow();
    });
  });
});
