import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { recommendBodySchema } from "@/lib/validators/user";
import { getAllPublishedPlaces } from "@/server/services/user/places.service";
import { recommendPlaces, type RecommendCriteria } from "@/lib/scoring";

export const POST = handleRoute(async (req: NextRequest) => {
  const body = await parseJsonBody(req, recommendBodySchema);
  const places = await getAllPublishedPlaces();

  const criteria: RecommendCriteria = {
    budget: body.budget,
    moods: body.moods,
    slot: body.slot,
    transport: body.transport,
    isRainy: body.isRainy,
    origin: body.lat !== undefined && body.lng !== undefined ? { lat: body.lat, lng: body.lng } : undefined,
  };

  const results = recommendPlaces(places, criteria, {
    limit: 3,
    excludeSlugs: body.excludeSlugs,
  });

  return jsonData({
    items: results.map((r) => ({
      place: r.place,
      score: r.score,
      reasons: r.reasons,
    })),
  });
});
