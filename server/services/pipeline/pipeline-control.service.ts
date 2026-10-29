import { isDatabaseConfigured } from "@/server/db/client";
import { findPipelineControl, upsertPipelineControl } from "@/server/db/queries/admin/pipeline-control.queries";
import { AppError, ERRORS } from "@/server/http/errors";

export const PUBLISH_PAUSED_KEY = "publish_paused";
/** Người thực hiện khi circuit breaker tự bật phanh (không phải admin cụ thể). */
export const SYSTEM_ACTOR = "system:circuit-breaker";

export interface PublishPauseState {
  isPaused: boolean;
  source: "env" | "breaker" | "admin" | null;
  reason: string | null;
  updatedBy: string | null;
  updatedAt: Date | null;
}

/**
 * Phanh publish dùng chung cho web admin và cron: env EMERGENCY_HALT_PUBLISH (phanh tay khi deploy)
 * hoặc cờ `publish_paused` trong DB (circuit breaker hoặc admin bật).
 */
export async function getPublishPauseState(): Promise<PublishPauseState> {
  if (process.env.EMERGENCY_HALT_PUBLISH === "true") {
    return { isPaused: true, source: "env", reason: "EMERGENCY_HALT_PUBLISH=true", updatedBy: null, updatedAt: null };
  }
  if (!isDatabaseConfigured()) {
    return { isPaused: false, source: null, reason: null, updatedBy: null, updatedAt: null };
  }

  const control = await findPipelineControl(PUBLISH_PAUSED_KEY);
  if (!control?.isEnabled) {
    return { isPaused: false, source: null, reason: control?.reason ?? null, updatedBy: control?.updatedBy ?? null, updatedAt: control?.updatedAt ?? null };
  }
  return {
    isPaused: true,
    source: control.updatedBy === SYSTEM_ACTOR ? "breaker" : "admin",
    reason: control.reason,
    updatedBy: control.updatedBy,
    updatedAt: control.updatedAt,
  };
}

export async function isPublishPaused(): Promise<boolean> {
  return (await getPublishPauseState()).isPaused;
}

/** Chặn mọi đường promote/publish tự động (cron, script bulk) khi phanh đang bật. */
export async function assertPublishNotPaused(): Promise<void> {
  const pause = await getPublishPauseState();
  if (pause.isPaused) {
    throw new AppError(ERRORS.PLACE.PUBLISH_HALTED_BY_CIRCUIT_BREAKER, {
      source: pause.source ?? "unknown",
      reason: pause.reason ?? "",
    });
  }
}

export async function setPublishPaused(isPaused: boolean, actor: string, reason: string | null): Promise<void> {
  await upsertPipelineControl({
    key: PUBLISH_PAUSED_KEY,
    isEnabled: isPaused,
    reason,
    updatedBy: actor,
    updatedAt: new Date(),
  });
}
