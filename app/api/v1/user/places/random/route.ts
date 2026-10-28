import { NextRequest } from "next/server";
import { handleRoute, jsonData, parseSearchParams } from "@/server/http/route";
import { randomPlaceQuerySchema } from "@/lib/validators/user";
import { getRandomCandidate } from "@/server/services/user/places.service";
import { AppError, ERRORS } from "@/server/http/errors";

export const GET = handleRoute(async (req: NextRequest) => {
  const query = parseSearchParams(req, randomPlaceQuerySchema);
  const place = await getRandomCandidate(query.exclude, {
    mood: query.mood,
    category: query.category,
  });

  if (!place) {
    throw new AppError(ERRORS.PLACE.NO_CANDIDATE);
  }

  return jsonData(place);
});
