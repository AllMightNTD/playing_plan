# Kế Hoạch Chi Tiết Triển Khai DateMate Lên Vercel (100% Free & Không Gián Đoạn Cron)

> **Tài liệu kiểm soát kiến trúc:** Dành cho đội ngũ kỹ sư triển khai dự án DateMate lên nền tảng đám mây Vercel, đảm bảo hệ thống tự động cào dữ liệu hoạt động trơn tru không chạm trần giới hạn Serverless Timeout.
> **Quy chuẩn Team:** Phê duyệt theo Gate G2 ([team-rule.md](file:///home/dev_ntd/Documents/plan_playing/.agents/rules/team-rule.md)).

---

## 1. TỔNG QUAN VÀ BỨC TRANH KIẾN TRÚC (ARCHITECTURAL HORIZON)

### 1.1. Mục tiêu
- Triển khai toàn bộ ứng dụng Next.js 15 (Web End-User, UI Khám phá, Admin Radar, API Public & Auth) lên nền tảng **Vercel Hobby Tier**.
- Đảm bảo hệ thống cào dữ liệu (OpenStreetMap Overpass + YouTube Couple Video Review) chạy tự động hàng ngày mà **KHÔNG BAO GIỜ bị lỗi 504 Timeout của Vercel**.
- Đảm bảo toàn bộ hệ sinh thái vận hành ở mức chi phí **0 VNĐ (100% Miễn phí trọn đời)**.

### 1.2. Vấn đề cốt lõi & Giải pháp phân tách (Decoupled Layer Architecture)
- **Vấn đề:** Vercel Hobby chỉ cho phép Serverless Function chạy tối đa **60 giây**. Quá trình cào 15 quận huyện Hà Nội (dù đã chia lưới 2x2) vẫn mất từ 60 - 120 giây để giãn cách Fair Use tránh bị OSM khóa IP. Nếu chạy trực tiếp trên Vercel Cron, request sẽ bị kill ngang xương.
- **Giải pháp:** 
  1. **Tầng Presentation & Web API:** Host trên **Vercel** (kết nối TiDB Cloud qua HTTPS fetch driver `@tidbcloud/serverless` không tốn connection pool).
  2. **Tầng Crawler & Ingestion Pipeline:** Chạy trên **GitHub Actions** (2.000 phút/tháng miễn phí, máy ảo Ubuntu riêng biệt, timeout 20 phút).
  3. **Tầng Đồng bộ Cache (Cache Synchronization):** Sau khi GitHub Actions nạp xong data mới vào TiDB Cloud lúc 03:30 AM, nó gửi một Webhook HTTPS an toàn về Vercel (`/api/v1/revalidate`) để xóa ISR cache, giúp người dùng nhận ngay địa điểm mới.

```
┌────────────────────────────────────────────────────────┐
│                   GitHub Repository                    │
└───────────────┬────────────────────────┬───────────────┘
                │ (git push)             │ (schedule: 03:30 AM)
                ▼                        ▼
┌──────────────────────────────┐  ┌───────────────────────────────────┐
│     Vercel Production        │  │     GitHub Actions Runner         │
│  (Next.js 15 Serverless)     │  │  (Ubuntu VM - 2000 free min/mo)   │
│                              │  │                                   │
│  - Edge Global CDN           │  │  - Chạy osm-ingest (lưới 2x2)    │
│  - Static & ISR Pages        │  │  - Chạy YouTube Couple Crawler    │
│  - /api/v1/user/places       │  │  - Ghi batch 50 items vào TiDB    │
│  - POST /api/v1/revalidate ◄─┼──┼── Bắn Webhook làm mới cache       │
└──────────────┬───────────────┘  └─────────────────┬─────────────────┘
               │                                    │
               │ (HTTPS Fetch Driver)               │ (HTTPS Fetch Driver)
               ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TiDB Cloud Serverless Free Tier                  │
│                     (5 GB Storage / 50M RU/tháng)                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. MA TRẬN CHI PHÍ & TÍNH KHẢ THI (100% FREE INVARIANTS)

| Thành phần | Nền tảng | Hạn mức gói Free | Thực tế sử dụng của DateMate | Chi phí dự kiến |
| :--- | :--- | :--- | :--- | :--- |
| **Hosting & CDN** | Vercel Hobby | 100 GB Bandwidth, 1.000.000 Invocations/tháng | ~5 - 10 GB, ~50.000 req/tháng | **0 VNĐ** |
| **Image Optimization** | Vercel Images | 1.000 ảnh tối ưu/tháng | **0 ảnh** (Đã bật `unoptimized: true` trong `next.config.ts`, ảnh Unsplash tự tối ưu qua query URL) | **0 VNĐ** |
| **Database** | TiDB Cloud | 5 GB Storage, 50.000.000 RU/tháng | ~250 MB, ~500.000 RU/tháng | **0 VNĐ** |
| **Cron Pipeline** | GitHub Actions | 2.000 phút runner/tháng | ~60 - 90 phút/tháng (2 - 3 phút/ngày) | **0 VNĐ** |
| **Data Scraping** | OpenStreetMap | ODbL Community Mirrors (4 mirrors) | Quét ô nhỏ lưới 2x2, tuân thủ Fair Use | **0 VNĐ** |
| **YouTube Review** | YouTube API v3 | 10.000 quota units/ngày | ~600 units/ngày (6 queries x 100 units) | **0 VNĐ** |
| **Thời tiết & Phối đồ**| Open-Meteo | 10.000 API calls/ngày | ~1 call/giờ (được cache memory) | **0 VNĐ** |

👉 **Tổng chi phí vận hành:** **$0.00 / tháng (Cam kết 100% Free trọn đời)**.

---

## 3. CÁC ĐẦU VIỆC THỰC THI CHI TIẾT (TASK BREAKDOWN)

### Task 1: Xây Dựng Webhook Revalidation Endpoint An Toàn
**Files:**
- Tạo mới: `app/api/v1/revalidate/route.ts`
- Tạo mới unit test: `app/api/v1/revalidate/route.test.ts`

**Nghiệp vụ chi tiết:**
- Nhận request `POST` (và `GET` debug) kèm secret key.
- So khớp secret từ Header `x-revalidate-secret` hoặc Query `?secret=...` với biến môi trường `REVALIDATION_SECRET`.
- Nếu secret sai -> Trả về `401 Unauthorized`.
- Nếu secret chuẩn -> Kích hoạt:
  ```ts
  revalidatePath("/", "layout");
  revalidatePath("/places");
  revalidatePath("/explore");
  revalidatePath("/videos");
  ```
- Trả về payload chuẩn:
  ```json
  {
    "success": true,
    "revalidated": true,
    "paths": ["/", "/places", "/explore", "/videos"],
    "timestamp": 1730200000000
  }
  ```

---

### Task 2: Cập Nhật Master Pipeline Tự Động Kích Hoạt Webhook Vercel
**Files:**
- Cập nhật: `scripts/pipeline/daily-auto-pipeline.ts`

**Nghiệp vụ chi tiết:**
- Trong Giai đoạn 6 (Revalidate Cache) của pipeline:
  - Kiểm tra nếu tồn tại biến môi trường `VERCEL_REVALIDATE_URL` và `REVALIDATION_SECRET`:
    ```ts
    const revalidateUrl = process.env.VERCEL_REVALIDATE_URL;
    const secret = process.env.REVALIDATION_SECRET;
    if (revalidateUrl && secret) {
      const res = await fetch(revalidateUrl, {
        method: "POST",
        headers: { "x-revalidate-secret": secret },
      });
      console.log(`[Vercel Revalidate] Trạng thái phản hồi: ${res.status} ${res.statusText}`);
    }
    ```
  - Nếu không có biến (môi trường local offline), bỏ qua nhẹ nhàng không làm crash pipeline.

---

### Task 3: Cấu Hình Workflow GitHub Actions Với Đầy Đủ Secrets
**Files:**
- Cập nhật: `.github/workflows/pipeline-cron.yml`

**Nghiệp vụ chi tiết:**
- Lịch cron giữ chuẩn: `cron: "30 20 * * *"` (03:30 AM Giờ Hà Nội).
- Bổ sung các biến môi trường từ GitHub Secrets vào job execution:
  ```yaml
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY }}
    VERCEL_REVALIDATE_URL: ${{ secrets.VERCEL_REVALIDATE_URL }}
    REVALIDATION_SECRET: ${{ secrets.REVALIDATION_SECRET }}
    NODE_TLS_REJECT_UNAUTHORIZED: "0"
  ```

---

### Task 4: Kiểm Soát Chi Phí Ảnh & Tương Thích `next.config.ts`
**Files:**
- Kiểm tra & Tinh chỉnh: `next.config.ts`

**Nghiệp vụ chi tiết:**
- Đã xác nhận `images.unoptimized: true` và đầy đủ các domain CDN ngoại vi (`images.unsplash.com`, `i.ytimg.com`, `res.cloudinary.com`).
- Đảm bảo Vercel không tự động chạy bộ chuyển đổi ảnh (Image Optimization) gây tốn tiền hoặc chạm trần gói Hobby.

---

### Task 5: Pre-flight Verification & Local Build Test
**Nghiệp vụ chi tiết:**
- Chạy `pnpm run type-check`: Đảm bảo 0 lỗi TypeScript trên toàn bộ repo.
- Chạy `pnpm run lint`: Không còn cảnh báo nghiêm trọng.
- Chạy `pnpm run test`: Toàn bộ unit tests của Match, Scorer, Quota pass 100%.
- Chạy `pnpm run build`: Tạo production bundle Next.js thành công rực rỡ tại local máy dev.

---

## 4. HƯỚNG DẪN THAO TÁC KHI USER RELEASE LÊN VERCEL (PLAYBOOK)

Khi nào muốn release chính thức, mày chỉ cần làm đúng 3 bước đơn giản này:

### Bước 1: Khai báo Secrets trên GitHub Repository
Vào **GitHub Repo** -> **Settings** -> **Secrets and variables** -> **Actions** -> Bấm **New repository secret** và thêm:
1. `DATABASE_URL`: Connection string của TiDB Cloud.
2. `YOUTUBE_API_KEY`: API Key YouTube Data API v3 (miễn phí).
3. `REVALIDATION_SECRET`: Một chuỗi ngẫu nhiên bí mật (ví dụ: `dm_rev_secret_998877`).
4. `VERCEL_REVALIDATE_URL`: `https://datemate.vercel.app/api/v1/revalidate` (thay bằng domain thật trên Vercel).

