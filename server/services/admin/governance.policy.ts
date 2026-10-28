import { AppError, ERRORS } from "@/server/http/errors";
import type { PlaceBlocklist } from "@/server/db/schema";
import { normalizeVietnamese } from "@/lib/search";

export const FORBIDDEN_AI_FIELDS = new Set([
  "opening_hours",
  "openingHours",
  "est_cost",
  "estCost",
  "est_cost_min",
  "estCostMin",
  "est_cost_max",
  "estCostMax",
  "photo_spots",
  "photoSpots",
  "poses",
]);

export const SOURCE_PRECEDENCE_WEIGHTS: Record<string, number> = {
  editor: 1.0,
  merchant: 0.95,
  user: 0.8,
  osm: 0.6,
  youtube: 0.5,
  ai: 0.4,
};

export interface CandidateBlockCheckInput {
  name: string;
  osmId?: string | null;
  lat?: number | null;
  lng?: number | null;
}

/**
 * Chặn đứng ở mức code không cho AI ghi vào các trường thực tế quan trọng (giờ mở cửa, chi phí, góc chụp, dáng chụp).
 */
export function assertFieldProvenanceAllowed(source: string, fieldName: string): void {
  if (source.toLowerCase() === "ai" && FORBIDDEN_AI_FIELDS.has(fieldName)) {
    throw new AppError(ERRORS.PLACE.AI_HALLUCINATION_FORBIDDEN);
  }
}

/**
 * Quy tắc thứ bậc ưu tiên nguồn: Nguồn thấp hơn không được phép ghi đè nguồn cao hơn.
 * Thứ tự: Editor (1.0) > Merchant (0.95) > User (0.8) > OSM (0.6) > YouTube (0.5) > AI (0.4)
 */
export function resolveFieldPrecedence(currentSource: string, incomingSource: string): boolean {
  const currentWeight = SOURCE_PRECEDENCE_WEIGHTS[currentSource.toLowerCase()] ?? 0;
  const incomingWeight = SOURCE_PRECEDENCE_WEIGHTS[incomingSource.toLowerCase()] ?? 0;
  return incomingWeight >= currentWeight;
}

/**
 * Kiểm tra xem ứng viên có vi phạm danh sách chặn cấm (Blocklist) không.
 */
export function isCandidateBlocklisted(
  candidate: CandidateBlockCheckInput,
  blocklist: PlaceBlocklist[]
): boolean {
  const normName = normalizeVietnamese(candidate.name);

  for (const item of blocklist) {
    // 1. Kiểm tra theo OSM ID
    if (item.osmId && candidate.osmId && item.osmId === candidate.osmId) {
      return true;
    }

    // 2. Kiểm tra theo Name Pattern (Regex hoặc chuỗi)
    if (item.namePattern) {
      try {
        const regex = new RegExp(item.namePattern, "i");
        if (regex.test(candidate.name) || regex.test(normName)) {
          return true;
        }
      } catch {
        const normPattern = normalizeVietnamese(item.namePattern);
        if (normName.includes(normPattern)) {
          return true;
        }
      }
    }

    // 3. Kiểm tra theo Bounding Box tọa độ địa lý
    if (
      item.latMin !== null &&
      item.latMax !== null &&
      item.lngMin !== null &&
      item.lngMax !== null &&
      candidate.lat !== null &&
      candidate.lat !== undefined &&
      candidate.lng !== null &&
      candidate.lng !== undefined
    ) {
      const lat = Number(candidate.lat);
      const lng = Number(candidate.lng);
      const latMin = Number(item.latMin);
      const latMax = Number(item.latMax);
      const lngMin = Number(item.lngMin);
      const lngMax = Number(item.lngMax);

      if (lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Guard kiểm tra blocklist: ném AppError(ERRORS.PLACE.BLOCKLISTED) nếu vi phạm.
 */
export function assertNotBlocklisted(
  candidate: CandidateBlockCheckInput,
  blocklist: PlaceBlocklist[]
): void {
  if (isCandidateBlocklisted(candidate, blocklist)) {
    throw new AppError(ERRORS.PLACE.BLOCKLISTED);
  }
}

export interface FieldProvenanceInput {
  source: string;
  confidence: number | string;
  verified?: boolean;
}

/**
 * Bộ lọc hiển thị Mô tả AI (AI Summary Guard):
 * Nếu trường summary có source = 'ai' và confidence < 0.60 -> Trả về null (fallback văn bản an toàn).
 */
export function filterAiSummary(
  provenance: FieldProvenanceInput | null | undefined,
  summaryText: string | null | undefined
): string | null {
  if (!summaryText) return null;
  if (!provenance) return summaryText;

  if (provenance.source.toLowerCase() === "ai") {
    const confidenceNum = Number(provenance.confidence);
    if (!provenance.verified && confidenceNum < 0.60) {
      return null;
    }
  }

  return summaryText;
}

/**
 * Kiểm tra Kill Switch khẩn cấp (EMERGENCY_HALT_PUBLISH).
 * Nếu được kích hoạt, lập tức ngắt toàn bộ luồng tự động xuất bản.
 */
export function assertPublishNotHalted(): void {
  if (process.env.EMERGENCY_HALT_PUBLISH === "true") {
    throw new AppError(ERRORS.PLACE.PUBLISH_HALTED_BY_CIRCUIT_BREAKER);
  }
}
