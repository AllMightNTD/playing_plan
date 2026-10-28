import { handleRoute, jsonData } from "@/server/http/route";
import { findRoomSession } from "@/server/auth/user-session";
import { listMatches } from "@/server/services/user/match.service";

export const GET = handleRoute(async () => {
  return jsonData({ items: await listMatches(await findRoomSession()) });
});
