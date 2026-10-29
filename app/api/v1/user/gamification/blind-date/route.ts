import { NextRequest } from "next/server";
import { requireRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import {
  createBlindDateTicket,
  getBlindDateTicket,
} from "@/server/services/user/gamification.service";

/**
 * Lấy vé mù hiện tại của phòng (Server-side masking các chặng sau).
 */
export const GET = handleRoute(async () => {
  const session = await requireRoomSession();
  const ticket = await getBlindDateTicket(session);
  return jsonData(ticket);
});

/**
 * Tạo vé mù mới theo mức ngân sách (budget, medium, luxury).
 */
export const POST = handleRoute(async (req: NextRequest) => {
  const session = await requireRoomSession();
  let budgetTier: "budget" | "medium" | "luxury" = "medium";

  try {
    const json = (await req.json()) as { budgetTier?: "budget" | "medium" | "luxury" };
    if (json.budgetTier && ["budget", "medium", "luxury"].includes(json.budgetTier)) {
      budgetTier = json.budgetTier;
    }
  } catch {
    // Body rỗng -> dùng mặc định "medium"
  }

  const ticket = await createBlindDateTicket(session, budgetTier);
  return jsonData(ticket, { status: 201 });
});
