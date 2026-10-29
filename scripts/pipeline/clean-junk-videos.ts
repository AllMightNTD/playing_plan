import { db } from "@/server/db/client";
import { sql } from "drizzle-orm";

const JUNK_TERMS = [
  "Nga",
  "Trung Quốc",
  "Hồng Kông",
  "Hongkong",
  "Hong Kong",
  "Thái Lan",
  "Kenya",
  "Châu Âu",
  "Iceland",
  "Băng Đảo",
  "Thụy Sĩ",
  "Đức - Áo",
  "Moscow",
  "Russia",
];

async function main() {
  console.log(
    "🧹 [Clean Junk Videos] Bắt đầu dọn dẹp các video lạc đề (nước ngoài)...",
  );

  let deletedMediaCount = 0;
  for (const term of JUNK_TERMS) {
    const res = await db.execute(
      sql`DELETE FROM place_media WHERE type = 'video' AND caption LIKE ${`%${term}%`}`,
    );
    const affected =
      (res as any)?.rowsAffected ?? (res as any)?.[0]?.affectedRows ?? 0;
    if (affected > 0) {
      console.log(
        `   - Đã xóa ${affected} video chứa từ khóa "${term}" khỏi place_media.`,
      );
      deletedMediaCount += Number(affected);
    }
  }

  console.log(
    `✨ Đã dọn dẹp thành công tổng cộng ${deletedMediaCount} video lạc đề khỏi database!`,
  );
}

main().catch(console.error);
