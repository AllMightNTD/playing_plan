import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/server/db/client";
import { pipelineRuns, type NewPipelineRun } from "@/server/db/schema";

export type PipelineRunType = NewPipelineRun["runType"];

export interface TrackedRunOutcome<T> {
  result: T;
  status?: "success" | "paused";
  promotedCount?: number;
  quotaUsed?: number;
  summary?: Record<string, unknown>;
}

/**
 * Bọc một lần chạy pipeline/script: ghi pipeline_runs trạng thái running, rồi success/paused/failed khi xong.
 * Radar và badge sức khỏe admin đọc bảng này để biết lần chạy gần nhất. Không có DB thì chạy thường.
 */
export async function runTrackedPipeline<T>(
  runType: PipelineRunType,
  task: () => Promise<TrackedRunOutcome<T>>
): Promise<T> {
  if (!isDatabaseConfigured()) return (await task()).result;

  const id = randomUUID();
  await db.insert(pipelineRuns).values({ id, runType, startedAt: new Date(), status: "running" });

  try {
    const outcome = await task();
    await db
      .update(pipelineRuns)
      .set({
        finishedAt: new Date(),
        status: outcome.status ?? "success",
        promotedCount: outcome.promotedCount ?? 0,
        quotaUsed: outcome.quotaUsed ?? 0,
        summaryJson: outcome.summary ?? {},
      })
      .where(eq(pipelineRuns.id, id));
    return outcome.result;
  } catch (err) {
    await db
      .update(pipelineRuns)
      .set({ finishedAt: new Date(), status: "failed", summaryJson: { error: err instanceof Error ? err.message : String(err) } })
      .where(eq(pipelineRuns.id, id));
    throw err;
  }
}
