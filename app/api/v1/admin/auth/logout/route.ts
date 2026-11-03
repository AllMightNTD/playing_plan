import { handleRoute, jsonData } from "@/server/http/route";
import { clearAdminSessionCookie } from "@/server/auth/admin-auth";

export const POST = handleRoute(async () => {
  const res = jsonData({ loggedOut: true });
  clearAdminSessionCookie(res);
  return res;
});
