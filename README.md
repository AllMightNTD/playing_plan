# DateMate 💖 — Web App Lên Lịch Đi Chơi Cho Cặp Đôi

> **DateMate** là ứng dụng web thông minh giúp các cặp đôi giải quyết triệt để bài toán *"Hôm nay ăn gì / đi đâu chơi?"*, lập kế hoạch hẹn hò hoàn chỉnh chỉ trong vài phút mà không cần tạo tài khoản rườm rà.

---

## 🌟 Điểm nổi bật & Tính năng chính

### 1. 👫 Phòng đôi ẩn danh — Vào là dùng ngay (Zero-Friction)
- **Không cần đăng ký**: Không thu số điện thoại, email hay mật khẩu.
- **Ghép phòng 1-chạm**: Người thứ nhất mở app tự tạo phòng, chia sẻ **Link bí mật**, **Mã 8 ký tự** hoặc **Mã QR** cho người thương.
- **Cơ chế Atomic Join**: Đảm bảo tối đa 2 thành viên/phòng, chống tranh chấp phiên trên môi trường serverless.
- **Chống mất dữ liệu (Silent Recovery)**: Lưu khóa phục hồi ngầm tại `localStorage`, tự động khôi phục nếu cookie phiên bị trình duyệt dọn dẹp.

### 2. 🔥 Quẹt thẻ chọn địa điểm (Swipe Match)
- Giao diện quẹt thẻ cảm ứng mượt mà phong cách Tinder (trái = Bỏ qua, phải = Thích).
- Khi cả hai cùng quẹt "Thích" một địa điểm ➔ **It's a Match!** Tự động gợi ý thêm vào kế hoạch hẹn hò.

### 3. 🎡 Vòng quay may mắn (Lucky Wheel)
- Cứu cánh những lúc "Ăn gì cũng được" hay "Đi đâu tùy anh/em".
- Quay ngẫu nhiên trong danh sách địa điểm đã lưu hoặc bộ sưu tập được gợi ý.

### 4. 🧭 Wizard gợi ý lịch trình thông minh & SunCalc
- Gợi ý lộ trình theo tâm trạng (lãng mạn, chill, năng động, ăn uống...), thời gian và ngân sách.
- Tích hợp **SunCalc**: Tự động tính toán giờ hoàng hôn và "khung giờ vàng" (Golden Hour) chính xác theo tọa độ địa điểm để có trải nghiệm ngắm cảnh đẹp nhất.

### 5. 📅 Lập kế hoạch & Đồng bộ lịch (.ics)
- Sắp xếp timeline các chặng dừng trong buổi hẹn (Ăn uống ➔ Cà phê ➔ Check-in ngắm hoàng hôn).
- **Checklist đồ dùng cần mang**: Phân chia nhiệm vụ rõ ràng (ai mang sạc dự phòng, ai mang áo khoác...).
- **Xuất lịch `.ics`**: Nhập thẳng vào Apple Calendar hoặc Google Calendar, tự động nhắc nhở trước 2 giờ trên điện thoại mà không lo bị chặn thông báo.

### 6. 📖 Cẩm nang địa điểm chi tiết
- Hình ảnh chất lượng cao (tích hợp Unsplash / Wikimedia), video review trực quan.
- Cẩm nang thực chiến: Giờ nên đi, chi phí ước tính, trang phục gợi ý, bãi gửi xe, góc chụp ảnh đẹp.

### 7. 🛠️ CMS Quản trị & AI Extractor (Google Gemini)
- Trang quản trị dành cho Admin kiểm duyệt địa điểm, cập nhật hình ảnh và quản lý nội dung.
- **AI Trích xuất tự động**: Nhập link review TikTok / YouTube ➔ Google Gemini tự động phân tích và điền sẵn thông tin địa điểm có cấu trúc.

---

## 🏗️ Kiến trúc & Công nghệ (Tech Stack)

