---
trigger: always_on
---

# Quy tắc code toàn project

> Áp dụng cho mọi module. Rule riêng của module (nếu có) chỉ được bổ sung, không được mâu thuẫn với file này.

## 1. Nguyên tắc cốt lõi

- Mỗi function chỉ làm MỘT việc ở MỘT mức trừu tượng. Nếu mô tả function phải dùng chữ "và" thì tách.
- Function use-case (public/service) là **orchestrator**: đọc như một kịch bản các bước, không chứa chi tiết điều kiện nghiệp vụ.
- Tách theo **nghiệp vụ**, không tách theo số dòng. Tên hàm nói lên ý định (`assertOrderCancellable`), không nói cách làm (`checkStuff`, `handleData`).
- Ưu tiên code đơn giản, dễ đọc hơn code "thông minh". Không tối ưu sớm khi chưa có lý do đo được.

## 2. Phân tầng (layer)

| Tầng                 | Trách nhiệm                                             | KHÔNG được làm                       |
| -------------------- | ------------------------------------------------------- | ------------------------------------ |
| Controller / Handler | Nhận request, validate input, gọi service, trả response | Chứa logic nghiệp vụ, gọi thẳng DB   |
| Service / Use-case   | Điều phối nghiệp vụ, quản lý transaction                | Xử lý HTTP/transport, viết query thô |
| Domain / Policy      | Rule nghiệp vụ thuần (guard, tính toán)                 | Gọi I/O, DB, network                 |
| Repository / Gateway | Truy cập DB, API ngoài, cache                           | Chứa rule nghiệp vụ                  |
| Mapper / DTO         | Chuyển đổi dữ liệu giữa các tầng                        | Có side-effect                       |

- Phụ thuộc chỉ đi một chiều: Controller → Service → Domain/Repository. Không import ngược.
- Không trả entity DB thẳng ra ngoài API; luôn qua mapper/DTO.

## 3. Ngưỡng bắt buộc phải tách

- Function > 30–40 dòng logic, hoặc > 3 cấp lồng (if/try/callback).
- Có > 1 lý do để thay đổi (đổi rule nghiệp vụ, đổi cách lưu, đổi format log...).
- Khối ≥ 3 dòng xuất hiện ≥ 2 lần (kể cả khác nhau nhẹ) → trích hàm dùng chung, khác biệt truyền qua tham số/options.
- Callback truyền vào transaction/lock/retry dài > 15 dòng → đặt tên, trích thành method riêng.
- > 4 tham số → gom thành object có kiểu rõ ràng.
- File > 400 dòng hoặc class có > 7–8 dependency → xem xét tách module/service.

## 4. Phân loại hàm khi tách

| Loại            | Đặc điểm                                                                    |
| --------------- | --------------------------------------------------------------------------- |
| Orchestrator    | Gọi các bước theo thứ tự, không có `if` nghiệp vụ chi tiết                  |
| Guard / Policy  | Pure, validate rồi throw (`assertXxx`) hoặc trả boolean (`isXxx`, `canXxx`) |
| Mapper          | Pure, chỉ chuyển đổi dữ liệu (`toXxx`)                                      |
| Step / Strategy | Một nhánh nghiệp vụ hoàn chỉnh                                              |
| Side-effect     | I/O, log, gửi mail, ghi cache, gọi API ngoài                                |

- Guard và mapper phải pure để test không cần mock.
- Side-effect đẩy ra rìa (đầu/cuối orchestrator), không trộn trong guard.

## 5. Chống lặp

- Một rule nghiệp vụ chỉ nằm ở MỘT nơi duy nhất.
- Các nhánh chỉ khác vài điều kiện → một hàm + options, không copy-paste.
- Magic value (`=== 1`, `!== 0`, `'ACTIVE'`, số cứng) → hằng số/enum hoặc helper có tên (`isActive(entity)`).
- Chỉ tạo abstraction khi có ≥ 2 nơi dùng, hoặc làm hàm gốc rõ nghĩa hơn rõ rệt. Không tạo class/interface/factory thừa.

## 6. Đặt tên

- Hàm: động từ + đối tượng (`createInvoice`, `assertStockAvailable`). Boolean: `is/has/can/should`.
- Không viết tắt khó hiểu; không đặt tên chung chung (`data`, `info`, `result`, `temp`, `util`).
- File/class theo một quy ước nhất quán trong toàn project (kebab-case file, PascalCase class...). Theo quy ước đang có, không tự đổi.

## 7. Transaction, lock, hiệu năng

