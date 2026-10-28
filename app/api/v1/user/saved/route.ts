import { handleRoute, jsonData } from "@/server/http/route";
import { findRoomSession } from "@/server/auth/user-session";
import { listSavedPlaces } from "@/server/services/user/saved.service";

export const GET = handleRoute(async () => {
  return jsonData({ items: await listSavedPlaces(await findRoomSession()) });
});