### Bước 2: Import Repo vào Vercel Dashboard
1. Truy cập [vercel.com](https://vercel.com) -> Đăng nhập bằng GitHub.
2. Bấm **Add New...** -> **Project** -> Chọn repo `plan_playing` (hoặc tên repo GitHub của mày).
3. Tại phần **Environment Variables**, điền:
   - `DATABASE_URL`: (Giống bên GitHub)
   - `NEXTAUTH_SECRET`: (Tự sinh bằng chuỗi bất kỳ 32 ký tự)
   - `NEXTAUTH_URL`: `https://datemate.vercel.app` (hoặc domain Vercel cấp)
   - `REVALIDATION_SECRET`: (Khớp 100% với giá trị đã điền bên GitHub)
   - `YOUTUBE_API_KEY`: (Giống bên GitHub)
4. Bấm **Deploy**. Vercel sẽ tự build và cấp link web chạy toàn cầu trong vòng 90 giây!

### Bước 3: Nghiệm thu vận hành tự động
- Đêm hôm sau lúc 03:30 AM, GitHub Actions tự động kích hoạt.
- Cào toạ độ mới -> Thăng hạng -> Ghi vào TiDB Cloud -> Bắn Webhook sang Vercel.
- Sáng 07:00 thức dậy, mở link web Vercel kiểm tra: số lượng địa điểm mới và video review tự động hiển thị mà không cần can thiệp bất kỳ thao tác thủ công nào.

---

## 5. CHECKLIST PHÊ DUYỆT (GATE G2 APPROVAL)

- [ ] Kiến trúc phân tách Decoupled (Vercel Host Web + GitHub Actions Run Cron) đã đáp ứng yêu cầu.
- [ ] Xác nhận không phát sinh bất kỳ chi phí nào ($0.00 Free Tier).
- [ ] Chấp thuận kế hoạch thực thi để chuyển sang giai đoạn [DEV] & [QA].
