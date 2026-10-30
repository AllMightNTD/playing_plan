# Perf Optimization, Smart Polling & Strict Data Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triệt tiêu triệt để hiện tượng network waterfall tải toàn bộ catalog trên client, tối ưu battery/connection pool cho swipe polling qua Page Visibility & Adaptive Backoff, bẻ gãy cơ chế nuốt lỗi fallback sang mock data ở backend service, và hoàn thiện trải nghiệm CTA trên bản đồ cào 7 quận.

**Architecture:** 
- Tách luồng catalog data: `AppContext` chỉ giữ trang đầu (first page preview) cho Home/Wheel, còn màn Explore chuyển sang tự quản lý phân trang Cursor (Load More / Infinite).
- Nâng cấp `SwipeDeck`: Polling tự động đóng băng khi tab chạy ngầm (`visibilitychange`) và giãn tần suất theo chu kỳ không có tương tác (`adaptive backoff`).
- Chuẩn hóa `places.service.ts`: Khi `isDatabaseConfigured() === true`, cấm tuyệt đối nuốt lỗi query và cấm fallback về `getSeedPlaces()` khi bảng rỗng.
- Bản đồ cào (`ScratchMapHanoi.tsx`): Bổ sung action CTA điều hướng sang `/explore?district=[key]` khi chạm vào ô quận chưa mở.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript Strict, TiDB Serverless, Vitest.

## Global Constraints

- Tuân thủ nghiêm ngặt 17 module tiêu chuẩn hệ thống trong `GEMINI.md` và `.agents/rules/coding-rule.md`.
- Zero secrets leakage: Không truy cập, in ra terminal hay chỉnh sửa `.env`.
- Mọi task phải có test tự động và chạy `pnpm type-check`, `pnpm lint`, `pnpm test` đạt 100% pass trước khi commit.
- Tự động commit cục bộ từng bước sau khi test pass (`git commit -m "..."`), TUYỆT ĐỐI KHÔNG `git push`.

---

### Task 1: Dọn Dẹp Fallback Mock Data & Chống Nuốt Lỗi Trong `places.service.ts`

**Files:**
- Modify: `server/services/user/places.service.ts:27-60`
- Test: `server/services/user/places.service.test.ts`

**Interfaces:**
- Consumes: `isDatabaseConfigured()` từ `@/server/db/client`, `listPublishedPlacesWithGuides()` từ `@/server/db/queries/user/places.queries`.
- Produces: `getAllPublishedPlaces(): Promise<HanoiPlace[]>` ném lỗi chuẩn hoặc trả `[]` khi DB rỗng (thay vì âm thầm trả 36 mock places khi đã cấu hình DB).

- [ ] **Step 1: Viết test kiểm tra hành vi nghiêm ngặt của `getAllPublishedPlaces`**

