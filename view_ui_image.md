# Kế hoạch kỹ thuật: Hiển thị Ảnh & Video từ TiDB lên UI DateMate & Lưu Backlog tính năng sau

Tài liệu này gồm 2 phần:
1. **Backlog lưu trữ**: Ghi nhận toàn bộ thiết kế & các bước triển khai cho các tính năng admin/kỷ niệm/cron để làm sau theo yêu cầu của bạn.
2. **Kế hoạch triển khai chính**: Thiết kế chi tiết luồng truy vấn và hiển thị hình ảnh thật (Unsplash / Wikimedia) cùng video nhúng (TikTok / YouTube) từ TiDB Cloud lên toàn bộ giao diện UI (Card, Modal chi tiết, Trang cẩm nang ISR, Quẹt thẻ Match, Timeline hẹn hò).

---

## PHẦN 1. BACKLOG LƯU TRỮ (HOÀN THÀNH SAU)

Dưới đây là các tính năng được đóng gói và lưu lại để triển khai ở các sprint tiếp theo:

### 1. CMS Admin: Form Tạo / Chỉnh sửa địa điểm & Ghim tọa độ Leaflet
- **Mục tiêu**: Cho phép Admin nhập bài mới hoặc chỉnh sửa 10 địa điểm có sẵn, xem trước và bấm lưu trực tiếp vào TiDB.
- **Các bước**:
  - `app/admin/places/[id]/edit/page.tsx` & `app/admin/places/new/page.tsx`: Dựng form chia 2 cột (thông tin chung, cẩm nang hẹn hò, giờ giấc, trang phục).
  - Tích hợp Leaflet Map Picker (Dynamic import `ssr: false`): Kéo thả ghim tọa độ để tự động điền `lat`, `lng`.
  - Tích hợp AI Extract: Nút bấm gọi `POST /api/v1/admin/ai-extract` truyền link TikTok/YouTube để AI tự động điền form.
  - Phê duyệt nhanh: Nút "Xuất bản ngay" (`status = 'published'`).

### 2. Kỷ niệm buổi hẹn & Upload đa phương tiện (F11)
- **Mục tiêu**: Sau khi cặp đôi hoàn thành buổi hẹn (`status = 'done'`), cho phép tải ảnh kỷ niệm đôi, viết nhật ký và chấm điểm buổi hẹn.
- **Các bước**:
  - `POST /api/v1/user/upload`: Cấp presigned URL tải trực tiếp lên Cloudflare R2 / Vercel Blob (bỏ qua serverless payload limit).
  - Nén ảnh client bằng `browser-image-compression` về định dạng WebP, max 1600px trước khi tải lên.
  - Form đánh giá `/memories` ghi vào bảng `memories` và `memory_photos`.

### 3. Cron Job tự động nhắc lịch hẹn (F18)
- **Mục tiêu**: Tự động nhắc trước 1 ngày (`-P1D`) và trước 2 giờ (`-PT2H`) qua Web Push Notification.
- **Các bước**:
  - `app/api/cron/reminders/route.ts`: Endpoint được gọi định kỳ 15 phút bởi Vercel Cron hoặc GitHub Actions, bảo vệ bằng Bearer `CRON_SECRET`.
  - Quét bảng `reminders` nơi `status = 'pending'` và `scheduled_at <= NOW()`.
  - Gửi thông báo Web Push qua thư viện `web-push` tới endpoint VAPID đã lưu trong `room_members.push_subscription`.

---

## PHẦN 2. KẾ HOẠCH TRIỂN KHAI CHÍNH: HIỂN THỊ ẢNH & VIDEO LÊN UI

Hiện tại database TiDB đã có **45 ảnh** từ Unsplash và Wikimedia phân bổ trên 10 địa điểm, cùng cấu trúc hỗ trợ video nhúng. Tuy nhiên toàn bộ UI (Card, Modal, Detail Page, Swipe Card) hiện tại chỉ đang hiển thị gradient CSS và emoji. Kế hoạch này sẽ kích hoạt hình ảnh thực tế chất lượng cao và video review sinh động trên toàn bộ ứng dụng.

### User Review Required

> [!IMPORTANT]
> **Trạng thái xuất bản của 10 địa điểm trong TiDB**:
> Hiện tại 10 bản ghi trong bảng `places` của TiDB đang mang `status = 'draft'`. API `getAllPublishedPlaces()` chỉ lấy các địa điểm có `status = 'published'`. Để dữ liệu từ DB (kèm 45 ảnh Unsplash) đổ thẳng lên UI thay vì fallback sang mock-data, chúng ta sẽ chạy một lệnh cập nhật 10 địa điểm này sang `status = 'published'`.

