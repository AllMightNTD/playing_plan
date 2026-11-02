# Date Plan UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng cấp toàn diện UI/UX trang Lịch Hẹn (`/plans` & Home Timeline), nối chặt Catalog thật, chuẩn hóa Bưu thiếp Airmail Zero-PII, xẻ nhỏ `PlanTimeline.tsx` (< 320 dòng/file) và đóng thông luồng Hoàn thành buổi hẹn sang Kho Kỷ Niệm (`POST /api/v1/user/memories`).

**Architecture:** Trích xuất pure enrichment engine (`lib/plan-enrichment.ts`), tách `PlanTimeline` thành 5 component con đơn trách nhiệm giữ nguyên props contract cũ, nâng cấp `AddStopModal`/`PlanAirmailCard` và mở bổ sung endpoint idempotent `POST /api/v1/user/memories` trên cả Drizzle TiDB lẫn In-Memory Store.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript Strict (Zero `any`), Tailwind CSS, TanStack Query v5, Drizzle ORM, Zod, Vitest.

## Global Constraints

- Zero `any`, Zero PII (tuyệt đối không lưu/hiển thị SĐT hay Email người dùng cặp đôi).
- Mỗi file mới hoặc refactor giữ kích thước < 400 dòng, comment trong code viết bằng Tiếng Anh.
- Transaction trên Drizzle bắt buộc ghi tuần tự (không dùng `Promise.all` bên trong `db.transaction`).
- Tự động commit cục bộ sau từng task hoàn chỉnh; tuyệt đối không chạy `git push`.

---

### Task 1: Shared Plan Enrichment Engine & Category Mapping

**Files:**
- Create: `lib/plan-enrichment.ts`
- Test: `lib/plan-enrichment.test.ts`

**Interfaces:**
- Consumes: `PlanStopDto` from `@/server/services/user/plan.mapper`, `HanoiPlace` from `@/lib/types/catalog`
- Produces: `EnrichedPlanStop`, `getPlaceCategoryMeta(category)`, `enrichPlanStops(stops, places)`, `matchCatalogPlaceByName(name, places)`, `DATING_TEMPLATES`

- [ ] **Step 1: Write failing unit tests in `lib/plan-enrichment.test.ts`** covering all 7 DB categories (`cafe`, `food`, `photo`, `walk`, `fun`, `indoor`, `nature`), legacy aliases (`coffee`, `activity`, `sunset`), `Plan B` note splitting, `placeSlug`/`coverUrl` enrichment, and `matchCatalogPlaceByName`.
- [ ] **Step 2: Run `./node_modules/.bin/vitest run lib/plan-enrichment.test.ts`** and confirm FAIL.
- [ ] **Step 3: Implement `lib/plan-enrichment.ts`** with pure functions and typed constants.
- [ ] **Step 4: Run `./node_modules/.bin/vitest run lib/plan-enrichment.test.ts`** and confirm PASS.
- [ ] **Step 5: Commit Task 1 locally.**

---

### Task 2: Backend Plan-to-Memory Bridge (`POST /api/v1/user/memories`) & 6-Layer Tests

**Files:**
- Modify: `lib/validators/user.ts`
- Modify: `server/db/repositories/types.ts`
- Modify: `server/db/demo/memory-store.ts`
- Modify: `server/db/demo/memories.memory.ts`
- Modify: `server/db/queries/user/memories.queries.ts`
- Modify: `server/services/user/memory.service.ts`
- Modify: `app/api/v1/user/memories/route.ts`
- Test: `server/services/user/memory.service.test.ts`, `server/security/route-scanner.test.ts`

**Interfaces:**
- Produces: `createPlanMemoryBodySchema`, `CreatePlanMemoryBody`, `completePlanWithMemory(session, input): Promise<MemoryCardDto>`

