import { handleRoute, jsonData } from "@/server/http/route";
import { findRoomSession } from "@/server/auth/user-session";
import { getMemoryBoard } from "@/server/services/user/memory.service";

export const GET = handleRoute(async () => {
  return jsonData(await getMemoryBoard(await findRoomSession()));
});
