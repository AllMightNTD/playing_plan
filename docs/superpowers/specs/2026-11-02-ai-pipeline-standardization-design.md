# Thiết Kế Kỹ Thuật: Chuẩn Hóa Gemini AI Gateway & Hợp Nhất Pipeline Ingestion (Chặng 3)

**Ngày:** 2026-11-02  
**Phạm vi:** Chặng 3 trong lộ trình 3 chặng (1. UI/UX Lịch Hẹn ➔ 2. Tối ưu Query Backend ➔ 3. Chuẩn hóa Pipeline AI)

## 1. Mục Tiêu & Các Nút Thắt Cần Giải Quyết

1. **Phân mảnh Tầng AI, Model Deprecated & Thiếu Bảo Vệ Chống Treo / Bão Lỗi**:
   - Hệ thống hiện có 4 nơi gọi Gemini theo 4 kiểu khác nhau: `ai-enrichment.service.ts` và `memory-script.service.ts` dùng `fetch()` thô nối `?key=...` thẳng vào URL (rủi ro lộ key qua network/error log), trong khi `video-hotspot-ai.service.ts` và `ai-extractor.service.ts` dùng model cũ `gemini-2.5-flash` và hàm cũ `models.generateContent` kèm `temperature`.
   - Chưa có lớp **Timeout cứng 15 giây** và **Circuit Breaker** tập trung theo quy định tại mục 8.3.4 `GEMINI.md`; chưa ép `store: false` thống nhất để bảo vệ bất biến **Zero-PII**.
2. **Đứt Gãy & Trùng Lặp 3 Luồng Thăng Hạng Địa Điểm (Promotion)**:
   - `daily-auto-pipeline.ts` tự chạy vòng lặp promote mọi ứng viên `pending` (lách qua đánh giá `evaluatedTier` và `datingScore`), ép kiểu `category as any`, tự tạo `newPlaceId` làm đứt liên kết `place_videos` và không bọc transaction.
   - `controlled-rampup.service.ts` giữ đúng `candidate.id` và hạn mức `stage`, nhưng không tạo `place_guides` và không sinh bộ 4 ảnh góc chụp `place_media`.
   - `promotion.gatekeeper.ts` lại sinh `newPlaceId` mới (làm mồ côi bản ghi `field_provenance` vừa lưu theo `candidate.id`) và gán cứng `area: "Tây Hồ"` cho mọi địa điểm Hà Nội.
3. **Lỗ Hổng Toàn Vẹn Trạng Thái Admin & Bảo Mật TLS**:
   - `shadow-worker.ts` bỏ quên tham số `options.executor` ở nửa sau hàm và chạy `UPDATE place_videos` trên toàn bảng, ghi đè mất các bản ghi đã được Admin chấm tay `verified` hoặc `rejected`.
   - `auto-publish-videos.service.ts` khai báo `executor?: any` (vi phạm Zero `any`) và tự gán trạng thái `"verified"` cho các video có điểm `60..69.99` chưa qua con người kiểm duyệt.
   - `package.json` chứa cờ `NODE_TLS_REJECT_UNAUTHORIZED=0` trên 4 script pipeline, vô hiệu hóa xác thực chứng chỉ TLS.

---

## 2. Kiến Trúc Giải Pháp (Phương Án 1: Unified Gateway + Canonical Promotion Engine)

### 2.1. Unified Gemini Interactions Gateway (`server/services/ai/gemini-gateway.ts`)
- **SDK & Model Chuẩn**:
  - Sử dụng duy nhất `@google/genai` (`GoogleGenAI`) qua Interactions API (`client.interactions.create`).
  - Chuẩn hóa hằng số `DEFAULT_GEMINI_FLASH_MODEL = "gemini-3.8-flash"`. Gỡ bỏ các tham số đã deprecated trên thế hệ 3.8 (`temperature`, `top_p`, `top_k`), sử dụng `generation_config: { thinking_level: "minimal" }`.
  - Bắt buộc `store: false` trên mọi lời gọi để không lưu trữ dữ liệu tương tác phía máy chủ AI (Zero-PII).
  - Hàm `resolveGeminiApiKey(explicitKey?)` kiểm tra tập trung key rỗng hoặc key mẫu (`AIzaSy...`), không bao giờ đưa key lên URL.
