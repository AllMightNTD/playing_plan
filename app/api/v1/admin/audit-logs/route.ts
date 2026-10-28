import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseSearchParams } from "@/server/http/route";
import { requireAdmin } from "@/server/auth/admin-auth";
import { auditLogQuerySchema } from "@/lib/validators/admin";
import { listAuditLogsForAdmin } from "@/server/services/admin/place-admin.service";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireAdmin();
  const query = parseSearchParams(req, auditLogQuerySchema);
  return jsonData(await listAuditLogsForAdmin(query.cursor, query.limit));
});
