# DateMate: ý tưởng sản phẩm và hướng mở rộng

*Bản 1.0, ngày 28/10/2026. Tài liệu tầm nhìn, đi kèm tài liệu “Plan & Spec”. Phần nào là giả định của mình được đánh dấu rõ để bạn chỉnh.*

## 1. Mình hiểu ý tưởng của bạn như thế nào

**Một câu:** DateMate là web app giúp cặp đôi **không bao giờ bí ý tưởng đi chơi**: chọn nhanh nơi phù hợp (giá, mood, thời tiết, ngày thường hay ngày lễ), biết **đi lúc nào cho đẹp, mặc gì, chụp thế nào**, xem ảnh và video thật của nơi đó, rồi xếp thành một buổi hẹn trọn vẹn và lưu thành kỷ niệm.

**Điều bạn thật sự muốn xây** không chỉ là một danh sách địa điểm. Mình thấy ba lớp giá trị chồng lên nhau:

| Lớp | Câu hỏi người dùng | Trạng thái |
| --- | --- | --- |
| 1. Gợi ý địa điểm | “Đi đâu hôm nay?” | Đang thiết kế (Plan & Spec) |
| 2. Lên kế hoạch buổi hẹn | “Đi lúc nào, mặc gì, đi chung với cái gì?” | Đang thiết kế |
| 3. Trải nghiệm tại địa điểm | “Đến đó ăn gì, uống gì, chơi gì, hết bao nhiêu, người khác thấy sao?” | **Hướng mở rộng của tài liệu này** |

**Giả định của mình (bạn sửa nếu sai):**

- Đối tượng chính là cặp đôi trẻ ở thành thị Việt Nam, dùng điện thoại là chính.
- Bắt đầu ở Hà Nội, sau đó mở sang thành phố khác.
- Không bắt đăng nhập; dữ liệu của người dùng gắn với “phòng đôi” ẩn danh.
- Dữ liệu đến từ nguồn hợp lệ (API chính thức, giấy phép mở, đối tác, cộng đồng), không cào TikTok.
- Mục tiêu giai đoạn đầu là hữu ích và đáng tin; kiếm tiền tính sau.

## 2. Vấn đề và người dùng

### 2.1 Nỗi đau thật của cặp đôi

- **Bí ý tưởng, đi lặp lại** mấy chỗ quen thuộc.
- **Tốn công tìm hiểu:** lướt TikTok, nhóm Facebook, hỏi bạn bè; thông tin rời rạc và nhanh cũ.
- **Sợ đi hụt:** đến nơi đóng cửa, quá đông, mưa, đắt hơn dự tính, không có chỗ chụp đẹp.
- **Ngại quyết định:** hai người đều bảo “sao cũng được”.
- **Ngân sách có hạn** nhưng muốn buổi hẹn có chất lượng.

### 2.2 Chân dung người dùng

| Tên gọi | Mô tả | Họ cần |
| --- | --- | --- |
| Cặp sinh viên | Ngân sách dưới 200k, đi xe máy, hẹn cuối tuần | Nơi rẻ, nhiều lựa chọn miễn phí, chụp ảnh đẹp |
| Cặp đi làm | Ít thời gian, ngân sách 300k-800k, hay hẹn tối ngày thường | Quyết nhanh, có chỗ đặt trước, ít xếp hàng |
| Cặp hẹn dịp đặc biệt | Valentine, kỷ niệm, sinh nhật | Nơi lãng mạn, có combo, đặt chỗ, gợi ý quà/hoa |
| Người “lo việc hẹn” | Một người trong cặp luôn là người lên kế hoạch | Công cụ giúp người kia cùng tham gia (Match) |

## 3. Giá trị cốt lõi và điểm khác biệt

1. **Quyết nhanh:** nút “Hôm nay đi đâu?”, 4 câu chạm, 3 gợi ý có lý do.
2. **Cẩm nang theo ngữ cảnh:** giờ đẹp tự tính theo ngày chọn, thời tiết, ngày thường hay ngày lễ.
3. **Hợp với hẹn hò, không chỉ “địa điểm nổi tiếng”:** tiêu chí như riêng tư, ồn ào, ánh sáng chụp ảnh, độ đông.
4. **Đáng tin và còn mới:** có nhãn xác minh, ngày cập nhật, tín hiệu độ “hot”, người dùng báo sai.
5. **Hai người cùng dùng:** phòng đôi, Match, kế hoạch chung, kỷ niệm chung.
6. **Nhẹ và tôn trọng quyền riêng tư:** không tài khoản, không thu email.