| Thành phần | Công nghệ sử dụng |
| --- | --- |
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router), [React 19](https://react.dev/) |
| **Ngôn ngữ** | TypeScript (Strict mode, Zero `any`) |
| **Styling & Animation** | [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [Lucide React](https://lucide.dev/) |
| **Database & ORM** | [TiDB Cloud Serverless](https://www.pingcap.com/tidb-cloud/) (MySQL Compatible), [Drizzle ORM](https://orm.drizzle.team/) |
| **Validation** | [Zod](https://zod.dev/) |
| **State & Query** | React Context API, [TanStack React Query v5](https://tanstack.com/query/latest) |
| **Authentication** | [NextAuth.js](https://next-auth.js.org/) (cho Admin CMS), Cookie Session bảo mật `__Host-dm_s` (cho cặp đôi) |
| **AI Integration** | [Google Gemini Flash](https://ai.google.dev/) (`@google/genai`) |
| **Testing** | [Vitest](https://vitest.dev/) (Unit & Integration tests) |

---

## 📁 Cấu trúc thư mục

```text
├── app/
│   ├── (user)/             # Giao diện người dùng Mobile-first (Explore, Match, Plans, Memories)
│   ├── admin/              # Giao diện CMS Quản trị viên (Desktop-first)
│   ├── api/v1/user/        # REST APIs phục vụ luồng người dùng
│   ├── api/v1/admin/       # REST APIs bảo vệ cho quản trị viên
│   └── api/auth/           # Endpoint NextAuth xác thực Admin
├── components/
│   └── user/               # UI components người dùng (PlaceCard, Modals, Nav,...)
├── context/                # Global React Contexts (AppContext, Session, Room state)
├── drizzle/                # SQL Migrations và schema snapshots
├── lib/                    # Helpers, thuật toán tính điểm, SunCalc, Calendar .ics
├── public/                 # Static assets, icons, manifest PWA
├── scripts/                # Tooling: Migration, media fetcher, DB check & publish
├── server/
│   ├── auth/               # Logic quản lý phiên ẩn danh & xác thực Admin
│   ├── db/                 # Kết nối Drizzle, schema definitions & queries
│   └── services/           # Nghiệp vụ phân tầng (User & Admin services, policies, mappers)
└── ...
```

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy (Local Development)

### 1. Yêu cầu môi trường
- **Node.js**: `>= 20.0.0`
- **Package Manager**: [pnpm](https://pnpm.io/) (`>= 9.x`)

### 2. Cài đặt Dependencies
```bash
git clone https://github.com/AllMightNTD/playing_plan.git
cd playing_plan
pnpm install
```

### 3. Cấu hình Biến môi trường
Sao chép file mẫu và điền các thông số kết nối:
```bash
cp .env.example .env
```
Các thông số tối thiểu để chạy app:
- `DATABASE_URL`: Connection string TiDB Cloud Serverless hoặc MySQL local.
- `AUTH_SECRET`: Chuỗi ký tự ngẫu nhiên bảo mật phiên Admin.
- `GEMINI_API_KEY`: API Key lấy miễn phí tại [Google AI Studio](https://aistudio.google.com/).

### 4. Khởi tạo Database & Dữ liệu mẫu
```bash
# Đẩy schema lên database
pnpm db:push

# Chạy migration đồng bộ schema
pnpm db:migrate

# Xuất bản dữ liệu địa điểm mẫu
pnpm db:publish
```

### 5. Khởi chạy Server Phát triển
```bash
pnpm dev
```
Mở trình duyệt truy cập:
- Giao diện người dùng: [http://localhost:3000](http://localhost:3000)
- Trang quản trị: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 🧪 Kiểm thử & Đảm bảo chất lượng

Dự án áp dụng tiêu chuẩn kiểm thử chặt chẽ trước mỗi thay đổi:

```bash
# Kiểm tra TypeScript compilation (0 lỗi)
pnpm run type-check

# Kiểm tra quy chuẩn mã nguồn (ESLint)
pnpm run lint

# Chạy toàn bộ Unit & Integration tests
pnpm test --run
```

---

## 🎨 Bảng màu nhận diện (Peach Blossom Theme)

- **Kem nền**: `#FFF7F3` — Nhẹ nhàng, ấm cúng.
- **Hồng đào nhạt**: `#FFE3DA` — Thẻ, chip, vùng nhấn nhẹ.
- **Hồng đào**: `#FF9E8D` — Biểu tượng, highlight, trạng thái chọn.
- **Hồng đào đậm**: `#C93F52` — Nút hành động chính (độ tương phản chuẩn WCAG).
- **Nâu ấm**: `#3B2A2A` — Nội dung văn bản dễ đọc, dịu mắt.
- **Xanh dịu**: `#7A9E87` — Trạng thái thành công, nhãn "nên đi".

---

## 📄 Giấy phép

Dự án được phát triển phục vụ mục đích học tập và xây dựng sản phẩm cá nhân. Mọi đóng góp (Pull Request, Issue) đều được hoan nghênh!
