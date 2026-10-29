import { isDatabaseConfigured } from "@/server/db/client";
import { countAdminStats } from "@/server/db/queries/admin/stats.queries";
import type { PlaceStatus } from "@/lib/validators/admin";

export interface AdminDashboardStats {
  /** Chỉ trả cờ bật/tắt, tuyệt đối không lộ giá trị secret. */
  services: { databaseConfigured: boolean; geminiConfigured: boolean };
  /** `null` khi chưa cấu hình DB: dashboard vẫn hiển thị được trạng thái dịch vụ. */
  counts: {
    places: { total: number; byStatus: Record<PlaceStatus, number> };
    rooms: { total: number; paired: number };
    plans: number;
    matches: number;
    pendingCandidates: number;
  } | null;
  generatedAt: string;
}

function hasEnv(name: string): boolean {
  return (process.env[name] ?? "").trim().length > 0;
}

export async function getAdminDashboardStats(now: Date = new Date()): Promise<AdminDashboardStats> {
  const databaseConfigured = isDatabaseConfigured();
  const services = { databaseConfigured, geminiConfigured: hasEnv("GEMINI_API_KEY") };
  if (!databaseConfigured) return { services, counts: null, generatedAt: now.toISOString() };

  const { placesByStatus, ...rest } = await countAdminStats();
  const total = Object.values(placesByStatus).reduce((sum, count) => sum + count, 0);
  return {
    services,
    counts: { places: { total, byStatus: placesByStatus }, ...rest },
    generatedAt: now.toISOString(),
  };
}