**Điều không phải điểm khác biệt:** có nhiều địa điểm hơn Google Maps. Lợi thế nằm ở **chọn lọc, bối cảnh hẹn hò và quyết định nhanh**.

## 4. Hành trình người dùng

| Giai đoạn | Việc họ làm | Tính năng |
| --- | --- | --- |
| Trước | Bí ý tưởng, tìm nơi, thống nhất với nhau | Wizard, quay số, Khám phá, Tìm kiếm, Match, bộ lọc ngày thường/ngày lễ |
| Chuẩn bị | Chốt giờ, mặc gì, mang gì, đặt chỗ | Kế hoạch nhiều điểm, giờ đẹp, thời tiết, trang phục, checklist, nhắc lịch |
| **Trong khi đi** | **Gọi món gì, chơi gì, chi bao nhiêu** | **Tầng “Trải nghiệm tại địa điểm” (mục 6)** |
| Sau | Lưu kỷ niệm, chấm điểm, chia sẻ | Nhật ký, ảnh, **đánh giá và feedback (mục 7)** |
| Quay lại | “Lần này đi đâu?” | Gợi ý cá nhân hóa dựa trên lịch sử |

Vòng lặp này là nguồn tăng trưởng: dữ liệu “sau khi đi” (đánh giá, giá thực tế, ảnh) quay lại làm giàu bước “trước khi đi” cho người khác.

## 5. Hiện trạng: lõi sản phẩm (tóm tắt)

Chi tiết trong tài liệu Plan & Spec: Next.js + TypeScript trên Vercel, TiDB Cloud (MySQL), phòng đôi ẩn danh, 36 địa điểm Hà Nội, tìm kiếm full-text, lưu ảnh/video đã nén trên storage, bảo mật mức cao, responsive ưu tiên mượt.

**Nguyên tắc dữ liệu cho mọi mở rộng sau này:**

- **Nguồn hợp lệ:** API chính thức, giấy phép mở (OSM, Wikimedia, Pexels…), đối tác, người dùng đóng góp. Video KOL: chỉ nhúng hoặc lưu khi có phép bằng văn bản.
- **Tự động ở khối lượng lớn, duyệt theo ngoại lệ:** ứng viên có điểm tin cậy; chỉ nơi nào mâu thuẫn hoặc thiếu nguồn mới vào hàng đợi duyệt.
- **Mọi dữ liệu có “tuổi”:** `last_verified_at`, nguồn, mức tin cậy, và nhãn hiển thị cho người dùng.

## 6. Hướng mở rộng chính: Trải nghiệm tại địa điểm (đồ ăn, đồ uống, trò chơi, hoạt động)

### 6.1 Ý tưởng

Mỗi địa điểm có thêm một tầng **“Nên thử gì ở đây”**: món nên gọi, đồ uống đặc trưng, trò chơi/hoạt động đi kèm, kèm **mức giá** và **feedback của người đã đi**. Mục tiêu là trả lời được: “Hai đứa đến đó, chi khoảng bao nhiêu và nên gọi gì?”.

**Ví dụ minh họa (dữ liệu giả, chỉ để hình dung):**

| Địa điểm | Mục | Giá tham khảo | Ghi chú nhanh |
| --- | --- | --- | --- |
| Quán cà phê view hồ | Cà phê trứng (đồ uống đặc trưng) | 45k-60k | Nhiều người khen, hợp chia đôi |
| Quán cà phê view hồ | Bánh ngọt ăn chung | 55k-80k | Gợi ý cho 2 người |
| Khu vui chơi trong nhà | Trò chơi đôi (bắn súng, bowling mini) | 80k-150k/người | Hợp ngày mưa |
| **Tổng ước tính cho 2 người** |  | **khoảng 250k-350k** | App tự cộng theo lựa chọn |

### 6.2 Các loại mục (offering)

