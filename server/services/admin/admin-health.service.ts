import { isDatabaseConfigured } from "@/server/db/client";
import { findLatestPipelineRun, pingDatabase } from "@/server/db/queries/admin/health.queries";
import { getPublishPauseState, type PublishPauseState } from "@/server/services/pipeline/pipeline-control.service";
import { getQuotaStatus } from "@/server/services/youtube/quota-ledger";

export type HealthLevel = "ok" | "degraded" | "down";

export interface HealthCheck {
  key: "database" | "pipeline" | "publish" | "youtube";
  level: HealthLevel;
  message: string;
}

export interface AdminHealthDto {
  level: HealthLevel;
  checks: HealthCheck[];
  checkedAt: string;
}

const SLOW_DB_MS = 1500;
const STALE_RUN_MS = 36 * 60 * 60 * 1000;
const STUCK_RUN_MS = 3 * 60 * 60 * 1000;

export interface HealthInputs {
  databaseConfigured: boolean;
  dbLatencyMs: number | null;
  dbError: string | null;
  latestRun: { runType: string; status: string; startedAt: Date; finishedAt: Date | null } | null;
  pause: Pick<PublishPauseState, "isPaused" | "source" | "reason"> | null;
  youtubeHalted: boolean | null;
}

function checkPipeline(run: HealthInputs["latestRun"], now: Date): HealthCheck {
  if (!run) return { key: "pipeline", level: "degraded", message: "Pipeline chưa chạy lần nào." };
  const ageMs = now.getTime() - run.startedAt.getTime();
  const hours = Math.round(ageMs / 3600000);
  if (run.status === "failed") return { key: "pipeline", level: "degraded", message: `Lần chạy gần nhất (${run.runType}) thất bại ${hours} giờ trước.` };
  if (run.status === "running" && ageMs > STUCK_RUN_MS) {
    return { key: "pipeline", level: "degraded", message: `Lần chạy ${run.runType} treo ${hours} giờ chưa xong.` };
  }
  if (ageMs > STALE_RUN_MS) return { key: "pipeline", level: "degraded", message: `Pipeline không chạy ${hours} giờ qua.` };
  return { key: "pipeline", level: "ok", message: `Lần chạy gần nhất ${run.status} ${hours} giờ trước.` };
}

/** Hàm thuần: gom kết quả các phép kiểm tra thành mức sức khỏe chung (lấy mức tệ nhất). */
export function evaluateAdminHealth(inputs: HealthInputs, now: Date): AdminHealthDto {
  const checks: HealthCheck[] = [];

  if (!inputs.databaseConfigured) {
    checks.push({ key: "database", level: "down", message: "Chưa cấu hình DATABASE_URL." });
  } else if (inputs.dbError) {
    checks.push({ key: "database", level: "down", message: `Không kết nối được DB: ${inputs.dbError}` });
  } else {
    const slow = (inputs.dbLatencyMs ?? 0) > SLOW_DB_MS;
    checks.push({ key: "database", level: slow ? "degraded" : "ok", message: `DB phản hồi ${inputs.dbLatencyMs} ms.` });
    checks.push(checkPipeline(inputs.latestRun, now));
    if (inputs.pause?.isPaused) {
      checks.push({ key: "publish", level: "degraded", message: `Phanh publish đang bật: ${inputs.pause.reason ?? inputs.pause.source}.` });
    }
    if (inputs.youtubeHalted) {
      checks.push({ key: "youtube", level: "degraded", message: "Đã hết hạn mức YouTube API hôm nay." });
    }
  }

  const level: HealthLevel = checks.some((c) => c.level === "down")
    ? "down"
    : checks.some((c) => c.level === "degraded")
      ? "degraded"
      : "ok";
  return { level, checks, checkedAt: now.toISOString() };
}

export async function getAdminHealth(now: Date = new Date()): Promise<AdminHealthDto> {
  const inputs: HealthInputs = {
    databaseConfigured: isDatabaseConfigured(),
    dbLatencyMs: null,
    dbError: null,
    latestRun: null,
    pause: null,
    youtubeHalted: null,
  };
  if (!inputs.databaseConfigured) return evaluateAdminHealth(inputs, now);

  try {
    inputs.dbLatencyMs = await pingDatabase();
  } catch (err) {
    inputs.dbError = err instanceof Error ? err.message : String(err);
    return evaluateAdminHealth(inputs, now);
  }

  const [latestRun, pause, quota] = await Promise.all([findLatestPipelineRun(), getPublishPauseState(), getQuotaStatus(now)]);
  inputs.latestRun = latestRun;
  inputs.pause = pause;
  inputs.youtubeHalted = quota.isHalted;
  return evaluateAdminHealth(inputs, now);
}
