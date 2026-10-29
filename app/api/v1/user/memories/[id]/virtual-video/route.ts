import { NextRequest } from "next/server";
import { requireRoomSession } from "@/server/auth/user-session";
import { handleRoute, jsonData } from "@/server/http/route";
import { generateVirtualVideoScript, type GenerateVirtualVideoOptions } from "@/server/services/ai/memory-script.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Sinh kịch bản video kỷ niệm ảo Ken Burns từ ảnh thật của phòng với Gemini SDK (Zero PII).
 * Hỗ trợ fallback heuristic template khi gặp HTTP 429 hoặc offline.
 */
export const POST = handleRoute(async (req: NextRequest, context: RouteContext) => {
  const session = await requireRoomSession();
  const { id } = await context.params;

  let body: GenerateVirtualVideoOptions = {};
  try {
    const json = await req.json();
    if (json && typeof json === "object") {
      body = json as GenerateVirtualVideoOptions;
    }
  } catch {
    // Body rỗng -> dùng mặc định
  }

  const result = await generateVirtualVideoScript(session, id, body);
  return jsonData(result);
});