> [!NOTE]
> **Tuân thủ bản quyền & Điều khoản API Unsplash**:
> Theo điều khoản Unsplash API:
> 1. Ảnh hiển thị phải kèm dòng ghi công tác giả dạng: *Ảnh bởi [Tên tác giả] trên Unsplash* kèm link dẫn về profile Unsplash với tham số `utm_source=datemate&utm_medium=referral`.
> 2. Wikimedia Commons: Ghi nhận giấy phép `CC BY / CC BY-SA` và link tới trang nguồn Wikimedia.

---

## Proposed Changes

Grouped by component layer:

### 1. Data Contract & Domain Model (Catalog Types)

#### [MODIFY] [catalog.ts](file:///home/dev_ntd/Documents/plan_playing/lib/types/catalog.ts)
- Bổ sung interface `PlaceMediaItem`:
  ```ts
  export interface PlaceMediaItem {
    id: string;
    type: "image" | "video";
    platform: "unsplash" | "wikimedia" | "youtube" | "tiktok" | "upload" | "pexels";
    url: string;
    embedId?: string | null;
    caption?: string | null;
    credit?: string | null;
    sourceUrl?: string | null;
    licenseNote?: string | null;
    license: "own" | "cc0" | "licensed" | "permission" | "embed_only";
    sortOrder: number;
  }
  ```
- Bổ sung trường `coverUrl?: string` và `media: PlaceMediaItem[]` vào interface `HanoiPlace`.

#### [MODIFY] [mock-data.ts](file:///home/dev_ntd/Documents/plan_playing/lib/mock-data.ts)
- Cập nhật 10 địa điểm seed trong `HANOI_PLACES` có sẵn `coverUrl` thực tế từ Unsplash và danh sách `media` mẫu để môi trường offline / test vẫn hiển thị ảnh và video đầy đủ, không bị vỡ giao diện.

---

### 2. Database Access Layer (DAL) & Service Mapper

#### [MODIFY] [places.queries.ts](file:///home/dev_ntd/Documents/plan_playing/server/db/queries/user/places.queries.ts)
- Viết hàm batch query `listMediaByPlaceIds(placeIds: string[])`:
  - Lấy toàn bộ bản ghi từ `place_media` tương ứng với danh sách địa điểm đã xuất bản.
  - Sắp xếp theo `sort_order ASC`.
  - Tránh triệt để lỗi N+1 Query.

#### [MODIFY] [catalog.mapper.ts](file:///home/dev_ntd/Documents/plan_playing/server/services/user/catalog.mapper.ts)
- Cập nhật hàm `toCatalogPlace(place, guide, mediaList, date)`:
  - Gán `coverUrl: place.coverUrl || mediaList[0]?.url || ""`.
  - Ánh xạ toàn bộ `mediaList` sang `PlaceMediaItem[]`.
  - Định dạng credit tác giả theo chuẩn Unsplash / Wikimedia.

#### [MODIFY] [places.service.ts](file:///home/dev_ntd/Documents/plan_playing/server/services/user/places.service.ts)
- Khi gọi `getAllPublishedPlaces()`, kết hợp `listPublishedPlacesWithGuides()` và `listMediaByPlaceIds()` để trả về đầy đủ ảnh/video cho từng địa điểm.

---

### 3. Next.js Configuration & Security

#### [MODIFY] [next.config.ts](file:///home/dev_ntd/Documents/plan_playing/next.config.ts)
- Bổ sung domain cho Next.js `<Image>`:
  - `upload.wikimedia.org`, `thumb.wikimedia.org` (ảnh bản quyền mở)
  - `img.youtube.com`, `i.ytimg.com` (thumbnail video YouTube)
  - `p16-va.tiktokcdn.com` (thumbnail video TikTok)

---

### 4. UI Components

#### [NEW] [PlaceMediaGallery.tsx](file:///home/dev_ntd/Documents/plan_playing/components/user/PlaceMediaGallery.tsx)
- Component chuyên dụng hiển thị bộ sưu tập ảnh và video cho địa điểm:
  - **Tab chuyển đổi**: "Ảnh thực tế (x)" và "Video review (y)".
  - **Lưới ảnh / Carousel**: Hiển thị ảnh kèm badge số thứ tự, caption và credit tác giả.
  - **Lightbox Preview**: Bấm vào ảnh mở xem toàn màn hình sắc nét.
  - **Trình nhúng video an toàn (Lazy Embed)**:
    - YouTube: Nhúng `<iframe>` với `youtube-nocookie.com`, tải lười `loading="lazy"`.
    - TikTok: Thẻ video dọc phong cách Shorts/Reels, có nút mở xem trực tiếp trên TikTok.
  - **Thanh ghi nhận bản quyền (Attribution Bar)**: Link về trang Unsplash / Wikimedia của tác giả đúng luật.

