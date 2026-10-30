# Kế hoạch Triển khai: Refactor Toàn Diện Giao Diện Buổi Hẹn & Dự Báo Hẹn Hò Airmail Postcard

> **Dành cho agent thực thi:** BẮT BUỘC SỬ DỤNG SUB-SKILL: Dùng `superpowers:subagent-driven-development` (khuyến nghị) hoặc `superpowers:executing-plans` để triển khai từng task theo định dạng checkbox (`- [ ]`).

**Mục tiêu:** Tái cấu trúc toàn diện trang Lịch Hẹn (`/plans`) và Timeline theo thiết kế bưu thiếp Airmail vintage cao cấp và layout 2 cột từ bản demo (`buoi_hen_demo.tsx` & `media_1793332182147.png`). Kết nối 100% dữ liệu thật và các endpoint backend hiện có của DateMate (`/api/v1/user/plans/*`), áp dụng cơ chế TanStack Query v5 memory caching và Optimistic UI để đảm bảo giao diện phản hồi 0ms, mượt mà 60fps trên mọi thiết bị.

---

## 1. Phân Tích Kiến Trúc & Blast Radius

### 1.1. Hiện trạng Codebase
- `app/(user)/plans/page.tsx`: Đã được tích hợp TanStack Query v5 (`useQuery(["user", "plans"])`, `useQuery(["user", "plan", selectedPlanId])`), nhưng bố cục cũ chia Cột trái (7 cols) là `InteractiveTimeline` sơ sài và Cột phải (5 cols) là Checklist tĩnh đơn điệu.
- `components/scrapbook/InteractiveTimeline.tsx`: Đang hỗ trợ đổi thứ tự, ghim giờ, ±15p ripple shift nhưng chưa có:
  - Bố cục thẻ chặng vintage chuẩn theo ảnh demo (Node số 1, 2, 3 trên timeline nét đứt, nhãn đỏ gạch, nhãn giờ vàng hoàng hôn, nhãn phòng mưa Plan B).
  - Kéo thả mượt mà (HTML5 Drag & Drop) kết hợp nút di chuyển Lên/Xuống cho màn hình cảm ứng di động.
  - Sửa ghi chú nhanh nội dòng (inline quick note editing) cho từng chặng.
  - Thuật toán AI Optimizer tự động sắp xếp thứ tự chặng hợp lý (Cafe mở đầu -> Tham quan/Hoàng hôn -> Ăn tối -> Cafe đêm).
  - Tích hợp tính toán di chuyển chuẩn đường phố Hà Nội (khoảng cách Haversine * 1.35 + 8-10 phút gửi xe).
- Thiếu component **Bưu thiếp Airmail (`PlanAirmailCard`)** ở cột phải:
  - Dự báo thời tiết Hà Nội (Open-Meteo thật từ `homePublic.weather`).
  - Giờ vàng chụp ảnh & Giờ xanh lên đèn (SunCalc thật từ `homePublic.sun`).
  - Gợi ý hẹn hò thông minh theo thời tiết (`homePublic.weatherTip`).
  - Thẻ kết nối Người thương (hiển thị thành viên trong phòng, trạng thái đồng bộ, gửi thông báo).
  - Ô ghi chú chung buổi hẹn (gắn trực tiếp với `plan.note` trong DB TiDB Serverless qua `PATCH /api/v1/user/plans/[id]`).
  - Tóm tắt mốc giờ và tổng quãng đường / thời lượng hành trình.

### 1.2. Chiến lược Caching & Hiệu Năng (Zero-Latency)
- **TanStack Query v5 Cache**: Tái sử dụng `["user", "plan", selectedPlanId]` với `staleTime: 5 phút`, `gcTime: 30 phút`.
- **Optimistic UI Updates (0ms phản hồi)**:
  - Kéo thả đổi vị trí chặng -> Cập nhật `localStops` ngay lập tức, gọi PATCH `stops/reorder` ngầm.
  - Tăng/giảm thời lượng chặng (±15p) -> Cập nhật ngay trên DOM, gọi `ripple-shift` ngầm.
  - Ghim/bỏ ghim giờ (`isPinnedTime`) -> Đổi màu pin tức thì, gọi PATCH `stops/[id]` ngầm.
  - Lưu ghi chú chặng & ghi chú chung -> Cập nhật state lạc quan, debounce gửi API.
  - Check item checklist -> Đổi gạch ngang ngay lập tức, gọi PATCH `checklist/[itemId]` ngầm.
- **Mobile-First & 60fps Animation**:
  - Hỗ trợ cả thao tác vuốt chạm trên iPhone/Android và chuột kéo thả trên Desktop.
  - Touch target >= 44px, sử dụng GPU transforms (`translate`, `opacity`, `scale`).

---

## 2. Kế Hoạch Triển Khai Chi Tiết (4 Tasks)

