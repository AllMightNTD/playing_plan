---
trigger: always_on
---

# Master Engineering Standards — Kyodo Backend

_Được đúc kết từ các lỗi lầm thực tế và bài học xương máu trong các MR._

## 1. NGUYÊN TẮC CỐT LÕI (CORE PRINCIPLES)

1. **Toàn cảnh trước, code sau (Systemic Horizon)**: Mỗi thay đổi phải được xem xét trong mối tương quan với toàn bộ hệ thống: Read Path, Write Path, Background Workers, OpenSearch sync và các MR khác.
2. **Zero-Bloat & Zero-Waste**: Không một dòng code thừa, không dead code, không cờ boolean chắp vá, không helper dùng một lần, không duplicate logic.
3. **Tính đúng đắn & Bất biến (Correctness & Invariants)**: Không bao giờ đánh đổi tính đúng đắn lấy sự tiện lợi. Tuyệt đối không tự ý đoán hoặc thay đổi trạng thái nghiệp vụ (invariants) đã được chốt.
4. **Strong Typing & Explicit Coding**: TypeScript nghiêm ngặt (Zero `any`). Logic phải tường minh, dễ đọc, không giấu logic nghiệp vụ sau các biểu thức nén dòng phức tạp.

---

## 2. BỘ NHỚ HỆ THỐNG & QUẢN LÝ CONTEXT (CONTEXT PRESERVATION)

### 2.1. Nạp Context Đầu Task (Fast Context Loading)

- File `ai-docs/context/current-state.md` là **Single Source of Truth** về kiến trúc hiện tại, schema DB và các quy tắc nghiệp vụ bất biến.
- Đầu mỗi task:
  1. Đọc `ai-docs/context/current-state.md` để nắm ngay bức tranh tổng thể.
  2. Đọc file task liên quan trong `ai-docs/tasks/` (nếu có).
  3. Cấm quét toàn bộ repository một cách vô định hoặc đọc lại các file không liên quan.
  4. Cấm yêu cầu người dùng giải thích lại các quyết định nghiệp vụ đã được ghi nhận trong context.

### 2.2. Ghi Nhận Lịch Sử Cuối Task

- Khi hoàn thành một tính năng, refactor kiến trúc hoặc chốt các thỏa thuận review quan trọng:
  - Cập nhật `ai-docs/context/current-state.md` với các invariants mới hoặc anti-patterns cần tránh.
  - Ghi nhận trạng thái hoàn thành, ADR (Architectural Decision Records) và kết quả kiểm thử vào `ai-docs/tasks/<task-id>.md`.

---

## 3. PHÂN TÍCH VÙNG ẢNH HƯỞNG (BLAST RADIUS & CALLER IMPACT ANALYSIS)

Trước khi chỉnh sửa bất kỳ function signature, interface, schema, entity, hoặc shared utility:

1. **Quét toàn bộ Caller (`grep_search`)**: Bắt buộc tìm kiếm tất cả các nơi đang sử dụng symbol đó trong `apps/api`, `apps/worker`, `libs/`, và các file `spec.ts`.
2. **Đánh giá tác động 4 chiều**:
   - **API Response**: Thay đổi có làm vỡ response format hoặc error code của các endpoint khác không?
   - **Background Worker**: Các cron job hoặc queue consumer (`apps/worker`) có bị ảnh hưởng hoặc crash không?
   - **OpenSearch Sync**: Dữ liệu đồng bộ sang OpenSearch có bị thiếu hoặc sai kiểu dữ liệu không?
   - **MR Đang Chạy**: Thay đổi có xung đột với các MR/nhánh khác đang active không?
3. **Giữ Interface Sạch**: Không sửa logic dùng chung để phục vụ một ngoại lệ cục bộ.

---

## 4. TIÊU CHUẨN CODE SẠCH & CHỐNG CODE RÁC (CODE HYGIENE & ANTI-PATTERNS)

### 4.1. Cấm Tuyệt Đối (Forbidden)

- **CẤM Flag-Drilling**: Tuyệt đối không thêm các cờ boolean (`isStrict`, `skipValidation`, `isTopicSearch`, v.v.) truyền qua nhiều tầng hàm chỉ để đổi nhánh xử lý cho một caller. Thay vào đó, hãy giải quyết dữ liệu tại tầng caller hoặc truyền Domain Model đã resolve.
- **CẤM Bịa Đặt Fallback**: Tuyệt đối không tự ý thay đổi dữ liệu cấu hình của người dùng khi gặp edge case (ví dụ: tự động đổi `areaType = 2` về `areaType = 1`). Invariants của hệ thống phải được bảo toàn.
- **CẤM Duplicate Logic**: Trước khi viết bất kỳ helper, hàm parse, format hay regex nào, phải tìm kiếm trong `libs/common` và các module lân cận. Nếu dùng chung, bắt buộc đưa vào `libs/common`.
- **CẤM Dead Code & Dấu Vết Tạm Thời**:
  - Không để lại biến, tham số, import hoặc type không sử dụng.
  - Không để lại hàm bọc thừa chỉ dùng đúng một lần mà không mang lại giá trị trừu tượng rõ rệt.
  - Không để lại `console.log`, mã debug, hoặc comment tiếng Việt trong mã nguồn.