#### [MODIFY] [PlaceCard.tsx](file:///home/dev_ntd/Documents/plan_playing/components/user/PlaceCard.tsx)
- Thay thế khối gradient thuần bằng ảnh bìa thực tế:
  - Hiển thị `place.coverUrl` với hiệu ứng zoom nhẹ khi hover card (`group-hover:scale-105 transition-transform`).
  - Lớp phủ gradient đen mờ (`bg-gradient-to-t from-black/70 via-black/20 to-transparent`) bảo đảm chữ tên, giá và emoji luôn rõ nét, dễ đọc trên mọi nền ảnh sáng/tối.
  - Fallback an toàn: Nếu ảnh lỗi hoặc chưa tải xong, tự động hiển thị gradient và emoji mặc định ban đầu.
  - Huy hiệu góc ảnh: Hiển thị icon máy ảnh kèm số lượng ảnh/video (ví dụ: `📷 6`).

#### [MODIFY] [PlaceDetailModal.tsx](file:///home/dev_ntd/Documents/plan_playing/components/user/PlaceDetailModal.tsx)
- Cột bên trái: Banner Hero đổi thành ảnh bìa thực tế `place.coverUrl`.
- Thêm tab hoặc khu vực chuyên biệt **"📸 Bộ sưu tập Ảnh & Video"** nhúng component `PlaceMediaGallery`.
- Người dùng có thể lướt xem góc chụp đẹp (`photoSpots`), cách tạo dáng (`poses`) đối chiếu trực tiếp với ảnh thật tại địa điểm.

#### [MODIFY] [page.tsx (Trang chi tiết ISR /places/[slug])](file:///home/dev_ntd/Documents/plan_playing/app/(user)/places/[slug]/page.tsx)
- Cập nhật `generateMetadata`: Gán `og:image: [place.coverUrl]` để khi chia sẻ link qua Messenger, Zalo, iMessage sẽ hiển thị ảnh thumbnail sắc nét.
- Hero Section: Nền ảnh bìa tràn viền kết hợp parallax nhẹ hoặc bo góc lớn sang trọng.
- Bổ sung section `MediaGallerySection`: Trưng bày toàn bộ 6 ảnh Unsplash/Wikimedia và video review phía dưới phần cẩm nang trang phục & giờ vàng.

#### [MODIFY] [page.tsx (Quẹt thẻ Match /match)](file:///home/dev_ntd/Documents/plan_playing/app/(user)/match/page.tsx)
- Thẻ quẹt F07: Sử dụng `currentPlace.coverUrl` làm ảnh nền toàn thẻ (như Tinder/Hinge), tạo trải nghiệm vuốt chạm trực quan hơn nhiều so với việc chỉ nhìn nền gradient và emoji.

#### [MODIFY] [page.tsx (Lộ trình hẹn hò /plans)](file:///home/dev_ntd/Documents/plan_playing/app/(user)/plans/page.tsx)
- Mỗi điểm dừng (Stop item) trong danh sách lộ trình bổ sung một thumbnail vuông 48x48 bo tròn góc hiển thị ảnh của địa điểm, giúp cặp đôi dễ hình dung điểm đến tiếp theo trong ngày hẹn.

#### [MODIFY] [AppContext.tsx](file:///home/dev_ntd/Documents/plan_playing/context/AppContext.tsx)
- Cập nhật để nạp catalog từ API `/api/v1/user/places` khi khởi chạy, tự động cập nhật danh sách kèm ảnh/video từ DB TiDB thật.

---

## Verification Plan

### Automated Tests
1. **Unit & Service Tests**:
   - Chạy `pnpm vitest run` kiểm tra toàn bộ 69 bài test hiện tại và bổ sung unit test cho `catalog.mapper.ts` xác minh việc map `coverUrl` và `media`.
2. **Type Check**:
   - Chạy `pnpm type-check` đảm bảo 0 lỗi TypeScript strict mode với các trường mới của `HanoiPlace`.
3. **Linting**:
   - Chạy `pnpm lint` bảo đảm 0 warning, 0 error.

### Database & Data Verification
1. Chạy script chuyển 10 địa điểm trong TiDB sang `status = 'published'`.
2. Kiểm tra API `GET /api/v1/user/places`: Đảm bảo trả về mảng 10 địa điểm đều có `coverUrl` và mảng `media` chứa 2-6 ảnh hợp lệ từ Unsplash/Wikimedia.

### Manual Verification
1. Mở trang chủ và trang `/explore`: Kiểm tra thẻ `PlaceCard` hiển thị ảnh sắc nét, responsive trên cả mobile và desktop.
2. Bấm vào một địa điểm bất kỳ: Kiểm tra `PlaceDetailModal` mở lên hiển thị ảnh bìa, gallery ảnh và thanh ghi công tác giả.
3. Mở trang chi tiết độc lập `/places/cau-long-bien`: Kiểm tra OpenGraph tag và phần gallery ảnh/video hiển thị mượt mà.
4. Mở trang `/match`: Kiểm tra trải nghiệm quẹt thẻ với ảnh nền chất lượng cao.
5. Mở trang `/plans`: Kiểm tra thumbnail ảnh hiển thị trong timeline lộ trình.
