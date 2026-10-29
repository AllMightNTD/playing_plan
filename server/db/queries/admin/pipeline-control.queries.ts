import { and, eq, gte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/server/db/client";
import { auditLogs, pipelineControls, pipelineSampleGrades, type PipelineControl } from "@/server/db/schema";

export type SampleItemType = "place" | "video" | "hotspot";

export async function insertSampleGrade(input: {
  itemId: string;
  itemType: SampleItemType;
  isCorrect: boolean;
  feedback: string | null;
  gradedBy: string;
  gradedAt: Date;
}): Promise<void> {
  await db.insert(pipelineSampleGrades).values({ id: nanoid(21), ...input });
}

/** Số lượt chấm và số lượt đúng từ mốc `since` tới nay. */
export async function countGradesSince(since: Date): Promise<{ total: number; correct: number }> {
  const [row] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      correct: sql<number>`COALESCE(SUM(CASE WHEN ${pipelineSampleGrades.isCorrect} THEN 1 ELSE 0 END), 0)`,
    })
    .from(pipelineSampleGrades)
    .where(gte(pipelineSampleGrades.gradedAt, since));
  return { total: Number(row?.total ?? 0), correct: Number(row?.correct ?? 0) };
}

export async function listGradedItemIds(itemType: SampleItemType): Promise<string[]> {
  const rows = await db
    .selectDistinct({ itemId: pipelineSampleGrades.itemId })
    .from(pipelineSampleGrades)
    .where(eq(pipelineSampleGrades.itemType, itemType));
  return rows.map((row) => row.itemId);
}

export async function findPipelineControl(key: string): Promise<PipelineControl | null> {
  const [row] = await db.select().from(pipelineControls).where(eq(pipelineControls.key, key)).limit(1);
  return row ?? null;
}

/** Ghi cờ và nhật ký kiểm toán trong cùng transaction. */
export async function upsertPipelineControl(input: {
  key: string;
  isEnabled: boolean;
  reason: string | null;
  updatedBy: string;
  updatedAt: Date;
}): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(pipelineControls)
      .values(input)
      .onDuplicateKeyUpdate({
        set: { isEnabled: input.isEnabled, reason: input.reason, updatedBy: input.updatedBy, updatedAt: input.updatedAt },
      });
    await tx.insert(auditLogs).values({
      id: nanoid(21),
      adminEmail: input.updatedBy,
      action: input.isEnabled ? "pipeline_pause" : "pipeline_resume",
      targetType: "pipeline_control",
      targetId: input.key,
      changes: { isEnabled: input.isEnabled, reason: input.reason },
      createdAt: input.updatedAt,
    });
  });
}

/** Dùng cho bộ lọc mẫu chấm: bỏ các item đã chấm. */
export function notGraded(itemType: SampleItemType, column: Parameters<typeof eq>[0]) {
  return sql`NOT EXISTS (SELECT 1 FROM ${pipelineSampleGrades} WHERE ${and(
    eq(pipelineSampleGrades.itemType, itemType),
    eq(pipelineSampleGrades.itemId, column)
  )})`;
}
