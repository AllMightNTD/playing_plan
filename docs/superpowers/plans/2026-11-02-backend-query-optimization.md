# Kế Hoạch Tối Ưu Query Backend & TiDB Serverless (Chặng 2)

> **Mục tiêu:** Triệt tiêu hoàn toàn các truy vấn Full-Table RAM Scan (`getAllPublishedPlaces()`) trên mọi Read/Write Hot-Path của DateMate, sửa lỗi lọc `status = 'published'` bị sót ở tầng DAL, đẩy điều kiện lọc `NOT EXISTS` + `LIMIT` xuống SQL cho TiDB Cloud Serverless, và đồng bộ trạng thái `status === 'planned'` cho Trang chủ sau khi hoàn thành lịch hẹn.

---

## 1. Bóc tách Nút thắt Cổ chai & Lỗ hổng Hiện tại

1. **Bug Lọc Trạng Thái ở DAL (`server/db/queries/user/places.queries.ts`)**:
   - `listPublishedPlacesByIds(placeIds)` chỉ lọc `inArray(places.id, placeIds)` mà **thiếu `eq(places.status, "published")` và `ne(places.slug, HIDDEN_SAFETY_PLACE.slug)`**, có nguy cơ trả về địa điểm đã gỡ xuất bản hoặc địa điểm cấm an toàn (`pho-duong-tau`).
2. **Full-Table Scan Trên Mọi Thao Tác Đơn Lẻ (`places.service.ts`)**:
   - `findPlaceBySlug(slug)` và `requirePublishedPlace(placeIdOrSlug)` (được gọi mỗi khi quẹt thẻ `POST /swipes`, lưu quán `POST /saved`, thêm chặng `POST /stops`, xem chi tiết quán `GET /places/[slug]`) đều gọi `getAllPublishedPlaces()` ➔ tải toàn bộ bảng `places`, `place_guides`, `place_media` và tính `SunCalc` hàng trăm lần chỉ để lấy **1 bản ghi**.
3. **Full-Table Scan Ở Danh Sách Cá Nhân Hóa (`match.service.ts`, `saved.service.ts`, `plan.service.ts`, `plan-schedule.service.ts`)**:
   - `listMatches` (được gọi cả trong `GET /home/summary` và `GET /matches`), `listMatchesWithEtag`, `listSavedPlaces`, `describeFirstStopLocation` (`.ics`), `autoSchedulePlan` đều nạp toàn bộ catalog thay vì batch query `inArray(places.id, targetIds)` (hoặc trả `[]` ngay với **0 query** khi danh sách ID rỗng).
   - `getSwipeDeck` kéo toàn bộ catalog + toàn bộ `swipes` lên Node RAM để lọc thủ công, thay vì đẩy `NOT EXISTS` + `LIMIT` xuống TiDB.
4. **Full-Table Scan Trên Trang Chủ & Video (`home.service.ts`, `videos.service.ts`)**:
   - `getHomePublic` nạp toàn bộ catalog chỉ để lấy `.length` và `.slice(0, 3)`.
   - `queryUserVideos` nạp toàn bộ bảng `places` trước khi đọc `place_videos`, thay vì đọc `place_videos` trước rồi `inArray` đúng các `placeId` có liên kết.
   - `getHomeSummary` và `quickAddStopToPlan` lọc `p.status !== "cancelled"`, khiến buổi hẹn vừa đánh dấu `"done"` (ở Chặng 1) vẫn bị hiểu nhầm là buổi hẹn sắp tới.

---

## 2. Cấu Trúc Triển Khai

### Task 1: Phẫu Thuật Tầng DAL & `places.service.ts`
- **Files**:
  - `server/db/queries/user/places.queries.ts`
  - `server/services/user/places.service.ts`
  - `server/services/user/places.service.test.ts`
- **Thay đổi**:
  - Bổ sung `isPubliclyVisiblePlace` (`status = 'published' AND slug <> 'pho-duong-tau'`) dùng thống nhất cho mọi hàm query trong `places.queries.ts`.
  - Thêm `findPublishedPlaceWithGuide(idOrSlug)`, `countPublishedPlaces()`, `listPublishedPlacesLimited(limit)`, `listUnswipedPublishedPlacesWithGuides(roomId, memberId, limit?)`.
  - Trích hàm dùng chung `hydrateCatalogPlaces(rows)` chống lặp code nạp `place_media`.
  - Cập nhật `findPlaceBySlug`, `requirePublishedPlace`, `getPublishedPlacesByIds`, thêm `getHomeCatalogPreview(limit)` và `getUnswipedPublishedPlaces(session, limit, hobby)`.

### Task 2: Tối Ưu Hot-Path Services (`match`, `saved`, `plan`, `plan-schedule`, `home`, `videos`)
- **Files**:
  - `server/services/user/match.service.ts`
  - `server/services/user/saved.service.ts`
  - `server/services/user/plan.service.ts`
  - `server/services/user/plan-schedule.service.ts`
  - `server/services/user/home.service.ts`
  - `server/services/user/videos.service.ts`
  - `server/services/user/match.service.test.ts`
  - `server/services/user/home.service.test.ts`
- **Thay đổi**:
  - Chuyển toàn bộ sang batch `getPublishedPlacesByIds` / `getHomeCatalogPreview` / `getUnswipedPublishedPlaces`.
  - Short-circuit `0 queries` khi mảng ID rỗng (`matches.length === 0`, `savedIds.length === 0`).
  - Lọc chính xác `p.status === "planned"` cho `upcomingPlan` & `quickAddStopToPlan` trên `home.service.ts`.
  - Đảo chiều truy vấn `place_videos -> inArray(places.id, linkedIds)` trong `videos.service.ts`.