Tạo file `server/services/user/places.service.test.ts`:
```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAllPublishedPlaces } from "./places.service";
import { isDatabaseConfigured } from "@/server/db/client";
import { listPublishedPlacesWithGuides, listMediaByPlaceIds } from "@/server/db/queries/user/places.queries";

vi.mock("@/server/db/client", () => ({
  isDatabaseConfigured: vi.fn(),
}));

vi.mock("@/server/db/queries/user/places.queries", () => ({
  listPublishedPlacesWithGuides: vi.fn(),
  listMediaByPlaceIds: vi.fn(),
}));

describe("places.service - getAllPublishedPlaces strict mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("khi DB đã cấu hình nhưng trả về 0 bản ghi, phải trả về mảng rỗng [] thay vì fallback sang mock-data", async () => {
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(listPublishedPlacesWithGuides).mockResolvedValue([]);

    const result = await getAllPublishedPlaces();
    expect(result).toEqual([]);
    expect(listPublishedPlacesWithGuides).toHaveBeenCalledTimes(1);
  });

  it("khi DB đã cấu hình nhưng câu lệnh query bị lỗi, phải ném lỗi ra ngoài thay vì nuốt lỗi", async () => {
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(listPublishedPlacesWithGuides).mockRejectedValue(new Error("TiDB connection timeout"));

    await expect(getAllPublishedPlaces()).rejects.toThrow("TiDB connection timeout");
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test FAIL (do code hiện tại đang fallback về getSeedPlaces)**

Run: `pnpm test server/services/user/places.service.test.ts`
Expected: FAIL (vì code hiện tại trả về 36 mock places và nuốt lỗi catch).

- [ ] **Step 3: Cập nhật `server/services/user/places.service.ts`**

Chỉnh sửa `getAllPublishedPlaces`:
```typescript
export async function getAllPublishedPlaces(): Promise<HanoiPlace[]> {
  // Chỉ dùng seed data khi chạy unit test offline hoặc dev chưa cấu hình DB
  if (!isDatabaseConfigured()) {
    if (isProduction()) throw new AppError(ERRORS.COMMON.DB_NOT_CONFIGURED);
    return getSeedPlaces();
  }

  // Khi DB đã cấu hình: Database là nguồn chân lý duy nhất (Single Source of Truth)
  const rows = await listPublishedPlacesWithGuides();
  if (rows.length === 0) {
    return [];
  }

  const placeIds = rows.map((r) => r.place.id);
  const mediaRows = await listMediaByPlaceIds(placeIds);

  const mediaByPlaceId = new Map<string, PlaceMedia[]>();
  for (const media of mediaRows) {
    const list = mediaByPlaceId.get(media.placeId) ?? [];
    list.push(media);
    mediaByPlaceId.set(media.placeId, list);
  }

  const now = new Date();
  return rows.map(({ place, guide }) =>
    toCatalogPlace(place, guide, mediaByPlaceId.get(place.id) ?? [], now)
  );
}
```

- [ ] **Step 4: Chạy lại test suite để xác nhận PASS**

Run: `pnpm test server/services/user/places.service.test.ts`
Expected: PASS

- [ ] **Step 5: Chạy full test suite kiểm tra hồi quy và Commit**

Run: `pnpm test`
Expected: 54 suites PASS.
```bash
git add server/services/user/places.service.ts server/services/user/places.service.test.ts
git commit -m "fix(catalog): enforce strict db source of truth in getAllPublishedPlaces without silent mock fallback"
```

---

### Task 2: Smart Polling & Battery-Saving Cho `SwipeDeck.tsx`

**Files:**
- Modify: `components/scrapbook/SwipeDeck.tsx:112-160`
- Test: `lib/polling-backoff.test.ts`

**Interfaces:**
- Consumes: `document.visibilityState`, ETag từ `/api/v1/user/swipes/deck`.
- Produces: Cơ chế polling thích ứng (Adaptive Interval 3s -> 6s -> 12s) và đóng băng hoàn toàn khi ẩn tab.

- [ ] **Step 1: Viết test cho thuật toán Adaptive Polling Backoff**

Tạo file `lib/polling-backoff.ts` và test `lib/polling-backoff.test.ts`:
```typescript
// lib/polling-backoff.test.ts
import { describe, it, expect } from "vitest";
import { calculateNextPollInterval, INITIAL_POLL_INTERVAL_MS, MAX_POLL_INTERVAL_MS } from "./polling-backoff";