- Transaction/lock **ngắn nhất có thể**: chỉ đọc-validate-ghi trong lock; I/O ngoài (cache, queue, mail, log, API ngoài) làm ngoài lock.
- Không query lặp cùng dữ liệu trong một luồng; truyền entity đã load xuống các bước sau.
- Tránh N+1: dùng batch/join/`IN` thay vì query trong vòng lặp.
- Việc độc lập chạy song song (`Promise.all`), việc phụ thuộc chạy tuần tự.
- Mọi bước tạo tài nguyên (session, file, lock, bản ghi tạm) phải có đường **compensation/cleanup** khi bước sau lỗi.
- Thao tác có thể bị gọi lặp (retry, double-submit) phải **idempotent** hoặc có cơ chế chống trùng.
- Danh sách trả ra ngoài phải có phân trang/giới hạn.

## 8. Xử lý lỗi

- Dùng hệ thống error code/exception chung của project; không `throw new Error('chuỗi tự do')`.
- Không nuốt lỗi (`catch {}` rỗng). Nếu chủ đích bỏ qua (ví dụ cleanup), phải ghi rõ lý do bằng comment.
- Throw sớm (guard clause/early return), tránh `else` lồng nhau.
- Phân biệt lỗi nghiệp vụ (4xx, có mã lỗi) và lỗi hệ thống (5xx, log đầy đủ).

## 9. Bảo mật & dữ liệu nhạy cảm

- Validate mọi input ở biên (controller/DTO), không tin dữ liệu client.
- Không log mật khẩu, token, OTP, secret; mask PII (email, SĐT, số thẻ) khi log.
- Message lỗi trả ra ngoài không được lộ thông tin nội bộ (stack trace, tên bảng, việc tài khoản có tồn tại hay không).
- Truy vấn luôn dùng parameter/ORM, không nối chuỗi SQL.
- Kiểm tra quyền (authorization) ở tầng service, không chỉ dựa vào UI/controller.

## 10. Log

- Log có cấu trúc (object: `event`, id liên quan, thời gian), không nối chuỗi tự do.
- Log sự kiện nghiệp vụ quan trọng và lỗi; không log trong vòng lặp nóng.
- Đúng mức: `debug` (chi tiết dev), `info` (sự kiện nghiệp vụ), `warn` (bất thường nhưng xử lý được), `error` (cần can thiệp).

## 11. Giữ nguyên hành vi khi refactor (QUAN TRỌNG)

- Không đổi: error code, HTTP status, thứ tự check, thứ tự side-effect, nội dung log, format response.
- Thứ tự check ảnh hưởng thông báo lỗi trả về → giữ đúng thứ tự cũ.
- Hai khối "tưởng giống nhau" nhưng có khác biệt nhỏ → KHÔNG gộp ngầm. Xử lý bằng option/tham số và ghi chú rõ.
- Nghi ngờ bug → báo lại, KHÔNG tự sửa trong cùng thay đổi refactor.
- Không đổi public API/signature nếu chưa được yêu cầu; nếu buộc phải đổi, liệt kê nơi bị ảnh hưởng.
- Không refactor ngoài phạm vi được yêu cầu.

## 12. Test

- Guard/policy/mapper (pure): unit test trực tiếp, không mock.
- Orchestrator: test nhánh chính, từng nhánh lỗi, và đường cleanup/compensation.
- Sửa bug → thêm test tái hiện bug trước khi sửa.
- Test đặt tên theo hành vi (`should reject when contract expired`), mỗi test một ý.

## 13. Quy trình khi được yêu cầu viết/sửa code

1. Đọc code liên quan và quy ước hiện có của module trước khi viết.
2. Nêu ngắn gọn: các trách nhiệm hiện tại, chỗ lặp, rủi ro.
3. Đề xuất cấu trúc tách (tên hàm + loại hàm), rồi mới viết code.
4. Thay đổi từng bước nhỏ, mỗi bước giữ hành vi không đổi.
5. Chạy lint, type-check và test liên quan trước khi báo hoàn thành.
6. Khi không chắc về nghiệp vụ → hỏi lại, không tự đoán.

## 14. Checklist trước khi kết thúc

- [ ] Orchestrator đọc như kịch bản (~≤ 25 dòng)
- [ ] Không còn khối lặp; không còn magic value
- [ ] Mỗi hàm một trách nhiệm, tên rõ nghĩa, đúng tầng
- [ ] Error code/status/thứ tự check/log không đổi (trừ khi được yêu cầu)
- [ ] I/O ngoài nằm ngoài lock; có cleanup khi lỗi
- [ ] Không log hoặc lộ dữ liệu nhạy cảm
- [ ] Lint, type-check, test đều pass
- [ ] Phản hồi nêu rõ: đã tách gì, giữ nguyên gì, nghi ngờ gì