| Loại | Ví dụ | Thuộc tính đặc thù |
| --- | --- | --- |
| Đồ uống | Cà phê trứng, trà, cocktail | Có cồn hay không, đá/nóng |
| Món ăn | Món ăn chính, ăn vặt, tráng miệng | Chay, dị ứng, khẩu phần cho 1 hay 2 người |
| Combo/set cho đôi | “Set 2 người”, combo hẹn hò | Gồm những gì, tiết kiệm bao nhiêu |
| Trò chơi và hoạt động | Bowling, escape room, làm gốm, chèo SUP | Thời lượng, độ tuổi, cần đặt trước |
| Dịch vụ | Chụp ảnh, thuê trang phục, trang trí | Giá gói, thời lượng |
| Vé/lệ phí | Vé vào cửa, gửi xe | Giá/người, giá/xe |

### 6.3 Tính năng

- **Menu gợi ý:** 3-5 mục “nên thử” cho mỗi nơi, có nhãn “hợp cho 2 người”, “ăn chung được”, “ít ngọt”.
- **Ước tính chi phí cho 2 người:** người dùng tick các mục, app cộng tổng và so với ngân sách đã chọn.
- **Gói buổi hẹn theo ngân sách:** ví dụ “400k: cà phê + món share + một trò chơi”, tự ghép từ các nơi gần nhau.
- **Bộ lọc theo mục:** “Tìm nơi có món chay”, “có trò chơi đôi”, “có combo dưới 300k”, “có cocktail”.
- **Lịch sử giá:** hiển thị khoảng giá và ngày cập nhật; cảnh báo khi có nhiều người báo giá khác nhau.
- **Nhập vào kế hoạch:** món/trò chơi chọn xong vào checklist hoặc ghi chú của buổi hẹn (“đặt trước 2 vé”).

### 6.4 Làm sao có dữ liệu menu và giá

| Nguồn | Cách làm | Rủi ro |
| --- | --- | --- |
| Người dùng báo giá và tick “món đã gọi” sau chuyến đi | Một chạm trong nhật ký sau khi đi | Cần chống báo sai, dùng trung vị nhiều báo cáo |
| **Quán tự nhập (cổng đối tác)** | Chủ quán đăng nhập, cập nhật menu, giá, combo, giờ | Đây là nguồn đáng tin nhất và mở đường kiếm tiền (mục 9) |
| Ảnh menu do người dùng gửi | AI đọc ảnh, rút món và giá thành bản nháp | Cần đồng ý của người gửi, kiểm duyệt, ghi rõ nguồn |
| Biên tập viên nhập cho vài nơi nổi bật | Nhập tay | Tốn công, chỉ dùng để làm mẫu chất lượng |
| API thương mại (đặt món, đặt bàn) | Sau này nếu có đối tác | Phụ thuộc điều khoản của bên thứ ba |

**Nguyên tắc:** không sao chép nguyên menu từ trang/app khác. Dùng dữ liệu do người dùng và chính quán cung cấp, ghi nguồn và ngày cập nhật.

## 7. Hướng mở rộng: Feedback và đánh giá của người dùng

### 7.1 Đánh giá phải phục vụ việc hẹn hò, không chỉ chấm sao

**Tiêu chí chấm nhanh (chạm 1-5 hoặc 👍/👎):**

| Tiêu chí | Câu hỏi |
| --- | --- |
| Không gian và riêng tư | Có yên tĩnh, dễ nói chuyện không? |
| Ảnh đẹp | Ánh sáng, góc chụp có tốt không? |
| Đáng tiền | Giá có hợp lý so với chất lượng không? |
| Phục vụ | Nhân viên, tốc độ lên món |
| Độ đông | Lúc đi có đông, phải chờ không? |
| Hợp đi hẹn | Có nên đi buổi hẹn đầu không? |

**Thẻ nhanh (tag):** “view đẹp”, “ồn ào”, “nên đặt trước”, “đồ ăn ngon”, “hơi đắt”, “hợp ngày mưa”, “đông cuối tuần”.

**Đánh giá cấp món:** mỗi món đã gọi có 👍/👎 và nhãn “nên gọi”, “không đáng”.

**Ngữ cảnh đi:** ngày thường/cuối tuần/ngày lễ, khung giờ, ngân sách thực tế cho 2 người. Nhờ đó app trả lời được “vào cuối tuần buổi tối quán này có đông không?”.