describe("polling-backoff logic", () => {
  it("trả về interval cơ bản khi mới bắt đầu hoặc có hoạt động mới", () => {
    expect(calculateNextPollInterval(0, true)).toBe(INITIAL_POLL_INTERVAL_MS);
    expect(calculateNextPollInterval(5, true)).toBe(INITIAL_POLL_INTERVAL_MS);
  });

  it("tăng dần interval theo cấp số nhân khi không có hoạt động mới", () => {
    // 0 lần rảnh -> 3s
    expect(calculateNextPollInterval(0, false)).toBe(3000);
    // 1 lần rảnh -> 3s
    expect(calculateNextPollInterval(1, false)).toBe(3000);
    // 2 lần rảnh -> 6s
    expect(calculateNextPollInterval(2, false)).toBe(6000);
    // 3 lần rảnh -> 12s (chạm max 12s)
    expect(calculateNextPollInterval(3, false)).toBe(12000);
    // >3 lần rảnh -> không vượt quá MAX_POLL_INTERVAL_MS (12s)
    expect(calculateNextPollInterval(10, false)).toBe(MAX_POLL_INTERVAL_MS);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `pnpm test lib/polling-backoff.test.ts`
Expected: FAIL ("cannot find module ./polling-backoff").

- [ ] **Step 3: Triển khai `lib/polling-backoff.ts`**

```typescript
export const INITIAL_POLL_INTERVAL_MS = 3000;
export const MAX_POLL_INTERVAL_MS = 12000;

export function calculateNextPollInterval(idlePollCount: number, hasUserActivity: boolean): number {
  if (hasUserActivity) {
    return INITIAL_POLL_INTERVAL_MS;
  }
  if (idlePollCount < 2) {
    return INITIAL_POLL_INTERVAL_MS;
  }
  const factor = Math.pow(2, idlePollCount - 1);
  return Math.min(INITIAL_POLL_INTERVAL_MS * factor, MAX_POLL_INTERVAL_MS);
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `pnpm test lib/polling-backoff.test.ts`
Expected: PASS.

- [ ] **Step 5: Tích hợp vào `components/scrapbook/SwipeDeck.tsx`**

Cập nhật `SwipeDeck.tsx`:
1. Sử dụng `calculateNextPollInterval` để điều chỉnh `setTimeout` thay cho `setInterval` cứng.
2. Thêm lắng nghe sự kiện `document.addEventListener("visibilitychange", ...)`:
   - Khi `document.hidden`: Dừng timeout hiện tại (`clearTimeout`).
   - Khi `!document.hidden`: Kích hoạt `pollMatches(true)` ngay lập tức và tái khởi động vòng lặp polling.
3. Khi người dùng vuốt thẻ (`handleSwipe`), reset `idleCountRef.current = 0`.
4. Dừng polling khi `deck.length === 0`.

- [ ] **Step 6: Kiểm tra type-check, lint và commit**

Run: `pnpm type-check && pnpm lint`
```bash
git add lib/polling-backoff.ts lib/polling-backoff.test.ts components/scrapbook/SwipeDeck.tsx
git commit -m "feat(swipe): add smart adaptive polling with visibility change listener and battery backoff"
```

---

### Task 3: Giải Quyết Waterfall `fetchAllPlaces` & Bổ Sung Phân Trang Cursor Cho Explore

**Files:**
- Modify: `context/AppContext.tsx:34-47, 137-142`
- Modify: `app/(user)/explore/page.tsx`
- Test: `app/api/v1/user/places/places-pagination.test.ts`

**Interfaces:**
- Consumes: `/api/v1/user/places?limit=12&cursor=...`
- Produces: `AppContext` tải gọn trang đầu tiên (24 quán) nhanh chóng, không loop vô hạn; `ExplorePage` có state `nextCursor`, nút "Tải thêm địa điểm" (Load More) và hiển thị số lượng trực quan.

- [ ] **Step 1: Viết test cho hành vi cursor pagination của API places**

Tạo `app/api/v1/user/places/places-pagination.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { queryPlaces } from "@/server/services/user/places.service";

vi.mock("@/server/db/client", () => ({ isDatabaseConfigured: vi.fn(() => false) }));

describe("Places cursor pagination", () => {
  it("phân trang đúng giới hạn limit và trả về nextCursor hợp lệ khi còn phần tử", async () => {
    const page1 = await queryPlaces({}, undefined, 6);
    expect(page1.items.length).toBe(6);
    expect(page1.nextCursor).toBeTruthy();

    const page2 = await queryPlaces({}, page1.nextCursor ?? undefined, 6);
    expect(page2.items.length).toBe(6);
    const page1Ids = new Set(page1.items.map((p) => p.id));
    for (const item of page2.items) {
      expect(page1Ids.has(item.id)).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Chạy test kiểm tra API**

Run: `pnpm test app/api/v1/user/places/places-pagination.test.ts`
Expected: PASS.

- [ ] **Step 3: Tối ưu `AppContext.tsx`**

Bỏ vòng lặp `do ... while (cursor)` trong `fetchAllPlaces()`. Thay vào đó, `loadInitialPlaces()` chỉ lấy đúng 1 trang đầu (24 quán) với `limit=24`.
Cung cấp thêm hàm `fetchMorePlaces(cursor: string)` để caller (Explore page) có thể tải tiếp khi cần.

- [ ] **Step 4: Nâng cấp `app/(user)/explore/page.tsx` với Cursor Load More**

- Thêm state `isLoadingMore: boolean`, `nextCursor: string | null`.
- Thêm nút "Xem thêm địa điểm hẹn hò (12 quán tiếp theo)" ở cuối danh sách.
- Khi bấm load more, gọi `fetch(/api/v1/user/places?limit=12&cursor=${nextCursor}&...)` và append vào danh sách hiện tại.

- [ ] **Step 5: Kiểm tra type-check, lint và commit**

Run: `pnpm type-check && pnpm lint && pnpm test`
```bash
git add context/AppContext.tsx app/\(user\)/explore/page.tsx app/api/v1/user/places/places-pagination.test.ts
git commit -m "perf(explore): replace blocking full catalog fetch with cursor-based load more pagination"
```

---

### Task 4: Bổ Sung CTA Khám Phá Địa Điểm Theo Quận Trên `ScratchMapHanoi.tsx`

**Files:**
- Modify: `components/scrapbook/ScratchMapHanoi.tsx`
- Test: `lib/districts-nav.test.ts`

**Interfaces:**
- Consumes: `HANOI_7_DISTRICTS`, `useRouter` từ `next/navigation`.
- Produces: Khi người dùng bấm vào ô quận chưa cào, hiển thị toast kèm nút hoặc điều hướng trực tiếp sang `/explore?district=[key]` để gợi ý điểm hẹn hò tại quận đó.

- [ ] **Step 1: Viết test cho logic điều hướng quận**

Tạo `lib/districts-nav.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { getExploreDistrictUrl } from "./districts-nav";

describe("getExploreDistrictUrl", () => {
  it("sinh URL đúng định dạng để Explore page tự kích hoạt filter quận", () => {
    expect(getExploreDistrictUrl("hoan-kiem")).toBe("/explore?district=hoan-kiem");
    expect(getExploreDistrictUrl("tay-ho")).toBe("/explore?district=tay-ho");
  });
});
```

- [ ] **Step 2: Tạo `lib/districts-nav.ts` và chạy test**

```typescript
export function getExploreDistrictUrl(districtKey: string): string {
  return `/explore?district=${encodeURIComponent(districtKey)}`;
}
```
Run: `pnpm test lib/districts-nav.test.ts`
Expected: PASS.

- [ ] **Step 3: Cập nhật `components/scrapbook/ScratchMapHanoi.tsx`**

- Import `useRouter` từ `next/navigation`.
- Khi bấm vào ô chưa cào: Ngoài toast giải thích điều kiện check-in, thêm nút/link nhỏ trên ô: `"Tìm quán ở [Quận] →"` điều hướng sang `/explore?district=[key]`.

- [ ] **Step 4: Kiểm tra type-check, lint và commit**

Run: `pnpm type-check && pnpm lint && pnpm test`
```bash
git add lib/districts-nav.ts lib/districts-nav.test.ts components/scrapbook/ScratchMapHanoi.tsx
git commit -m "feat(gamification): add explore district CTA to unopened scratch map tiles"
```

---

## Verification Plan

### Automated Tests
1. `pnpm type-check`: Toàn bộ TypeScript strict mode 0 lỗi.
2. `pnpm lint`: ESLint 0 warning, 0 error.
3. `pnpm test`: Chạy toàn bộ 55+ test suites Vitest đảm bảo PASS 100%.

### Manual Verification
1. **Explore Pagination**:
   - Mở `/explore`, kiểm tra Network Tab: Chỉ tải đúng 1 batch đầu (không còn vòng lặp tải 100% dữ liệu).
   - Cuộn xuống dưới, bấm "Tải thêm địa điểm" ➔ Tải đúng batch tiếp theo và render mượt mà.
2. **Swipe Smart Polling**:
   - Mở `/match`, quan sát Network tab: Polling 3s.
   - Chuyển sang tab trình duyệt khác ➔ Polling lập tức dừng (0 request).
   - Chuyển lại tab `/match` ➔ Polling chạy lại ngay lập tức.
3. **Scratch Map CTA**:
   - Chạm vào ô "Tây Hồ" chưa cào ➔ Xuất hiện gợi ý kèm link chuyển sang `/explore?district=tay-ho` với danh sách quán thuộc Tây Hồ.
