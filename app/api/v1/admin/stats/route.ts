import { handleRoute, jsonData } from "@/server/http/route";
import { requireAdmin } from "@/server/auth/admin-auth";
import { getAdminDashboardStats } from "@/server/services/admin/admin-stats.service";

export const GET = handleRoute(async () => {
  await requireAdmin();
  return jsonData(await getAdminDashboardStats());
});
