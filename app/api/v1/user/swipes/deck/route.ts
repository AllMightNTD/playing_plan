import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseSearchParams } from "@/server/http/route";
import { findRoomSession } from "@/server/auth/user-session";
import { deckQuerySchema } from "@/lib/validators/user";
import { getSwipeDeck } from "@/server/services/user/match.service";

export const GET = handleRoute(async (req: NextRequest) => {
  const query = parseSearchParams(req, deckQuerySchema);
  const deck = await getSwipeDeck(await findRoomSession(), query.limit, query.hobby);
  return jsonData({ items: deck });
});
