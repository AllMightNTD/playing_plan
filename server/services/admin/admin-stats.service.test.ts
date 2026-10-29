import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminDashboardStats } from "./admin-stats.service";
import { isDatabaseConfigured } from "@/server/db/client";
import { countAdminStats } from "@/server/db/queries/admin/stats.queries";

vi.mock("@/server/db/client", () => ({ isDatabaseConfigured: vi.fn() }));
vi.mock("@/server/db/queries/admin/stats.queries", () => ({ countAdminStats: vi.fn() }));

const NOW = new Date("2026-10-29T03:00:00.000Z");
const SECRET_KEY = "AIza-secret-key-khong-duoc-lo";

describe("getAdminDashboardStats", () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
  });

  it("trả counts null và không truy vấn DB khi chưa cấu hình DATABASE_URL", async () => {
    vi.mocked(isDatabaseConfigured).mockReturnValue(false);
    delete process.env.GEMINI_API_KEY;

    const stats = await getAdminDashboardStats(NOW);

    expect(stats).toEqual({
      services: { databaseConfigured: false, geminiConfigured: false },
      counts: null,
      generatedAt: NOW.toISOString(),
    });
    expect(countAdminStats).not.toHaveBeenCalled();
  });

  it("cộng tổng địa điểm theo trạng thái và giữ nguyên các chỉ số khác", async () => {
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(countAdminStats).mockResolvedValue({
      placesByStatus: { draft: 4, published: 300, hidden: 1 },
      rooms: { total: 12, paired: 7 },
      plans: 9,
      matches: 21,
      pendingCandidates: 55,
    });

    const stats = await getAdminDashboardStats(NOW);

    expect(stats.counts).toEqual({
      places: { total: 305, byStatus: { draft: 4, published: 300, hidden: 1 } },
      rooms: { total: 12, paired: 7 },
      plans: 9,
      matches: 21,
      pendingCandidates: 55,
    });
  });

  it("chỉ báo cờ Gemini, không bao giờ trả giá trị key", async () => {
    vi.mocked(isDatabaseConfigured).mockReturnValue(false);
    process.env.GEMINI_API_KEY = SECRET_KEY;

    const stats = await getAdminDashboardStats(NOW);

    expect(stats.services.geminiConfigured).toBe(true);
    expect(JSON.stringify(stats)).not.toContain(SECRET_KEY);
  });

  it("coi key chỉ có khoảng trắng là chưa cấu hình", async () => {
    vi.mocked(isDatabaseConfigured).mockReturnValue(false);
    process.env.GEMINI_API_KEY = "   ";

    expect((await getAdminDashboardStats(NOW)).services.geminiConfigured).toBe(false);
  });
});
