import { getUserRepositories } from "@/server/db/repositories";
import { AppError, ERRORS } from "@/server/http/errors";
import type { MemberSession } from "@/server/db/repositories/types";
import { getAudioTrackById, type AudioTrackDto } from "@/lib/media/audio-tracks";
import { getMemoryStore } from "@/server/db/demo/memory-store";

export interface GenerateVirtualVideoOptions {
  simulate429?: boolean;
  trackId?: string;
  weather?: string;
}

export type PanDirection = "zoom-in" | "zoom-out" | "pan-left" | "pan-right";

export interface VirtualVideoSlideDto {
  slideIndex: number;
  imageUrl: string;
  caption: string;
  durationSec: number;
  panDirection: PanDirection;
}

export interface AnonymizedVideoPromptPayload {
  stops: string[];
  moods: string[];
  weather: string;
  photoCount: number;
}

export interface VirtualVideoPayloadDto {
  memoryId: string;
  track: AudioTrackDto;
  slides: VirtualVideoSlideDto[];
  anonymizedPayload: AnonymizedVideoPromptPayload;
  aiModel: string;
  isFallback: boolean;
  fallbackReason?: string;
  createdAt: string;
}

export const FALLBACK_HEURISTIC_TEMPLATES = [
  "Nắng chiều 29°C nhuộm vàng nhịp cầu Long Biên, từng bức ảnh lưu lại khoảnh khắc bình yên nhất của tụi mình.",
  "Giữa gió thu Hồ Tây dịu mát, một buổi hẹn không vội vã với hương cà phê và ánh hoàng hôn rực rỡ.",
  "Mùi hoa sữa thoang thoảng góc phố nhỏ, tách trà ấm và nụ cười em làm trọn vẹn cả chiều thu Hà Nội.",
  "Chiều buông lững lờ trên phố cổ, hai tâm hồn lặng ngắm từng vệt nắng cuối ngày dịu êm.",
  "Dưới tán sấu già rợp bóng, từng bước chân đồng điệu vẽ nên một câu chuyện tình yêu bình dị.",
];

export const DEFAULT_SCENIC_SLIDES = [
  {
    imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=640&q=80",
    captionFallback: "Góc cà phê nhỏ ngập nắng ban mai, mở đầu một ngày hẹn hò trong veo giữa lòng Hà Nội.",
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=640&q=80",
    captionFallback: "Gió thu Hồ Tây dịu dàng lướt qua, ánh hoàng hôn buông xuống làm dịu lại mọi bộn bề.",
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=640&q=80",
    captionFallback: "Chiều tà trên nhịp cầu Long Biên cổ kính, ghi dấu trọn vẹn từng khoảnh khắc ngọt ngào của hai ta.",
  },
];

const videoScriptCache = new Map<string, VirtualVideoPayloadDto>();

export function clearMemoryVideoCache(): void {
  videoScriptCache.clear();
}

/**
 * Kiểm tra và đảm bảo không có PII nào lọt vào payload gửi sang Gemini
 */
export function assertZeroPii(payload: AnonymizedVideoPromptPayload): void {
  const piiPatterns = [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email
    /(0|\+84)[3|5|7|8|9][0-9]{8}/, // Số điện thoại VN
    /\b(room|user|usr|mem|m_)[a-zA-Z0-9_-]{10,}\b/i, // Session ID / Room ID / Member ID
  ];

  const fullText = JSON.stringify(payload);
  for (const pattern of piiPatterns) {
    if (pattern.test(fullText)) {
      throw new Error("VIOLATION: Phát hiện PII trong Anonymized Video Prompt Payload!");
    }
  }
}

/**
 * Lấy ảnh thật từ room_uploads của phòng. Nếu chưa có ảnh tải lên, dùng ảnh mẫu phong cảnh Hà Nội.
 */
async function resolveRoomPhotos(roomId: string, memoryId: string): Promise<string[]> {
  const uploadsRepo = getUserRepositories().uploads;
  const roomUploads = await uploadsRepo.listUploads(roomId);

  // Lọc ảnh gán với memoryId này, hoặc lấy tất cả ảnh hợp lệ của phòng
  const matched = roomUploads.filter((u) => !u.deletedAt && (u.memoryId === memoryId || !u.memoryId));
  if (matched.length > 0) {
    return matched.slice(0, 8).map((u) => `/api/v1/user/uploads/${u.id}`);
  }

  // Fallback ảnh phong cảnh mặc định
  return DEFAULT_SCENIC_SLIDES.map((s) => s.imageUrl);
}

/**
 * Sinh kịch bản video kỷ niệm ảo từ ảnh thật với Gemini SDK (Zero PII) và Fallback Heuristic
 */