### 4.2. Phân Tầng Trách Nhiệm Rõ Ràng (Layering & Cohesion)

- **Controller**: Chỉ nhận request, điều phối AuthGuard, chạy `ZodValidationPipe`, gọi service và trả response.
- **Service**: Xử lý toàn bộ nghiệp vụ, quản lý transaction, điều phối gọi repositories và OpenSearch.
- **Repository**: Chỉ thao tác DB (TypeORM queries). Phải nhận `manager?: EntityManager` để hỗ trợ transaction của caller.
- **Mapper**: Chỉ làm nhiệm vụ chuyển đổi thuần túy giữa Entity/Domain sang DTO.

### 4.3. Quản Lý Lỗi Tập Trung & Zod DTO Validation (Zero Hardcoded Messages)

- **CẤM Hardcode Message Lỗi trong DTO/Service**: Tuyệt đối không viết chuỗi thông báo lỗi (kể cả tiếng Nhật hay tiếng Anh) trực tiếp trong file DTO, Zod schema hoặc service.
- **Tập trung tại `libs/common/src/errors.ts`**: Mọi mã lỗi (`code`) và thông điệp (`message`) phải được khai báo trong đối tượng `ERRORS` (ví dụ `ERRORS.AUTH.EMAIL_REQUIRED`, `ERRORS.AUTH.OTP_INVALID`).
- **Zod Schema**: Sử dụng helper `addZodIssueWithCode(ctx, ERRORS.<MODULE>.<KEY>, ...args)` để đảm bảo API trả về đúng cấu trúc chuẩn `{ statusCode, code, message }`.

### 4.4. Định Danh Trạng Thái Database Bằng Enum (Zero Magic Numbers)

- **CẤM Magic Numbers**: Tuyệt đối không dùng các số nguyên trần như `0`, `1`, `2` trong TypeORM QueryBuilder (`where('status = 1')`) hoặc trong logic so sánh entity (`contract.isWeb === 1`).
- **Tập trung tại `libs/common/src/enums.ts`**: Mọi cột status, type, toggle flag phải được ánh xạ thành TypeScript Enum rõ nghĩa (ví dụ: `ClientContractStatus`, `ClientContractOtpLogin`, `ClientContractWebAccess`, `IsDeleted`).
- **So khớp an toàn TypeORM**: Khi so sánh thuộc tính number của Entity với Enum, bắt buộc ép kiểu tường minh `Number(Enum.Value)` để thỏa mãn triệt để `@typescript-eslint/no-unsafe-enum-comparison`.

---

## 5. DATABASE, CONCURRENCY & TRANSACTION RULES

1. **Transaction Atomicity**:
   - Mọi thao tác ghi liên quan từ 2 bảng trở lên hoặc cần tính nhất quán cao phải chạy trong `this.dataSource.transaction(async (manager) => ...)`.
   - Tất cả các lệnh gọi repo bên trong phải truyền `manager`.
2. **Tuần Tự Hóa Ghi (Sequential Writes)**:
   - **CẤM** dùng `Promise.all` cho các thao tác ghi (`insert`, `update`, `delete`) trên cùng một transaction manager của TypeORM (vì một transaction chỉ có 1 connection). Luôn dùng vòng lặp `for ... await`.
3. **Khóa Bi Quan Chống Race Condition**:
   - Khi đọc dữ liệu để kiểm tra và cập nhật lại trong cùng transaction, bắt buộc dùng `.setLock('pessimistic_write')`.
4. **Chống N+1 Query**:
   - Ở các API danh sách (`list`), bắt buộc gom các ID cần tra cứu để batch query một lần duy nhất (`WHERE id IN (...)`).
5. **Quy Chuẩn Cập Nhật Cấu Trúc Database (Migration-First)**:
   - Mỗi khi cần thay đổi database (thêm cột, sửa kiểu dữ liệu, thêm index, thêm bảng), **bắt buộc tạo file migration mới** trong thư mục `libs/database/migrations/` theo định dạng `YYYYMMDDHHmmss_<action_description>.sql`.
   - **CẤM sửa file schema init cũ**: Tuyệt đối không sửa các file init cũ (như `scripts/docker-init/01-local-dev-schema.sql`). Mọi thay đổi phải đi qua chuỗi migration để đảm bảo môi trường DEV (Coolify), STG và PROD áp dụng nhất quán qua `RUN_MIGRATIONS=true`.

