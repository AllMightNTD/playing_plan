import { handleRoute, jsonData } from "@/server/http/route";
import { requireAdmin } from "@/server/auth/admin-auth";

export const GET = handleRoute(async () => {
  const admin = await requireAdmin();
  return jsonData({
    email: admin.email,
    authenticated: true,
  });
});
