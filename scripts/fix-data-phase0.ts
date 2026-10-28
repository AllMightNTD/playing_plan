import { db } from "@/server/db/client";
import { places } from "@/server/db/schema/places";
import { eq } from "drizzle-orm";

async function fixData() {
  console.log("--- Bắt đầu Fix dữ liệu Phase 0 cho quán 'ểnh ương' ---");

  const placeId = "plc_Rdq46RbdvfOqz0TK";

  const updated = await db
    .update(places)
    .set({
      displayName: "Cà phê ểnh ương",
      dateFit: "chill",
      tier: "B",
      publishState: "published",
      updatedAt: new Date(),
    })
    .where(eq(places.id, placeId));

  console.log("✓ Đã cập nhật quán plc_Rdq46RbdvfOqz0TK:", {
    displayName: "Cà phê ểnh ương",
    dateFit: "chill",
    tier: "B",
    publishState: "published",
  });
}

fixData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Lỗi fix data:", err);
    process.exit(1);
  });
