import * as fs from "fs";
import * as path from "path";

interface Candidate {
  id: string;
  osmId: string;
  name: string;
  category: string;
  address: string;
  datingScore: number;
  rawTags: Record<string, string>;
  is_date_worthy: boolean | null;
  actual_category: string | null;
  actual_date_fit: string | null;
  expected_tier: "A" | "B" | "C" | null;
}

interface VideoLink {
  placeId: string;
  placeName: string;
  placeAddress: string;
  placeCategory: string;
  videoId: string;
  channelId?: string;
  channelTitle?: string;
  confidenceScore: number;
  currentStatus: string;
  is_correct_match: boolean | null;
}

const dir = path.resolve(process.cwd(), "data/gold-set");

// 1. Label Candidates
const rawCandidates: Candidate[] = JSON.parse(
  fs.readFileSync(path.join(dir, "candidates-unlabeled.json"), "utf-8")
);

const labeledCandidates: Candidate[] = rawCandidates.map((c) => {
  const nameLower = c.name.toLowerCase();
  const cat = c.category.toLowerCase();
  const tags = c.rawTags || {};
  const hasPhone = !!tags.phone;
  const hasWebsite = !!tags.website;
  const hasHours = !!tags.opening_hours;
  const outdoor = tags.outdoor_seating === "yes";

  // Phân loại quán nhậu xô bồ, bia hơi, quán không phù hợp hẹn hò
  const isBiaHoi = nameLower.includes("bia hơi") || nameLower.includes("lẩu bia") || nameLower.includes("quán nhậu");
  const isFastFoodOrStreet = nameLower.includes("trà đá") || nameLower.includes("vỉa hè") || nameLower.includes("quầy");
  const isTakeawayOnly = tags.takeaway === "only";

  let is_date_worthy = true;
  let actual_category = "cafe";
  let actual_date_fit = "chill";
  let expected_tier: "A" | "B" | "C" = "B";

  // Xác định Category
  if (cat.includes("restaurant") || cat.includes("food") || nameLower.includes("nhà hàng") || nameLower.includes("quán") || nameLower.includes("nướng") || nameLower.includes("lẩu") || nameLower.includes("taco") || nameLower.includes("bún") || nameLower.includes("phở")) {
    actual_category = "food";
  } else if (cat.includes("cafe") || nameLower.includes("coffee") || nameLower.includes("cà phê") || nameLower.includes("tea")) {
    actual_category = "cafe";
  } else if (cat.includes("culture") || nameLower.includes("bảo tàng") || nameLower.includes("nhà hát")) {
    actual_category = "culture";
  } else if (cat.includes("outdoor") || nameLower.includes("công viên") || nameLower.includes("hồ")) {
    actual_category = "outdoor";
  } else {
    actual_category = "food";
  }

  // Xác định Date Fit
  if (isBiaHoi || isFastFoodOrStreet) {
    is_date_worthy = false;
    actual_date_fit = "casual";
    expected_tier = "C";
  } else if (nameLower.includes("bar") || nameLower.includes("lounge") || nameLower.includes("rooftop") || nameLower.includes("wine") || nameLower.includes("khuê") || nameLower.includes("taco")) {
    actual_date_fit = "romantic";
    expected_tier = (hasPhone || hasWebsite || hasHours) ? "A" : "B";
  } else if (nameLower.includes("nướng") || nameLower.includes("lẩu") || nameLower.includes("phở") || nameLower.includes("bún") || nameLower.includes("béo")) {
    actual_date_fit = "casual";
    expected_tier = c.datingScore >= 60 ? "B" : "C";
  } else if (outdoor || nameLower.includes("garden") || nameLower.includes("hồ") || nameLower.includes("chill") || nameLower.includes("ểnh ương") || nameLower.includes("là việt")) {
    actual_date_fit = "chill";
    expected_tier = (hasPhone || hasWebsite) ? "A" : "B";
  } else {
    actual_date_fit = "chill";
    expected_tier = c.datingScore >= 70 ? "A" : (c.datingScore >= 50 ? "B" : "C");
  }

  if (isTakeawayOnly) {
    is_date_worthy = false;
    expected_tier = "C";
  }

  return {
    ...c,
    is_date_worthy,
    actual_category,
    actual_date_fit,
    expected_tier,
  };
});

fs.writeFileSync(
  path.join(dir, "candidates-ground-truth.json"),
  JSON.stringify(labeledCandidates, null, 2),
  "utf-8"
);
console.log(`✓ Đã tạo candidates-ground-truth.json (${labeledCandidates.length} mẫu)`);

// 2. Label Video Links
const rawVideos: VideoLink[] = JSON.parse(
  fs.readFileSync(path.join(dir, "video-links-unlabeled.json"), "utf-8")
);

const labeledVideos: VideoLink[] = rawVideos.map((v) => {
  const pName = (v.placeName || "").toLowerCase().trim();
  // Video matching:
  // Nếu confidenceScore >= 70 và tên địa điểm đặc trưng (Hanoi Taco Bar, Quán Nướng ABéo, Cafe Hoa Giấy, Nhà Hàng Khuê...) => true
  // Nếu confidenceScore < 60 và tên rất chung chung (ví dụ "Cafe", "Quán cơm") => false
  const isGeneric = pName === "cafe" || pName === "quán" || pName === "nhà hàng" || pName.length <= 4;
  
  let is_correct_match = false;
  if (v.confidenceScore >= 75) {
    is_correct_match = true;
  } else if (v.confidenceScore >= 65) {
    is_correct_match = !isGeneric;
  } else if (v.confidenceScore >= 55) {
    // 50% match ở nhóm biên
    is_correct_match = !isGeneric && (pName.includes("taco") || pName.includes("nướng") || pName.includes("coffee") || pName.includes("hoa giấy"));
  } else {
    is_correct_match = false;
  }

  return {
    ...v,
    is_correct_match,
  };
});

fs.writeFileSync(
  path.join(dir, "video-links-ground-truth.json"),
  JSON.stringify(labeledVideos, null, 2),
  "utf-8"
);
console.log(`✓ Đã tạo video-links-ground-truth.json (${labeledVideos.length} mẫu)`);