### 7.2 Làm sao tin được đánh giá (khi không có tài khoản)

| Cơ chế | Mô tả |
| --- | --- |
| **Chuyến đi đã xác nhận** | Chỉ cho đánh giá khi buổi hẹn có địa điểm đó đã được đánh dấu “Đã đi” trong phòng đôi |
| Giới hạn tần suất | Tối đa 1 đánh giá mỗi phòng cho mỗi địa điểm trong 30 ngày; rate limit và Turnstile |
| Chống lạm dụng | Phát hiện nội dung trùng lặp, từ khóa quảng cáo, đột biến điểm; nút “Báo cáo” |
| Kiểm duyệt | Đánh giá mới ở trạng thái chờ khi có dấu hiệu bất thường; admin duyệt |
| Bảo vệ riêng tư | Đánh giá hiển thị ẩn danh, không lộ phòng hay thông tin cá nhân; ảnh xóa EXIF |
| Tách bạch quán và người dùng | Quán được **trả lời công khai** nhưng không sửa hay xóa đánh giá |

### 7.3 Cách tính điểm

- **Điểm trung bình có hiệu chỉnh (Bayesian):** nơi ít lượt đánh giá được kéo về mức trung bình chung để không bị lệch.
- **Trọng số theo thời gian:** đánh giá gần đây có sức nặng lớn hơn; điểm cũ giảm dần.
- **Điểm theo ngữ cảnh:** tính riêng cho ngày thường và cuối tuần/ngày lễ, và theo từng tiêu chí.
- **Tín hiệu “thật”:** nhiều người cùng nhắc một ý (ví dụ “đông cuối tuần”) mới hiển thị thành nhãn nổi bật.
- **Hiển thị trung thực:** luôn hiện số lượt đánh giá và ngày gần nhất; không che điểm thấp.

### 7.4 Feedback quay lại cải thiện gợi ý

Đánh giá, lượt vuốt Match và lịch sử “đã đi” tạo **hồ sơ sở thích ẩn danh** của từng phòng (ưa chill hay vui chơi, ngân sách thường, hay đi ngày nào). Dùng để:

- Xếp hạng lại kết quả wizard (ưu tiên nơi hợp sở thích, tránh lặp nơi vừa đi).
- Gợi ý “Các cặp giống bạn thường thích...” chỉ khi đủ dữ liệu, tránh gợi ý sai ở giai đoạn đầu (cold start).
- Phát hiện nơi đang xuống cấp (nhiều đánh giá tiêu cực mới) để đưa vào hàng đợi kiểm tra lại.

## 8. Thiết kế dữ liệu cho phần mở rộng

### 8.1 Các bảng mới (bổ sung vào schema hiện có)

| Bảng | Cột chính | Mục đích |
| --- | --- | --- |
| `offerings` | id, name, type (drink/food/combo/game/activity/service/fee), tags JSON, dietary JSON, serves (1/2), image | Danh mục các mục dùng chung (một món có thể có ở nhiều nơi) |
| `place_offerings` | place\_id, offering\_id, local\_name, price\_min, price\_max, unit (người/phần/giờ), is\_signature, availability JSON, last\_verified\_at, source | Mục cụ thể tại từng nơi, kèm giá |
| `price_observations` | place\_offering\_id, price, observed\_at, source (user/merchant/editor), room\_hash | Nhiều báo giá để tính trung vị, theo dõi biến động |
| `reviews` | id, place\_id, plan\_id NULL, visit\_date, day\_type, time\_slot, spend\_for\_two, overall, status | Đánh giá cấp địa điểm, gắn chuyến đi đã xác nhận |
| `review_ratings` | review\_id, criterion, score | Điểm theo từng tiêu chí |
| `review_tags` | review\_id, tag | Thẻ nhanh |
| `review_items` | review\_id, place\_offering\_id, verdict (up/down), note | Đánh giá cấp món |
| `review_photos` | review\_id, url, status | Ảnh người dùng, qua kiểm duyệt |
| `review_replies` | review\_id, merchant\_id, body | Phản hồi của quán |
| `merchants`, `merchant_places` | id, tên, liên hệ, trạng thái xác minh | Cổng đối tác |
| `place_stats` | place\_id, daytype, avg\_overall, rating\_count, tag\_counts JSON, updated\_at | Bảng tổng hợp để đọc nhanh (cập nhật bằng job) |
| `bundles` | id, title, budget\_band, items JSON, place\_ids | Gói buổi hẹn theo ngân sách |

