# Thiết Kế Kỹ Thuật: Đập Lại & Nâng Tầm UI/UX Lịch Hẹn (Chặng 1)

**Ngày:** 2026-11-02  
**Phạm vi:** Chặng 1 trong lộ trình 3 chặng (1. UI/UX Lịch Hẹn ➔ 2. Tối ưu Query Backend ➔ 3. Chuẩn hóa Pipeline AI)

## 1. Mục tiêu & Vấn đề Cần Giải Quyết

1. **Quá tải độ phức tạp tại `PlanTimeline.tsx` (1.490 dòng)**: Vi phạm ngưỡng tách module (< 400 dòng/file) trong `coding-rule.md`, trộn lẫn UI header, bộ template, từng thẻ chặng và toàn bộ API fetch inline.
2. **Đứt gãy liên kết với Catalog thật**:
   - Logic làm giàu điểm dừng (`enrichedStops`) lặp lại ở 3 nơi (`HomePage`, `PlansPage`, `PlanTimeline`) và chỉ map 4 key giả (`coffee`, `food`, `activity`, `sunset`) thay vì 7 `PlaceCategory` thật trong DB (`cafe`, `food`, `photo`, `walk`, `fun`, `indoor`, `nature`).
   - `AddStopModal` và `DATING_TEMPLATES` chỉ gửi `customName` (`placeId: null`), khiến điểm dừng mất tọa độ GPS thật, mất ảnh bìa, mất cờ `indoor` và không mở được `PlaceDetailModal`.
3. **Thiếu luồng Đa Buổi Hẹn & Đóng vòng Kỷ Niệm**:
   - Khi `plans.length >= 1`, người dùng mất nút tạo buổi hẹn mới trên `/plans`.
   - Bảng DB `memories` và giao diện `/memories` đã có chiều đọc nhưng thiếu API ghi khi hoàn thành một buổi hẹn (`status = 'done'`).
4. **Vi phạm Zero-PII trên `PlanAirmailCard`**:
   - Hardcode SĐT/Email giả (`0987 654 321`, `nguoithuong.hanoi@gmail.com`) và nút gửi lịch chỉ copy `window.location.href` thay vì mở thiệp mời `/p/share/[shareToken]` hoặc mời ghép phòng.

## 2. Kiến trúc Module Đề xuất (Phương án 1)

### 2.1. Shared Plan Enrichment (`lib/plan-enrichment.ts`)
- Chuẩn hóa `PLACE_CATEGORY_META` cho toàn bộ 7 danh mục DB + alias cũ.
- Hàm pure `enrichPlanStops(stops, places)` trả về danh sách chặng kèm `placeSlug`, `coverUrl`, `lat`, `lng`, `isIndoor`, `address`, `planBNote`, `note`.
- Hàm pure `matchCatalogPlaceByName(name, places)` giúp `DATING_TEMPLATES` tự động liên kết `placeId` thật khi có trong catalog.

### 2.2. Phân rã Component Frontend (< 320 dòng/file)
- `components/plans/PlanTimeline.tsx`: Orchestrator quản lý state optimistic có snapshot rollback khi lỗi mạng và kết nối các sub-components.
- `components/plans/timeline/PlanHeaderBar.tsx`: Inline title/date/time editor, badge trạng thái (`planned`, `done`, `isSecret`), nút *Hoàn thành & Lưu kỷ niệm* và nút xóa.
- `components/plans/timeline/PlanQuickToolbar.tsx`: Nút AI xếp lịch hợp lý (`optimizeItinerarySequence`), căn Giờ Vàng Hoàng Hôn, đổi Plan B phòng mưa, và vùng chọn `DATING_TEMPLATES` khi lịch trống.
- `components/plans/timeline/TimelineStopCard.tsx`: Thẻ chặng tối ưu mobile `390px`, hiện ảnh thumbnail + bấm mở chi tiết quán nếu có `placeSlug`, cụm nút `±15p`, ghim giờ, kéo thả / lên xuống và ghi chú nhanh.
- `components/plans/timeline/PlanFooterActions.tsx`: Checklist đồ chuẩn bị, xuất `.ics`, mở thiệp chia sẻ.
- `components/plans/PlanSwitcherBar.tsx`: Lọc `Sắp tới` / `Đã đi` và nút `+ Tạo lịch mới`.
- `components/plans/modals/CreatePlanModal.tsx` & `CompletePlanModal.tsx`: Tạo buổi hẹn mới (kèm tùy chọn *Buổi hẹn bất ngờ 🎁*) và lưu cảm xúc hoàn thành buổi hẹn.
- `components/plans/modals/AddStopModal.tsx`: Tìm kiếm gợi ý trực tiếp trên `places` thật của Catalog hoặc nhập tên tự do (tuân thủ XOR `placeId` vs `customName`).
- `components/plans/PlanAirmailCard.tsx`: Thay thế hoàn toàn SĐT/Email bằng trạng thái Phòng Đôi ẩn danh (`paired` / `solo`), đồng bộ Zero-PII.

### 2.3. Backend Plan-to-Memory Bridge (`POST /api/v1/user/memories`)
- Schema `createPlanMemoryBodySchema` trong `lib/validators/user.ts`: `{ planId, rating (1..5), journal (max 1000) }`.
- Service `completePlanWithMemory(session, input)` trong `server/services/user/memory.service.ts`:
  - Kiểm tra quyền sở hữu phòng & chặn khóa bí mật qua `loadEditablePlan(session, planId)`.
  - Thực thi atomic & idempotent qua `MemoryRepository.saveCompletedPlanMemory`: cập nhật `date_plans.status = 'done'` và upsert bản ghi `memories` theo `(roomId, planId)` trong cùng 1 transaction tuần tự.
  - Cập nhật đồng bộ cả `drizzleMemoryRepository` và `memoryMemoryRepository` (bổ sung `memories` vào `MemoryStore`).

## 3. Chiến lược Kiểm thử 6 Tầng
1. **Happy Path**: Tạo lịch ➔ gắn chặng `placeId` ➔ tính km & Golden Hour ➔ hoàn thành buổi hẹn ➔ đọc lại trên `getMemoryBoard()`.
2. **Legacy Data**: Chặng cũ chỉ có `customName`, thiếu tọa độ hoặc dùng category cũ vẫn render đúng.
3. **Room Isolation**: Phòng B gọi `POST /api/v1/user/memories` với `planId` của Phòng A nhận `404 PLAN_NOT_FOUND`.
4. **Boundary Inputs**: `rating` ngoài `1..5`, `journal > 1000` ký tự bị Zod chặn `400 VALIDATION_FAILED`.
5. **Idempotency / Concurrency**: Gọi lặp `completePlanWithMemory` trên cùng `planId` chỉ giữ đúng 1 thẻ kỷ niệm, cập nhật `rating`/`journal` mới nhất.
6. **Regression**: Toàn bộ test suite `PlanTimeline`, `PlanAirmailCard`, `plan-optimizer`, `plan.service`, `memory.service`, `route-scanner` PASS 100%.