### Task 1: CSS Design Tokens & Thuật Toán AI Itinerary Optimizer (`lib/plan-optimizer.ts`)

**Files:**
- Modify: `app/globals.css` (Bổ sung `.airmail-card`, `.vintage-shadow`, `.timeline-line` styling)
- Create: `lib/plan-optimizer.ts` (Pure logic tính toán timeline, khoảng cách di chuyển và thuật toán xếp lịch hợp lý)
- Create: `lib/plan-optimizer.test.ts` (Unit test 100% bao phủ)

**Nghiệp vụ:**
1. Thêm utility CSS cho viền Airmail bưu thiếp sọc xanh-đỏ-trắng vintage chuẩn xác theo demo.
2. Xây dựng pure helper `computePlanTimeline()`:
   - Tính toán mốc giờ bắt đầu và kết thúc từng chặng dựa vào `startTime` và `durationMin`.
   - Tính thời gian di chuyển từ chặng trước: `calculateHaversineDistanceKm * 1.35` + 8 phút gửi xe.
   - Phát hiện cảnh báo xung đột giờ cố định (`timeConflictWarning`).
   - Đánh dấu chặng khớp Giờ vàng Hoàng hôn (16:23 - 17:23).
3. Xây dựng pure helper `optimizeItinerarySequence()`:
   - Phân loại vai trò điểm đến: Cafe mở đầu (score 1) ➔ Hoạt động / Bảo tàng / Hoàng hôn (score 2) ➔ Ăn tối (score 3) ➔ Cafe tâm sự tối (score 4).
   - Tối ưu hóa thứ tự để giảm thiểu quãng đường di chuyển lòng vòng.

**Verification:**
- `pnpm test lib/plan-optimizer.test.ts` PASS 100%.

---

### Task 2: Xây Dựng Component Bưu Thiếp Airmail (`components/plans/PlanAirmailCard.tsx`)

**Files:**
- Create: `components/plans/PlanAirmailCard.tsx`
- Create: `components/plans/PlanAirmailCard.test.tsx`

**Nghiệp vụ:**
1. Khung bưu thiếp Airmail với viền sọc đặc trưng (`.airmail-card`).
2. **Khối Thời Tiết & SunCalc**:
   - Hiển thị nhiệt độ, trạng thái thời tiết, xác suất mưa và con tem bưu thiếp `🌤️ HÔM NAY`.
   - 2 thẻ nổi bật: `🌅 Giờ vàng chụp ảnh` ({sun.goldenHour.start} - {sun.goldenHour.end}) và `🌌 Giờ xanh lên đèn` ({sun.blueHour.start} - {sun.blueHour.end}).
   - Hộp gợi ý thông minh từ DateMate (`homePublic.weatherTip`).
3. **Khối Kết Nối Người Thương (SĐT / Email)**:
   - Hiển thị thông tin đối phương từ `roomProfile.members`.
   - Nút `Gửi thông báo ngay ➔` sao chép liên kết phòng bí mật / gửi thông báo cập nhật.
4. **Khối Ghi Chú Chung Buổi Hẹn**:
   - Ô textarea nhập ghi chú chung (`plan.note`), tự động lưu vào backend qua `PATCH /api/v1/user/plans/[id]` khi người dùng rời ô nhập hoặc sau 800ms debounce.
5. **Khối Tóm Tắt Mốc Giờ**:
   - Danh sách mốc thời gian rút gọn (Compact itinerary) hiển thị tổng quãng đường (km) và tổng thời lượng.
6. Chân bưu thiếp: Cập nhật tự động theo Hà Nội • Open-Meteo (CC-BY 4.0).

**Verification:**
- `pnpm test components/plans/PlanAirmailCard.test.tsx` PASS 100%.

---

### Task 3: Tái Cấu Trúc Toàn Diện Timeline Buổi Hẹn (`components/plans/PlanTimeline.tsx`)

**Files:**
- Create: `components/plans/PlanTimeline.tsx` (Thay thế/Nâng cấp `InteractiveTimeline.tsx`)
- Create: `components/plans/modals/AddStopModal.tsx`
- Create: `components/plans/modals/PlanChecklistModal.tsx`
- Create: `components/plans/modals/DeletePlanModal.tsx`

**Nghiệp vụ:**
1. **Header Buổi Hẹn**:
   - Nhãn `📍 Lịch hẹn sắp tới`, nút chọn nhanh Ngày & Giờ bắt đầu (mở form sửa inline).
   - Nút `🖼️ Tạo ảnh Story chia sẻ`, nút sửa và nút xóa lịch hẹn.
   - Tiêu đề buổi hẹn hiển thị lớn, bấm vào để sửa trực tiếp.
2. **Banner Cảnh Báo Cập Nhật Từ Người Thương**:
   - Tự động hiển thị khi người thương vừa chỉnh sửa lịch hoặc khi API trả về 409 Conflict.
   - Nút `🔄 Cập nhật ngay` refetch lại data tức thì.
