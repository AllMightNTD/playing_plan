import { eq, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { candidatePlaces, datePlans, matches, places, rooms } from "@/server/db/schema";
import { PLACE_STATUSES, type PlaceStatus } from "@/lib/validators/admin";

export interface AdminStatsCounts {
  placesByStatus: Record<PlaceStatus, number>;
  rooms: { total: number; paired: number };
  plans: number;
  matches: number;
  pendingCandidates: number;
}

// Driver TiDB serverless trả COUNT(*) dạng chuỗi nên luôn ép về number.
const countAll = sql<string>`COUNT(*)`;

async function countPlacesByStatus(): Promise<Record<PlaceStatus, number>> {
  const rows = await db.select({ status: places.status, count: countAll }).from(places).groupBy(places.status);
  const byStatus = Object.fromEntries(PLACE_STATUSES.map((status) => [status, 0])) as Record<PlaceStatus, number>;
  for (const row of rows) byStatus[row.status] = Number(row.count);
  return byStatus;
}

async function countRooms(): Promise<{ total: number; paired: number }> {
  const [row] = await db
    .select({
      total: countAll,
      paired: sql<string>`SUM(CASE WHEN ${rooms.status} = 'paired' THEN 1 ELSE 0 END)`,
    })
    .from(rooms)
    .where(ne(rooms.status, "deleted"));
  return { total: Number(row?.total ?? 0), paired: Number(row?.paired ?? 0) };
}

async function countRows(query: Promise<Array<{ count: string }>>): Promise<number> {
  const [row] = await query;
  return Number(row?.count ?? 0);
}

/** Đếm song song mọi chỉ số cho dashboard admin. */
export async function countAdminStats(): Promise<AdminStatsCounts> {
  const [placesByStatus, roomCounts, plans, matchCount, pendingCandidates] = await Promise.all([
    countPlacesByStatus(),
    countRooms(),
    countRows(db.select({ count: countAll }).from(datePlans)),
    countRows(db.select({ count: countAll }).from(matches)),
    countRows(db.select({ count: countAll }).from(candidatePlaces).where(eq(candidatePlaces.status, "pending"))),
  ]);
  return { placesByStatus, rooms: roomCounts, plans, matches: matchCount, pendingCandidates };
}