### 8.2 Ranh giới module trong code

Mỗi mảng có thư mục riêng trong `server/services/` để mở rộng không làm rối lõi: `catalog` (địa điểm, cẩm nang), `offerings` (món, giá, combo), `community` (đánh giá, báo cáo, kiểm duyệt), `merchant` (cổng đối tác), `planning` (kế hoạch, lịch), `recommend` (xếp hạng, hồ sơ sở thích). Bật/tắt từng mảng bằng **feature flag** để ra mắt từng bước.

## 9. Cách tăng trưởng và (nếu muốn) kiếm tiền

Chỉ để bạn hình dung các hướng, chưa phải cam kết. **Nguyên tắc cố định: không bán vị trí trong kết quả gợi ý**, vì độ tin cậy là tài sản lớn nhất.

| Hướng | Mô tả | Lưu ý |
| --- | --- | --- |
| Đối tác quán (cổng merchant) | Quán tự cập nhật menu, giá, combo, ảnh; gói trả phí có thêm thống kê lượt xem, nhận đặt chỗ | Dữ liệu chính xác hơn cho người dùng, tạo doanh thu cho bạn |
| Đặt chỗ và voucher | Người dùng đặt bàn hoặc mua voucher qua app | Cần tích hợp thanh toán hoặc đối tác, tính ở giai đoạn sau |
| Liên kết giới thiệu (affiliate) | Đặt phòng, hoa, quà, thuê trang phục | Ghi rõ là liên kết |
| Quảng cáo/tài trợ gắn nhãn | Khu vực “Tài trợ” tách riêng khỏi xếp hạng | Luôn có nhãn rõ ràng |
| Gói Premium cho cặp đôi | Album kỷ niệm in, báo cáo “Năm của chúng mình”, không giới hạn lưu ảnh | Làm sau khi có lượng người dùng quay lại |

**Lưu ý pháp lý:** quảng cáo, đánh giá và xử lý dữ liệu cá nhân có quy định riêng tại Việt Nam. Mình không phải luật sư; hãy tham khảo chuyên gia trước khi triển khai thương mại.

## 10. Ý tưởng mở rộng khác (kho ý tưởng)

- **Trợ lý lên buổi hẹn bằng một câu:** “Tối thứ Sáu, 500k, trời mưa, thích yên tĩnh” rồi AI ghép lộ trình hoàn chỉnh từ dữ liệu có sẵn, không bịa nơi ngoài danh sách.
- **Gợi ý theo thời tiết thời gian thực** và cảnh báo đổi kế hoạch.
- **Lịch sự kiện:** triển lãm, hòa nhạc, chợ phiên, mùa hoa; gắn vào bộ lọc dịp.
- **Thử thách cặp đôi:** “10 nơi đầu tiên ở Hà Nội”, huy hiệu, bản đồ đã đi.
- **Trò chơi nhỏ khi ngồi quán:** bộ câu hỏi làm quen, thử thách chụp ảnh đôi (nội dung của app, khác với “trò chơi tại địa điểm”).
- **Dịp đặc biệt:** gói kỷ niệm, sinh nhật, cầu hôn, kèm gợi ý hoa, quà, trang trí.
- **Mở rộng đối tượng:** hẹn bạn bè, gia đình, đi một mình, nhóm nhỏ.
- **Mở rộng địa lý:** Hải Phòng, Đà Nẵng, TP.HCM; mỗi thành phố cần quy trình nội dung riêng và đối tác địa phương.
- **Kênh mới:** mini-app Zalo, app native, tiếng Anh cho du khách.
- **Chia sẻ:** thẻ kế hoạch đẹp để gửi cho người ấy, hoặc đăng lên mạng xã hội (kèm liên kết quay lại app).

## 11. Lộ trình mở rộng đề xuất