3. **Thanh Công Cụ Thông Minh**:
   - `✨ Hệ thống gợi ý lịch trình hợp lý`: Mở preview hộp đề xuất sắp xếp chặng tối ưu từ Task 1 kèm nút áp dụng.
   - `🌅 Tự xếp giờ khớp Hoàng hôn`: Tự động gọi API `/auto-schedule`.
   - `🌧️ Đổi sang quán Trong nhà (Phòng mưa)`: Tự động gọi API `/plan-b`.
4. **Danh Sách Chặng Drag & Drop (HTML5 + Mobile Touch Controls)**:
   - Cột mốc thời gian nét đứt bên trái với node tròn đánh số thứ tự (1, 2, 3...).
   - Thẻ chặng hẹn vintage: Badge giờ đỏ gạch (`16:30 - 17:30`), Tên địa điểm + emoji, nhãn `📌 Cố định giờ`, nhãn `🌅 Đón Hoàng hôn`.
   - Cụm điều khiển: Nút Up/Down (cho mobile cảm ứng), `-15p`, `+15p` (ripple shift), nút `📌` (pin toggle), nút sửa chi tiết, nút xóa chặng.
   - Dòng thông tin di chuyển: `🛵 Di chuyển từ [Điểm trước]: +X phút (Y km, đã tính 8p gửi xe) • Dừng chân Z phút`.
   - Ghi chú riêng cho từng chặng: Bấm để sửa ghi chú nội dòng (inline textarea), lưu trực tiếp vào `stop.note`.
   - Liên kết chỉ đường: Mở Google Maps theo tọa độ thực tế.
5. **Nút Thêm Địa Điểm Mới Vào Mốc Tiếp Theo**:
   - Mở `AddStopModal` cho phép chọn nhanh từ danh sách quán hot Hà Nội hoặc tìm kiếm từ catalog địa điểm DateMate.
6. **Thanh Hành Động Chân Card**:
   - Nút `☑️ Đồ cần chuẩn bị: X/Y xong`: Mở `PlanChecklistModal` để check đồ, gán người phụ trách.
   - Nút `💌 Gửi lịch cho Người thương`.
   - Nút `📅 Lưu vào Lịch ĐT (.ics)`: Tải file `.ics` tương thích Apple/Google Calendar.

**Verification:**
- `pnpm type-check && pnpm lint && pnpm test` PASS 100%.

---

### Task 4: Tích Hợp Trang Kế Hoạch (`app/(user)/plans/page.tsx`), E2E Verification & Nghiệm Thu

**Files:**
- Modify: `app/(user)/plans/page.tsx`

**Nghiệp vụ:**
1. Cấu trúc lại trang `/plans` theo layout 2 cột chuẩn:
   - Banner hướng dẫn đầu trang: "DateMate gợi ý lịch trình hợp thời tiết nhất cho hai đứa nhé • Đã lưu tự động X mốc giờ...".
   - Cột trái (7 cols): `PlanTimeline`.
   - Cột phải (5 cols, sticky on desktop): `PlanAirmailCard`.
2. Giữ nguyên tính năng chuyển đổi nhiều buổi hẹn (`plans.length > 1`) và tính năng Hẹn bí bất ngờ (`isSecretLocked`).
3. Đảm bảo 100% kết nối TanStack Query v5 với cache vô hình 0ms khi di chuyển giữa các tab.
4. Kiểm thử toàn diện Quality Gates:
   - `pnpm type-check` (0 lỗi).
   - `pnpm lint` (0 lỗi, 0 warning).
   - `pnpm test` (toàn bộ 62+ test suites PASS).
5. Cập nhật `walkthrough.md` với ảnh chụp và hướng dẫn kiểm thử.

---

## 3. Ma Trận Kiểm Thử 6 Tầng (The 6-Layer Testing Matrix)

1. **Happy Path**: Kéo thả chặng, điều chỉnh ±15p, thêm địa điểm, check checklist hoạt động trơn tru.
2. **Legacy / Dirty Data**: Plan cũ không có tọa độ hoặc thiếu note vẫn hiển thị đẹp, fallback địa chỉ quận Hà Nội an toàn.
3. **Tenant & Multi-User Isolation**: Chỉ chỉnh sửa plan của phòng hiện tại; người lạ truy cập nhận 403 Forbidden.
4. **Boundary & Malformed Inputs**: Đặt thời lượng chặng < 15p hoặc > 240p được chặn an toàn; nhập tên trống không crash.
5. **Concurrency & Race Conditions**: Khi 2 người cùng sửa lịch trên 2 máy, cơ chế 409 Version Conflict hiển thị banner cảnh báo và nút "Cập nhật ngay" mượt mà.
6. **Regression & Blast Radius**: Đảm bảo các API catalog, match, và trang chủ không bị ảnh hưởng.