- **Timeout 15s & Sliding Circuit Breaker**:
  - Mỗi request truyền `{ timeout_ms: 15_000 }` và bọc thêm bộ hẹn giờ `15_000ms` chống treo kết nối.
  - Quản lý trạng thái mạch `CLOSED ➔ OPEN ➔ HALF_OPEN` trên bộ nhớ tiến trình (hỗ trợ hàm `resetGeminiCircuitBreaker()` phục vụ kiểm thử đơn vị):
    - Chuyển ngay sang `OPEN` (nghỉ `60_000ms`) khi gặp lỗi hạn mức `HTTP 429` hoặc chạm `3` lỗi hệ thống/timeout liên tiếp.
    - Khi `OPEN`, trả lỗi tức thì `GeminiCircuitOpenError` (`0ms`) không gọi mạng.
    - Hết thời gian nghỉ, cho phép 1 request thăm dò ở `HALF_OPEN`: thành công thì đóng mạch (`CLOSED`), thất bại thì mở lại mạch.
- **Phân Loại Lỗi & Tích Hợp 4 Consumers**:
  - Phân tách rõ các lớp lỗi kế thừa `Error`: `GeminiMissingKeyError`, `GeminiRateLimitError`, `GeminiTimeoutError`, `GeminiCircuitOpenError`, `GeminiInvalidOutputError`.
  - Bổ sung mã lỗi chuẩn `ERRORS.AI.QUOTA_EXCEEDED` (429) và `ERRORS.AI.UNAVAILABLE` (503) trong `server/http/errors.ts`.
  - **4 Consumers**:
    1. `ai-enrichment.service.ts` (`enrichPlaceWithAi`): Gọi gateway kèm `AiEnrichmentOutputSchema`; khi thiếu key hoặc lỗi/mở mạch thì dùng template an toàn và vẫn ghi `field_provenance` (`confidence = "0.40"`).
    2. `memory-script.service.ts` (`generateVirtualVideoScript`): Giữ nguyên tường lửa `assertZeroPii`, gọi gateway lấy mảng câu thơ Hà Nội; khi thiếu key, `429`, timeout hoặc mở mạch thì bật `isFallback = true` kèm `fallbackReason`.
    3. `video-hotspot-ai.service.ts` (`detectPlaceMentions`) + `ai-hotspots.runner.ts` (`runAiVideoHotspots`): Gửi multimodal input `[{ type: "video", uri, resolution: "low" }, { type: "text", text }]` qua gateway. Khi ném `VideoAiQuotaError` (bao gồm `429`, timeout hoặc `GeminiCircuitOpenError`), **giữ nguyên `aiAnalyzedAt = null`** để video ở lại hàng đợi `PENDING_AI` và dừng lượt quét an toàn (`stoppedReason = "quota"`).
    4. `ai-extractor.service.ts` (`extractGuideDraft`): Gọi gateway parse `extractedGuideSchema`; ánh xạ `GeminiRateLimitError` sang `ERRORS.AI.QUOTA_EXCEEDED`, `GeminiTimeoutError`/`GeminiCircuitOpenError` sang `ERRORS.AI.UNAVAILABLE`, và lỗi JSON/Zod sang `ERRORS.AI.INVALID_RESPONSE`.

### 2.2. Canonical Place Promotion Builder & Atomic Persistence (`server/services/pipeline/place-promotion.builder.ts`)
- **Pure Domain Mappers**:
  - `resolveHanoiArea(address, rawTags, lat, lng)`: Hợp nhất nhận diện 12 quận nội/ngoại thành Hà Nội từ địa chỉ, thẻ OSM (`addr:district`, `addr:street`) và tọa độ GPS dự phòng; mặc định `"Hà Nội"` thay vì gán sai `"Tây Hồ"`.
  - `mapCandidateCategory(rawCategory, rawTags)`: Ánh xạ tường minh thẻ OSM/candidate sang đúng kiểu `PlaceCategory` (`"cafe" | "food" | "walk" | "fun" | "indoor" | "nature" | "photo"`), loại bỏ hoàn toàn `as any`.
  - `buildPromotedPlaceBundle(candidate, options)`:
    - **Bảo toàn khóa định danh `placeId = candidate.id`** để giữ nguyên liên kết với `place_videos.placeId` và `field_provenance.placeId`.
    - Sinh slug chuẩn hóa không dấu kèm hậu tố định danh chống đụng độ.
    - Trả về trọn bộ `{ place: NewPlace, guide: NewPlaceGuide, media: NewPlaceMedia[] }` sử dụng kho ảnh 4 góc chụp từ `getCuratedUnsplashGalleryForPlace` kết hợp video `auto_linked` (nếu có).