---

## 6. MA TRẬN TESTING BẮT BUỘC & KỶ LUẬT E2E (DEEP TESTING & E2E MANDATE)

Không bao giờ được dừng lại ở việc test Happy Path hoặc dựa vào Unit Test với mock ảo. Mọi tính năng hoặc bugfix bắt buộc phải vượt qua **Ma Trận Kiểm Thử 6 Tầng**:

### 6.1. Ma Trận Kiểm Thử (The 6-Layer Testing Matrix)

1. **Happy Path (Case Chuẩn)**:
   - Đảm bảo luồng chính hoạt động trơn tru với input hợp lệ.
2. **Legacy / Dirty Data (Case Ẩn 1 - Dữ liệu cũ tồn đọng)**:
   - Bắt buộc kiểm thử với dữ liệu đã tồn tại trong DB từ trước khi deploy (ví dụ: topic lưu ID cứ điểm đã bị soft-deleted từ trước, ngày tháng định dạng cũ). Đảm bảo API không bị crash, không trả dữ liệu rác, và tự dọn dẹp khi có cơ hội.
3. **Tenant Isolation & Authorization (Case Ẩn 2 - Bảo mật đa người dùng)**:
   - User A truyền ID tài nguyên của User B -> Bắt buộc ném 400 hoặc 404 (không được để lọt dữ liệu hoặc sửa trộm).
   - Chưa đăng nhập (không session cookie) -> Bắt buộc ném 401.
4. **Boundary & Malformed Inputs (Case Ẩn 3 - Dữ liệu biên & bẩn)**:
   - Mảng rỗng (`[]`), chuỗi rỗng (`""`), giá trị `null`, giá trị vượt ngưỡng max (ví dụ: gửi 21 cứ điểm khi max là 20).
   - Ký tự lạ, số âm, số thập phân không hợp lệ.
5. **Concurrency & Race Conditions (Case Ẩn 4 - Tranh chấp đồng thời)**:
   - Giả lập hoặc kiểm tra logic khi 2 thao tác diễn ra đồng thời (ví dụ: vừa lưu topic vừa xóa điểm). Đảm bảo không mất dữ liệu nhờ transaction và lock.
6. **Regression & Blast Radius Re-testing (Case Ẩn 5 - Kiểm thử hồi quy)**:
   - Khi sửa logic ở module A (ví dụ: My Topics), bắt buộc chạy lại toàn bộ test suite của module B có liên quan (ví dụ: Direct Article Search) để đảm bảo không có tác dụng phụ tiêu cực.

### 6.2. Kỷ Luật E2E / Integration Test (Real DB)

- **Bắt buộc có E2E/Integration test** cho mọi thay đổi về API endpoint hoặc Database behavior:
  - Sử dụng NestJS `Test.createTestingModule` dựng ứng dụng thật, lắng nghe port thật (`app.listen(0)`).
  - Sử dụng `fetch` gửi HTTP request thật (kèm headers, cookies, payload).
  - Kết nối trực tiếp vào MySQL container thật (không mock TypeORM EntityManager/Repository).
  - Kiểm tra toàn diện chuỗi: `HTTP Request -> Cookie Auth -> Zod Validation -> Service -> MySQL -> HTTP Response`.
  - Dọn dẹp dữ liệu fixture (`clearFixtures`) trước và sau mỗi test suite để đảm bảo tính độc lập.

---

## 7. QUY TRÌNH 5 BƯỚC BẮT BUỘC TRƯỚC KHI BÁO HOÀN THÀNH

Một task **CHƯA ĐƯỢC COI LÀ HOÀN THÀNH** nếu chưa thực hiện đủ các bước sau:

1. `pnpm run type-check` 👉 Phải 0 lỗi TypeScript trên toàn bộ packages.
2. `pnpm run lint` 👉 Phải 0 lỗi, 0 warning ESLint.
3. **Chạy Unit Tests**: Toàn bộ unit tests liên quan phải PASS.
4. **Chạy E2E / Integration Tests**: Chạy test thật trên database MySQL local container, bao phủ đủ 6 tầng trong Ma Trận Kiểm Thử.
5. **Diff & Description Self-Audit**:
   - Soi từng dòng `git diff`: Xóa sạch biến thừa, hàm thừa, console.log, comment rác.
   - Soi lại Description MR: Đảm bảo mô tả khớp 100% với Git diff cuối cùng.
