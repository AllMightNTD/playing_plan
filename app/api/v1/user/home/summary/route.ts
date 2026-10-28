import { handleRoute, jsonData, NO_STORE_HEADERS } from "@/server/http/route";
import { findRoomSession } from "@/server/auth/user-session";
import { getHomeSummary } from "@/server/services/user/home.service";

export const GET = handleRoute(async () => {
  const session = await findRoomSession();
  const summary = await getHomeSummary(session);

  return jsonData(summary, {
    headers: NO_STORE_HEADERS,
  });
});
