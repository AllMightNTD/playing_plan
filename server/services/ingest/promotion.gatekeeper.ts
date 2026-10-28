import { CandidatePlace, PlaceBlocklist, PlaceVideo, candidatePlaces } from "@/server/db/schema/governance";
import { places, placeMedia, NewPlace } from "@/server/db/schema/places";
import { assertNotBlocklisted } from "@/server/services/admin/governance.policy";
import { db, DbExecutor } from "@/server/db/client";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

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
 * Thực hiện thăng hạng tự động từ CandidatePlace lên Catalog Place chính thức trong DB.
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

  const newPlaceId = `plc_${nanoid(16)}`;
  const now = new Date();
  const slug = `${candidate.searchName.replace(/[^a-z0-9]+/g, "-")}-${nanoid(6)}`;

  // Map category OSM sang category enum của places
  let catalogCategory: "cafe" | "food" | "walk" | "photo" | "nature" | "indoor" | "fun" = "cafe";
  if (candidate.category === "restaurant") catalogCategory = "food";
  else if (candidate.category === "park") catalogCategory = "nature";
  else if (candidate.category === "viewpoint") catalogCategory = "photo";
  else if (candidate.category === "museum" || candidate.category === "gallery") catalogCategory = "indoor";

  // Thêm vào places chính thức với status = published
  await executor.insert(places).values({
    id: newPlaceId,
    slug,
    name: candidate.name,
    searchName: candidate.searchName,
    searchText: `${candidate.name} ${candidate.address}`,
    city: candidate.city || "hanoi",
    area: "Tây Hồ", // default area hoặc extract từ address
    address: candidate.address,
    lat: candidate.lat,
    lng: candidate.lng,
    category: catalogCategory,
    priceLevel: 2,
    estCostMin: 35000,
    estCostMax: 80000,
    moods: ["lãng mạn", "tự động gợi ý"],
    tags: ["auto_generated", "dating_pick"],
    indoor: false,
    coverUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
    summary: `✨ Gợi ý tự động • Chưa xác minh thời gian thực. Điểm hẹn hò triển vọng được trích xuất từ OpenStreetMap và video review trên YouTube.`,
    status: "published",
    createdAt: now,
    updatedAt: now,
  });

  // Liên kết video sang place_media
  const autoLinkedVideo = linkedVideos.find((v) => v.status === "auto_linked");
  if (autoLinkedVideo) {
    await executor.insert(placeMedia).values({
      id: `med_${nanoid(16)}`,
      placeId: newPlaceId,
      type: "video",
      url: `https://www.youtube.com/watch?v=${autoLinkedVideo.videoId}`,
      platform: "youtube",
      embedId: autoLinkedVideo.videoId,
      caption: `Video review từ kênh ${autoLinkedVideo.channelTitle || "YouTube"}`,
      credit: autoLinkedVideo.channelTitle || "YouTube Creator",
      sourceUrl: `https://www.youtube.com/watch?v=${autoLinkedVideo.videoId}`,
      license: "embed_only",
      sortOrder: 0,
    });
  }

  // Cập nhật trạng thái candidate thành promoted
  await executor
    .update(candidatePlaces)
    .set({
      status: "promoted",
      updatedAt: now,
    })
    .where(eq(candidatePlaces.id, candidate.id));

  evaluation.promotedPlaceId = newPlaceId;
  return evaluation;
}