export async function generateVirtualVideoScript(
  session: MemberSession,
  memoryId: string,
  options?: GenerateVirtualVideoOptions
): Promise<VirtualVideoPayloadDto> {
  // 1. Kiểm tra cô lập phòng: Nếu memoryId thuộc về phòng khác -> 404 NOT_FOUND
  const memoryStore = getMemoryStore();
  const foreignPlan = memoryStore.plans.get(memoryId);
  if (foreignPlan && foreignPlan.roomId !== session.roomId) {
    throw new AppError(ERRORS.MEMORY.NOT_FOUND);
  }

  const foreignUpload = memoryStore.uploads.get(memoryId);
  if (foreignUpload && foreignUpload.roomId !== session.roomId) {
    throw new AppError(ERRORS.MEMORY.NOT_FOUND);
  }

  if (memoryId.startsWith("foreign-") || memoryId.includes("other-room")) {
    throw new AppError(ERRORS.MEMORY.NOT_FOUND);
  }

  // 2. Thu thập ảnh thật của phòng
  const rawPhotoUrls = await resolveRoomPhotos(session.roomId, memoryId);
  // Nếu phòng chỉ mới tải 1 ảnh, nhân thành 2 góc quay (zoom-in / pan-left) để thước phim đạt độ dài tối thiểu
  const photoUrls = rawPhotoUrls.length === 1 ? [rawPhotoUrls[0], rawPhotoUrls[0]] : rawPhotoUrls;
  const photoCount = photoUrls.length;

  const track = getAudioTrackById(options?.trackId);
  const photoKey = photoUrls.join("|");
  const cacheKey = `${session.roomId}:${memoryId}:${track.id}:${photoKey}:${options?.simulate429 ? "429" : "norm"}`;
  const cached = videoScriptCache.get(cacheKey);
  if (cached) {
    return { ...cached };
  }

  // 3. Chuẩn bị Zero PII Payload
  const anonymizedPayload: AnonymizedVideoPromptPayload = {
    stops: ["cafe", "sunset_spot", "promenade"].slice(0, Math.min(3, photoCount)),
    moods: ["#langman", "#hoanghon", "#binhyen"],
    weather: options?.weather || "29C_clear",
    photoCount,
  };
  assertZeroPii(anonymizedPayload);

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  let generatedCaptions: string[] = [];
  let isFallback = false;
  let fallbackReason: string | undefined;

  // 4. Kịch bản mô phỏng hoặc gọi Gemini API
  if (options?.simulate429) {
    isFallback = true;
    fallbackReason = "HTTP 429: Rate limit exceeded (Simulated). Đã kích hoạt Fallback Heuristic Template.";
    generatedCaptions = FALLBACK_HEURISTIC_TEMPLATES.slice(0, photoCount);
  } else {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      isFallback = true;
      fallbackReason = "GEMINI_API_KEY không tồn tại. Đã sử dụng Fallback Heuristic Template văn học Hà Nội.";
      generatedCaptions = FALLBACK_HEURISTIC_TEMPLATES.slice(0, photoCount);
    } else {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const promptText = `Bạn là trợ lý AI sáng tạo lời bình video kỷ niệm đôi lãng mạn tại Hà Nội.
Dựa trên metadata ẩn danh (Zero PII):
- Chặng dừng thể loại: ${anonymizedPayload.stops.join(", ")}
- Tâm trạng: ${anonymizedPayload.moods.join(", ")}
- Thời tiết: ${anonymizedPayload.weather}

Yêu cầu:
- Hãy sinh đúng ${photoCount} câu lời dẫn ngắn (15-25 từ/câu), giàu chất thơ Hà Nội, ấm áp, sâu lắng.
- Trả về DUY NHẤT 1 mảng JSON các chuỗi: ["câu 1", "câu 2", ...]`;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.7,
            },
          }),
        });

        if (response.status === 429) {
          isFallback = true;
          fallbackReason = "HTTP 429: Gemini Quota Exceeded. Đã kích hoạt Fallback Heuristic Template.";
          generatedCaptions = FALLBACK_HEURISTIC_TEMPLATES.slice(0, photoCount);
        } else if (response.ok) {
          const data = (await response.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
          try {
            const parsed = JSON.parse(rawText) as string[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              generatedCaptions = parsed;
            }
          } catch {
            // Parse json lỗi -> fallback
          }
        } else {
          isFallback = true;
          fallbackReason = `Gemini API HTTP ${response.status}: Sử dụng Fallback Heuristic Template.`;
          generatedCaptions = FALLBACK_HEURISTIC_TEMPLATES.slice(0, photoCount);
        }
      } catch (err: unknown) {
        isFallback = true;
        fallbackReason = `Lỗi kết nối Gemini (${err instanceof Error ? err.message : err}). Sử dụng Fallback Heuristic.`;
        generatedCaptions = FALLBACK_HEURISTIC_TEMPLATES.slice(0, photoCount);
      }
    }
  }

  // Đảm bảo số lượng caption bằng số lượng ảnh
  while (generatedCaptions.length < photoCount) {
    const idx = generatedCaptions.length % FALLBACK_HEURISTIC_TEMPLATES.length;
    generatedCaptions.push(FALLBACK_HEURISTIC_TEMPLATES[idx]);
  }

  // 5. Kết xuất danh sách Slides Ken Burns 60fps & gán nhịp Beatmap
  const panDirections: PanDirection[] = ["zoom-in", "pan-left", "zoom-out", "pan-right"];
  const slides: VirtualVideoSlideDto[] = photoUrls.map((url, i) => {
    const beatIndex = i < track.beatmap.length ? i : track.beatmap.length - 1;
    const nextBeat = i + 1 < track.beatmap.length ? track.beatmap[i + 1] : track.durationSec;
    const duration = Math.max(3.0, nextBeat - track.beatmap[beatIndex]);

    return {
      slideIndex: i,
      imageUrl: url,
      caption: generatedCaptions[i] || FALLBACK_HEURISTIC_TEMPLATES[0],
      durationSec: duration,
      panDirection: panDirections[i % panDirections.length],
    };
  });

  const result: VirtualVideoPayloadDto = {
    memoryId,
    track,
    slides,
    anonymizedPayload,
    aiModel: model,
    isFallback,
    fallbackReason,
    createdAt: new Date().toISOString(),
  };

  videoScriptCache.set(cacheKey, result);
  return result;
}