- [ ] **Step 1: Add failing 6-layer tests** in `server/services/user/memory.service.test.ts` (happy path, idempotent double-completion updating rating/journal without duplicates, locked secret plan rejection, boundary validation) and cross-room isolation test in `server/security/route-scanner.test.ts`.
- [ ] **Step 2: Run `./node_modules/.bin/vitest run server/services/user/memory.service.test.ts server/security/route-scanner.test.ts`** and confirm FAIL.
- [ ] **Step 3: Implement validator, repository method (Drizzle transaction + MemoryStore), service `completePlanWithMemory`, and `POST` handler in `app/api/v1/user/memories/route.ts`.**
- [ ] **Step 4: Run `./node_modules/.bin/vitest run server/services/user/memory.service.test.ts server/security/route-scanner.test.ts`** and confirm PASS.
- [ ] **Step 5: Commit Task 2 locally.**

---

### Task 3: Zero-PII `PlanAirmailCard` & Modals (`AddStopModal`, `CreatePlanModal`, `CompletePlanModal`)

**Files:**
- Modify: `components/plans/PlanAirmailCard.tsx`
- Modify: `components/plans/PlanAirmailCard.test.tsx`
- Modify: `components/plans/modals/AddStopModal.tsx`
- Create: `components/plans/modals/CreatePlanModal.tsx`
- Create: `components/plans/modals/CompletePlanModal.tsx`
- Create: `components/plans/PlanSwitcherBar.tsx`

- [ ] **Step 1: Update `components/plans/PlanAirmailCard.test.tsx`** to assert Zero-PII rendering (paired partner nickname + sync status, solo un-paired CTA, no phone/email fields) and watch it FAIL.
- [ ] **Step 2: Refactor `PlanAirmailCard.tsx`** to remove fake PII phone/email fields and display real anonymous room pairing status (`paired` vs `solo`) + real share/invite CTAs.
- [ ] **Step 3: Upgrade `AddStopModal.tsx`** with instant catalog autocomplete (`places` prop) emitting `placeId` when a catalog place is chosen or `customName` when typed manually.
- [ ] **Step 4: Create `CreatePlanModal.tsx`, `CompletePlanModal.tsx`, and `PlanSwitcherBar.tsx`.**
- [ ] **Step 5: Run `./node_modules/.bin/vitest run components/plans/PlanAirmailCard.test.tsx`** and confirm PASS, then commit Task 3 locally.

---

### Task 4: Decompose `PlanTimeline.tsx` & Wire `PlansPage` + `HomePage`

**Files:**
- Create: `components/plans/timeline/PlanHeaderBar.tsx`
- Create: `components/plans/timeline/PlanQuickToolbar.tsx`
- Create: `components/plans/timeline/TimelineStopCard.tsx`
- Create: `components/plans/timeline/PlanFooterActions.tsx`
- Modify: `components/plans/PlanTimeline.tsx`
- Modify: `components/plans/PlanTimeline.test.tsx`
- Modify: `app/(user)/plans/page.tsx`
- Modify: `app/(user)/page.tsx`

- [ ] **Step 1: Expand `components/plans/PlanTimeline.test.tsx`** with tests for `done` badge, catalog stop click-to-detail (`placeSlug`), AI optimizer button, and complete-plan trigger; run Vitest to see new assertions FAIL.
- [ ] **Step 2: Extract `PlanHeaderBar`, `PlanQuickToolbar`, `TimelineStopCard`, and `PlanFooterActions`**, then slim down `PlanTimeline.tsx` (< 320 lines) with optimistic rollback + toast feedback and catalog-linked template creation.
- [ ] **Step 3: Wire `app/(user)/plans/page.tsx` and `app/(user)/page.tsx`** to `enrichPlanStops`, `PlanSwitcherBar`, `CreatePlanModal`, `CompletePlanModal`, real `roomConnection` on `PlanAirmailCard`, and remove nested background bloat on `/plans`.
- [ ] **Step 4: Full Verification Gate**: Run `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/next lint`, and full `./node_modules/.bin/vitest run` across the entire codebase, self-audit `git diff`, and commit Task 4 locally.
