import { handleRoute, jsonData } from "@/server/http/route";
import { requireAdmin } from "@/server/auth/admin-auth";
import { getAdminHealth } from "@/server/services/admin/admin-health.service";

/** Tình trạng hệ thống cho badge trên header admin: DB, pipeline, phanh publish, quota YouTube. */
export const GET = handleRoute(async () => {
  await requireAdmin();
  return jsonData(await getAdminHealth());
});