- **Atomic Persistence & Hợp Nhất Luồng**:
  - Hàm `persistPromotedPlaceBundle(executor, bundle, candidateUpdate)` thực thi tuần tự (`places` upsert ➔ `place_guides` upsert ➔ `place_media` tuần tự ➔ cập nhật `candidate_places.status = 'promoted'`).
  - Cả `promoteCandidateToPlace` (`promotion.gatekeeper.ts`) và `runControlledPromotion` (`controlled-rampup.service.ts`) đều ủy quyền sang builder + persistence chung này (giữ nguyên chữ ký hàm để không phá vỡ các script/test hiện hữu; riêng `promotedPlaceId` nay chính là `candidate.id`).
  - Trong `scripts/pipeline/daily-auto-pipeline.ts`: Xóa khối lặp promote thủ công, chuyển sang gọi `runShadowWorker` để phân hạng ứng viên rồi gọi `runControlledPromotion` theo đúng cơ chế phanh an toàn.

### 2.3. Vá Lỗ Hổng Toàn Vẹn Dữ Liệu & Bảo Mật TLS
- **`server/services/pipeline/shadow-worker.ts`**:
  - Thay toàn bộ lệnh gọi `db.*` cứng bên trong `runShadowWorker` bằng biến `executor` (`options?.executor ?? db`).
  - Cập nhật 3 câu lệnh phân loại `place_videos` bổ sung điều kiện `AND status NOT IN ('verified', 'rejected')` nhằm bảo vệ tuyệt đối kết quả kiểm toán của Admin.
- **`server/services/pipeline/auto-publish-videos.service.ts`**:
  - Đổi kiểu `executor?: any` thành `executor?: DbExecutor`.
  - Chuẩn hóa ngưỡng trạng thái đồng nhất với Shadow Worker: điểm `>= 65` gán `"auto_linked"` (được phép đẩy sang `place_media`), điểm `< 65` giữ `"pending_review"`, **không bao giờ tự gán `"verified"`**, và không ghi đè trạng thái của các bản ghi đã `"verified"` hoặc `"rejected"` khi `onDuplicateKeyUpdate`.
- **`package.json`**:
  - Xóa tiền tố `NODE_TLS_REJECT_UNAUTHORIZED=0` khỏi `places:ingest-fun`, `places:promote-all`, `places:expand`, `pipeline:daily`.

---

## 3. Ma Trận Kiểm Thử 6 Tầng Bắt Buộc

1. **Tầng 1 — Happy Path**:
   - `gemini-gateway` gọi `interactions.create` với model `gemini-3.8-flash` (`store: false`), parse Zod thành công cho cả 4 service AI.
   - `buildPromotedPlaceBundle` & `promoteCandidateToPlace` giữ nguyên `candidate.id`, sinh đủ `place`, `guide`, `4` ảnh Unsplash + video media.
2. **Tầng 2 — Legacy / Dirty Data**:
   - Ứng viên OSM thiếu quận, `rawTags` rỗng, `category` ngoài danh mục chuẩn (`"pub"`, `"cinema"`, `"unknown"`), hoặc phản hồi AI kèm markdown fence / trường cấm (`estCost`, `openingHours`) được xử lý an toàn, đúng policy.
3. **Tầng 3 — Isolation, Governance Immunity & Zero-PII**:
   - Mọi request qua `gemini-gateway` đều truyền `store: false`; `memory-script` chặn đứng PII và cô lập phòng `404`.
   - `shadow-worker` và `auto-publish-videos` giữ nguyên bất biến cho các dòng `place_videos` có `status` là `'verified'` hoặc `'rejected'`.
4. **Tầng 4 — Boundary, Timeout & Missing Credentials**:
   - Thiếu `GEMINI_API_KEY`, key mẫu `AIzaSy...`, phản hồi rỗng/JSON hỏng, hoặc request vượt quá `15_000ms` đều ném đúng lớp lỗi chuẩn, kích hoạt fallback hoặc giữ video tại hàng đợi `PENDING_AI` (`markVideoAnalyzed` không bị gọi ghi lỗi vĩnh viễn khi timeout/rate-limit).
5. **Tầng 5 — Concurrency, Circuit Breaker & Idempotency**:
   - Liên tiếp lỗi `429` hoặc `3` lỗi timeout mở Circuit Breaker (`OPEN`), chặn tức thì các lệnh gọi kế tiếp trong cửa sổ nghỉ và tự khôi phục qua `HALF_OPEN` khi hết hạn.
   - Chạy promote trong transaction ghi tuần tự (`for ... of`), không dùng `Promise.all` bên trong transaction.
6. **Tầng 6 — Regression & Full Audit**:
   - Chạy `pnpm type-check` (0 lỗi), `pnpm lint` (0 cảnh báo), và toàn bộ test suite `pnpm test` trên toàn dự án đạt PASS 100%.
