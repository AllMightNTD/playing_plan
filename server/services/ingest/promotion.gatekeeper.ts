import type {
  CandidatePlace,
  PlaceBlocklist,
  PlaceVideo,
} from "@/server/db/schema/governance";
import { assertNotBlocklisted } from "@/server/services/admin/governance.policy";
import { db, type DbExecutor } from "@/server/db/client";
import {
  buildPromotedPlaceBundle,
  persistPromotedPlaceBundle,
} from "@/server/services/pipeline/place-promotion.builder";

export interface PromotionEvaluationResult {
  promoted: boolean;
  candidateId: string;
  promotedPlaceId?: string;
  reasons: string[];
  conditions: {
    notBlocklisted: boolean;
    hasRecentVideo: boolean;
    hasSecondOsmSignal: boolean;
    datingScoreSufficient: boolean;
  };
}

/**
 * Kiểm tra 4 điều kiện của Cửa Hẹp Tự Xuất Bản (Auto-Promotion Gatekeeper).
 */
export function evaluateCandidateForPromotion(
  candidate: CandidatePlace,
  linkedVideos: PlaceVideo[] = [],
  blocklist: PlaceBlocklist[] = [],
  now = new Date()
): PromotionEvaluationResult {
  const reasons: string[] = [];
  const tags = candidate.rawTags || {};

  // Điều kiện 1: Không thuộc danh sách cấm
  let notBlocklisted = false;
  try {
    assertNotBlocklisted(
      {
        osmId: candidate.osmId,
        name: candidate.name,
        lat: Number(candidate.lat),
        lng: Number(candidate.lng),
      },
      blocklist
    );
    notBlocklisted = true;
  } catch (err: unknown) {
    reasons.push(err instanceof Error ? err.message : "Place is blocklisted");
  }

  // Điều kiện 2: Có ít nhất 1 video liên kết trong vòng 365 ngày với status = 'auto_linked'
  const oneYearAgoMs = now.getTime() - 365 * 24 * 60 * 60 * 1000;
  const recentAutoLinkedVideo = linkedVideos.find((v) => {
    if (v.status !== "auto_linked") return false;
    const pubTime = v.publishedAt ? new Date(v.publishedAt).getTime() : 0;
    return pubTime >= oneYearAgoMs;
  });

  const hasRecentVideo = Boolean(recentAutoLinkedVideo);
  if (!hasRecentVideo) {
    reasons.push("Không có video review hợp lệ trong vòng 365 ngày (status = auto_linked)");
  }

  // Điều kiện 3: Có tín hiệu đối soát độc lập thứ hai trên OSM
  const hasSecondOsmSignal = Boolean(
    tags.website ||
    tags["contact:website"] ||
    tags["contact:facebook"] ||
    tags["contact:instagram"] ||
    tags.phone ||
    tags["contact:phone"]
  );
  if (!hasSecondOsmSignal) {
    reasons.push("Thiếu tín hiệu đối soát độc lập thứ 2 từ OSM (website, facebook, phone)");
  }

  // Điều kiện 4: Điểm hẹn hò dating_score >= 60
  const datingScoreSufficient = candidate.datingScore >= 60;
  if (!datingScoreSufficient) {
    reasons.push(`Điểm hẹn hò không đủ ngưỡng (${candidate.datingScore}/60)`);
  }

  const promoted = notBlocklisted && hasRecentVideo && hasSecondOsmSignal && datingScoreSufficient;

  return {
    promoted,
    candidateId: candidate.id,
    reasons,
    conditions: {
      notBlocklisted,
      hasRecentVideo,
      hasSecondOsmSignal,
      datingScoreSufficient,
    },
  };
}

/**
 * Promotes a verified CandidatePlace into the published catalog while preserving candidate.id.
 */
export async function promoteCandidateToPlace(
  candidate: CandidatePlace,
  linkedVideos: PlaceVideo[] = [],
  blocklist: PlaceBlocklist[] = [],
  executor: DbExecutor = db
): Promise<PromotionEvaluationResult> {
  const evaluation = evaluateCandidateForPromotion(candidate, linkedVideos, blocklist);
  if (!evaluation.promoted) {
    return evaluation;
  }

  const bundle = buildPromotedPlaceBundle(candidate, {
    linkedVideos,
  });
  await persistPromotedPlaceBundle(executor, bundle);

  evaluation.promotedPlaceId = candidate.id;
  return evaluation;
}
