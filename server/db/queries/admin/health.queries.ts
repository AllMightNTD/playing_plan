import { desc, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { pipelineRuns, type PipelineRun } from "@/server/db/schema";

/** Ping DB và đo độ trễ khứ hồi (ms). */
export async function pingDatabase(): Promise<number> {
  const startedAt = Date.now();
  await db.execute(sql`SELECT 1`);
  return Date.now() - startedAt;
}

export async function findLatestPipelineRun(): Promise<Pick<PipelineRun, "runType" | "status" | "startedAt" | "finishedAt"> | null> {
  const [row] = await db
    .select({
      runType: pipelineRuns.runType,
      status: pipelineRuns.status,
      startedAt: pipelineRuns.startedAt,
      finishedAt: pipelineRuns.finishedAt,
    })
    .from(pipelineRuns)
    .orderBy(desc(pipelineRuns.startedAt))
    .limit(1);
  return row ?? null;
}