| Giai đoạn | Thời gian gợi ý | Trọng tâm | Dấu hiệu để sang giai đoạn sau |
| --- | --- | --- | --- |
| 0. Lõi sản phẩm | Theo Plan & Spec (3-4 tuần MVP) | Gợi ý, cẩm nang, phòng đôi, kế hoạch | Có cặp đôi thật dùng để đi một buổi hẹn |
| 1. Nội dung tự động | 3-4 tuần | Pipeline OSM, YouTube, nguồn ảnh mở; hàng đợi duyệt; mở rộng lên vài trăm nơi | Phần lớn địa điểm mới không cần thao tác tay |
| 2. Trải nghiệm tại nơi | 4-6 tuần | `offerings`, giá, combo, ước tính chi phí cho 2 người, bộ lọc theo món/trò chơi | Người dùng dùng ước tính chi phí khi lên kế hoạch |
| 3. Feedback và cộng đồng | 4-6 tuần | Đánh giá theo chuyến đã xác nhận, ảnh, báo giá, điểm Bayesian | Đủ số lượt đánh giá thật để điểm có ý nghĩa |
| 4. Cá nhân hóa và đối tác | 6-8 tuần | Hồ sơ sở thích, cổng merchant, phản hồi của quán | Có quán sẵn sàng tự cập nhật dữ liệu |
| 5. Mở rộng | Liên tục | Thành phố mới, trợ lý AI, đặt chỗ, đa ngôn ngữ | Mô hình nội dung vận hành được mà không phụ thuộc một người |

**Chỉ số theo dõi (ví dụ):** tỷ lệ hoàn thành wizard, số kế hoạch tạo/tuần, số buổi hẹn “Đã đi”, tỷ lệ để lại đánh giá sau chuyến đi, độ phủ giá (bao nhiêu % địa điểm có giá cập nhật dưới 90 ngày), thời gian từ mở app đến chọn được nơi, tỷ lệ quay lại sau 30 ngày.

## 12. Rủi ro và nguyên tắc

| Rủi ro | Cách giảm |
| --- | --- |
| Dữ liệu lỗi thời (giá, giờ, quán đóng cửa) | Hiển thị ngày cập nhật, kiểm tra định kỳ, người dùng báo sai, cổng merchant |
| Đánh giá giả hoặc bị thao túng | Chỉ nhận từ chuyến đi đã xác nhận, giới hạn tần suất, kiểm duyệt, hiển thị minh bạch |
| Bản quyền ảnh/video/menu | Giấy phép rõ ràng, nhúng hoặc xin phép, không sao chép nguyên văn nguồn khác |
| AI bịa chi tiết | Nhãn “gợi ý tự động”, các trường quan trọng (giá, giờ) chỉ lấy từ nguồn thật |
| Thiên vị thương mại làm mất lòng tin | Không bán vị trí xếp hạng; khu tài trợ gắn nhãn tách riêng |
| Quyền riêng tư (ảnh, lịch sử đi chơi của cặp) | Phòng đôi ẩn danh, ảnh riêng tư, xóa dữ liệu một chạm, tối thiểu hóa dữ liệu |
| Phụ thuộc gói miễn phí | Theo dõi hạn mức, cache, thiết kế để dịch vụ ngoài lỗi vẫn chạy |
| Phình phạm vi | Ra từng giai đoạn bằng feature flag, chỉ làm giai đoạn sau khi giai đoạn trước có tín hiệu tốt |

## 13. Những điều cần bạn quyết định

1. **Trọng tâm sau MVP:** đẩy mạnh nội dung tự động (giai đoạn 1) hay vào ngay menu/giá (giai đoạn 2)?
2. **Dữ liệu giá ban đầu:** chấp nhận bắt đầu từ khoảng giá do người dùng/ban biên tập nhập, hay muốn có quán tham gia sớm?
3. **Đánh giá:** chỉ cho người đã “Đã đi” trong app (chặt, ít nhưng tin cậy) hay cho đánh giá nhanh không cần kế hoạch (nhiều nhưng dễ nhiễu)?
4. **Mô hình doanh thu:** có định kiếm tiền không, và nếu có thì ưu tiên hướng nào?
5. **Phạm vi đối tượng:** chỉ cặp đôi hay mở cho bạn bè/gia đình?
6. **Thành phố tiếp theo** sau Hà Nội.

Khi bạn trả lời các câu trên, mình sẽ chuyển từng giai đoạn thành spec chi tiết (màn hình, API, schema, tiêu chí nghiệm thu) và thêm vào tài liệu Plan & Spec.
