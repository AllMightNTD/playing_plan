import { NextRequest, NextResponse } from "next/server";
import { handleRoute, jsonData } from "@/server/http/route";
import { findRoomSession } from "@/server/auth/user-session";
import { listMatchesWithEtag } from "@/server/services/user/match.service";

export const GET = handleRoute(async (req: NextRequest) => {
  const session = await findRoomSession();
  const ifNoneMatch = req.headers.get("if-none-match");
  const result = await listMatchesWithEtag(session, ifNoneMatch);

  if (result.notModified) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: result.etag,
        "Cache-Control": "no-cache",
      },
    });
  }

  return jsonData(
    { items: result.items },
    {
      headers: {
        ETag: result.etag,
        "Cache-Control": "no-cache",
      },
    }
  );
});
