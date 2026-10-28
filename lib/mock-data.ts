import type { HanoiPlace } from "./types/catalog";

export type { HanoiPlace, PhotoSpot, Pose, OutfitGuide } from "./types/catalog";

// Dữ liệu seed catalog cho môi trường chưa cấu hình DATABASE_URL.
// Tọa độ là gần đúng, admin cần xác minh lại khi nhập CMS.
export const HANOI_PLACES: HanoiPlace[] = [
  {
    id: 'p1',
    slug: 'cau-long-bien',
    name: 'Cầu Long Biên',
    area: 'Hoàn Kiếm - Long Biên',
    category: 'photo',
    categoryLabel: 'Chụp ảnh',
    priceLevel: 1,
    costText: 'Miễn phí (Gửi xe 10k)',
    moods: ['photo', 'romantic', 'chill'],
    moodLabels: ['Chụp ảnh', 'Lãng mạn', 'Chill'],
    indoor: false,
    status: 'published',
    lat: 21.0436,
    lng: 105.8594,
    bestTimeText: 'Hợp đi lúc 17:15 - 18:05 nha',
    goldenMorning: '05:45 - 06:45',
    goldenAfternoon: '17:15 - 18:05',
    blueHour: '18:05 - 18:35',
    bestWeekdays: 'Thứ 3, Thứ 4, Thứ 5 (vắng hơn)',
    avoidWeekdays: 'Chiều Chủ nhật (đông người chụp)',
    summary: 'Chứng nhân lịch sử hơn 120 năm với hoàng hôn đỏ rực trên sông Hồng và bãi lau thơ mộng.',
    coverGradient: 'from-[#D96B43] via-[#E89973] to-[#4A5568]',
    emoji: '🌉',
    photoSpots: [
      { name: 'Nhịp cầu số 3 nhìn về bãi giữa', howToFind: 'Đi bộ từ đầu cầu phía Trần Nhật Duật khoảng 250m bên làn người đi bộ.', tip: 'Đứng ngược sáng lúc 17:30 để lấy bóng nắng xuyên qua dầm thép.' },
      { name: 'Cầu thang bộ xuống bãi giữa', howToFind: 'Giữa cầu có lối bậc thang sắt đi xuống vườn chuối.', tip: 'Chụp từ trên cao xuống lấy trọn màu xanh bãi bồi.' }
    ],
    poses: [
      { title: 'Tựa vai ngắm hoàng hôn sông Hồng', desc: 'Hai người đứng sát lan can, quay lưng 3/4 về phía ống kính, nhìn theo hướng mặt trời lặn.' },
      { title: 'Nắm tay đi dọc hành lang sắt', desc: 'Một người đi trước kéo tay người sau, bật chế độ chụp liên tục để bắt khoảnh khắc tự nhiên.' }
    ],
    outfit: {
      palette: ['#F5EBE6', '#D4A373', '#6B4F4F', '#2C3639'],
      tonSurTon: 'Nàng váy dài kem/be chất đũi hoặc len mỏng; Chàng sơ mi nâu nhạt hoặc caro vintage.',
      contrast: 'Một người mặc tông trắng kem sáng, người kia phối denim xanh trầm hoặc nâu đất.',
      avoid: 'Tránh mặc đồ neon chói hoặc giày cao gót nhọn vì mặt cầu nhiều khe hở.',
      weatherTip: 'Chiều gió sông khá mát (25°C), nên mang theo áo khoác cardigan mỏng.'
    },
    tips: 'Gửi xe máy ở gầm cầu phía phố Gầm Cầu. Tuyệt đối đứng trong phần hành lang dành cho người đi bộ, không bước vào đường ray tàu hỏa.',
    nearbyIds: ['p8', 'p2']
  },
  {
    id: 'p2',
    slug: 'ho-hoan-kiem-den-ngoc-son',
    name: 'Hồ Hoàn Kiếm & Đền Ngọc Sơn',
    area: 'Hoàn Kiếm',
    category: 'photo',
    categoryLabel: 'Chụp ảnh & Dạo bộ',
    priceLevel: 1,
    costText: 'Dạo hồ 0đ • Đền Ngọc Sơn 100k/2 người',
    moods: ['romantic', 'chill', 'photo'],
    moodLabels: ['Lãng mạn', 'Chill', 'Chụp ảnh'],
    indoor: false,
    status: 'published',
    lat: 21.0287,
    lng: 105.8524,
    bestTimeText: 'Hợp đi lúc 07:00 hoặc 16:45 nha',
    goldenMorning: '06:00 - 07:30',
    goldenAfternoon: '16:45 - 17:45',
    blueHour: '18:00 - 18:30 (Cầu Thê Húc lên đèn)',
    bestWeekdays: 'Sáng Thứ 2 - Thứ 6',
    avoidWeekdays: 'Tối Thứ 7 (Phố đi bộ rất đông)',
    summary: 'Trái tim Hà Nội với cầu Thê Húc đỏ thắm, tháp Rùa cổ kính và hàng cây rủ bóng mặt hồ.',
    coverGradient: 'from-[#2A6F4E] via-[#7A9E87] to-[#D9534F]',
    emoji: '🐢',
    photoSpots: [
      { name: 'Bờ hồ đối diện Tháp Bút & Cầu Thê Húc', howToFind: 'Đoạn đường Đinh Tiên Hoàng gần kem Thủy Tạ.', tip: 'Chụp góc nghiêng lấy cầu Thê Húc đỏ nổi bật trên mặt nước xanh.' },
      { name: 'Toà soạn báo Hà Nội Mới', howToFind: 'Số 44 Lê Thái Tổ.', tip: 'Góc tường vàng cửa xanh kinh điển của các cặp đôi Hà Nội.' }
    ],
    poses: [
      { title: 'Cầm kem Tràng Tiền/Thủy Tạ cụng nhau', desc: 'Cười tươi nhìn nhau, làm mờ hậu cảnh mặt hồ phía sau.' },
      { title: 'Đọc bảng tin báo Hà Nội Mới', desc: 'Chàng chỉ tay vào khung báo, nàng nghiêng đầu nhìn theo.' }
    ],
    outfit: {
      palette: ['#FAF0CA', '#8D99AE', '#3B2A2A', '#BC4749'],
      tonSurTon: 'Phối đồ thanh lịch tông trắng - xanh pastel hoặc nâu cổ điển.',
      contrast: 'Nàng điểm nhấn khăn lụa/túi đỏ mận tiệp màu cầu Thê Húc, chàng sơ mi trắng.',
      avoid: 'Nếu vào trong Đền Ngọc Sơn, tránh mặc váy/quần quá ngắn trên đầu gối.',
      weatherTip: 'Trời dịu mát, rất hợp đi bộ vòng quanh hồ khoảng 1.7km.'
    },
    tips: 'Gửi xe tại phố Đinh Lễ hoặc bãi xe bờ hồ có niêm yết giá.',
    nearbyIds: ['p8', 'p9']
  },
  {
    id: 'p3',
    slug: 'ho-tay-duong-thanh-nien',
    name: 'Hồ Tây & Đường Thanh Niên',
    area: 'Tây Hồ',
    category: 'walk',
    categoryLabel: 'Đi dạo & Hoàng hôn',
    priceLevel: 1,
    costText: 'Miễn phí - 80k (Bánh tôm/Kem)',
    moods: ['romantic', 'chill'],
    moodLabels: ['Lãng mạn', 'Chill'],
    indoor: false,
    status: 'published',
    lat: 21.0475,
    lng: 105.8394,
    bestTimeText: 'Hợp đi lúc 17:10 - 18:10 nha',
    goldenMorning: '05:50 - 06:50',
    goldenAfternoon: '17:10 - 18:10',
    blueHour: '18:10 - 18:40',
    bestWeekdays: 'Mọi ngày chiều nắng đẹp',
    avoidWeekdays: 'Trưa nắng gắt 11:30 - 14:30',
    summary: 'Tuyến đường lãng mạn nhất thủ đô giữa Hồ Tây và hồ Trúc Bạch, nơi mặt trời lặn tròn vành vạnh.',
    coverGradient: 'from-[#FF8066] via-[#FF9E8D] to-[#4B4453]',
    emoji: '🌅',
    photoSpots: [
      { name: 'Lan can hồ Trúc Bạch nhìn sang đường Thanh Niên', howToFind: 'Phố Trấn Vũ đoạn gần quán cà phê ven hồ.', tip: 'Lấy trọn mặt trời lặn xuống mặt nước và hàng phượng.' },
      { name: 'Cổng chùa Trấn Quốc', howToFind: 'Giữa đường Thanh Niên.', tip: 'Ánh nắng chiều chiếu xiên qua tường vàng cực ấm.' }
    ],
    poses: [
      { title: 'Cùng ngồi ghế đá/xe đạp nhìn mặt hồ', desc: 'Chụp từ phía sau lưng hai người khi mặt trời chuyển màu cam hồng.' },
      { title: 'Chụp qua gương chiếu hậu xe máy', desc: 'Lấy khuôn mặt hai người trong gương cùng nền hoàng hôn Hồ Tây.' }
    ],
    outfit: {
      palette: ['#FFF7F3', '#FF9E8D', '#4A5759', '#3B2A2A'],
      tonSurTon: 'Tông pastel nhẹ nhàng (hồng phấn, kem, xanh baby blue).',
      contrast: 'Áo phông/sơ mi trắng phối quần jeans xanh cổ điển.',
      avoid: 'Tránh mặc đồ quá tối màu nếu muốn chụp lúc giờ xanh (Blue Hour).',
      weatherTip: 'Gió Hồ Tây lồng lộng, tóc dài nên mang theo kẹp càng cua dễ thương.'
    },
    tips: 'Có thể thuê xe đạp đôi dạo quanh hồ hoặc ghé ăn bánh tôm, phở cuốn Ngũ Xã ngay sát bên.',
    nearbyIds: ['p4', 'p6']
  },
  {
    id: 'p4',
    slug: 'bai-da-song-hong',
    name: 'Bãi đá sông Hồng',
    area: 'Tây Hồ',
    category: 'nature',
    categoryLabel: 'Thiên nhiên & Picnic',
    priceLevel: 1,
    costText: 'khoảng 100k - 150k/2 người',
    moods: ['photo', 'chill', 'romantic'],
    moodLabels: ['Chụp ảnh', 'Chill', 'Lãng mạn'],
    indoor: false,
    status: 'published',
    lat: 21.0705,
    lng: 105.846,
    bestTimeText: 'Hợp đi lúc 16:00 - 17:45 nha',
    goldenMorning: '06:00 - 07:30',
    goldenAfternoon: '16:00 - 17:45',
    blueHour: '17:50 - 18:15',
    bestWeekdays: 'Thứ 3, Thứ 4, Thứ 5',
    avoidWeekdays: 'Ngày mưa hoặc mùa nước sông dâng cao',
    summary: 'Không gian đồng cỏ lau trắng muốt, vườn hoa theo mùa và bờ sông lộng gió hợp picnic đôi.',
    coverGradient: 'from-[#E0A96D] via-[#DDA15E] to-[#606C38]',
    emoji: '🌾',
    photoSpots: [
      { name: 'Cánh đồng cỏ lau ven sông', howToFind: 'Đi thẳng cuối ngõ 264 Âu Cơ vào khu bãi bồi.', tip: 'Đứng giữa thảm lau cao ngang vai, chụp góc máy thấp.' }
    ],
    poses: [
      { title: 'Trải thảm picnic đọc sách & uống trà', desc: 'Bố cục góc rộng lấy giỏ mây, hoa tươi và hai người cười tự nhiên.' }
    ],
    outfit: {
      palette: ['#FEFAE0', '#DDA15E', '#BC6C25', '#283618'],
      tonSurTon: 'Phong cách Boho hoặc Cottagecore: trắng kem, nâu đất, vàng bơ.',
      contrast: 'Váy hoa nhí dịu dàng phối cùng sơ mi linen trắng.',
      avoid: 'Tránh giày trắng vải dễ bám bụi đất bãi sông.',
      weatherTip: 'Nắng chiều dịu 26°C cực đẹp để trải thảm ngồi chơi.'
    },
    tips: 'Đi thẳng cuối ngõ 264 Âu Cơ. Nhớ kiểm tra dự báo mưa trước khi đi.',
    nearbyIds: ['p3', 'p6']
  },
  {
    id: 'p5',
    slug: 'thao-nguyen-hoa-long-bien',
    name: 'Thảo nguyên hoa Long Biên',
    area: 'Long Biên',
    category: 'photo',
    categoryLabel: 'Chụp ảnh cháy máy',
    priceLevel: 1,
    costText: '~140k (70k/người)',
    moods: ['photo', 'romantic'],
    moodLabels: ['Chụp ảnh', 'Lãng mạn'],
    indoor: false,
    status: 'published',
    lat: 21.049,
    lng: 105.865,
    bestTimeText: 'Hợp đi lúc 15:30 - 17:30 nha',
    goldenMorning: '06:30 - 08:30',
    goldenAfternoon: '15:30 - 17:30',
    blueHour: '17:45 - 18:10',
    bestWeekdays: 'Thứ 2 - Thứ 6 (không phải chờ góc chụp)',
    avoidWeekdays: 'Chiều Thứ 7, CN đông các ekip chụp cưới',
    summary: 'Phim trường ngoài trời rộng lớn bên bờ sông Hồng với đồi cừu, lâu đài cổ và vườn cúc họa mi.',
    coverGradient: 'from-[#F28482] via-[#F5CAC3] to-[#84A59D]',
    emoji: '🐑',
    photoSpots: [
      { name: 'Đồi cừu & Nhà gỗ châu Âu', howToFind: 'Khu trung tâm ngay sau cổng soát vé 100m.', tip: 'Mua thêm bó cỏ nhỏ để các bé cừu quây quanh hai bạn.' }
    ],
    poses: [
      { title: 'Khiêu vũ nhẹ giữa vườn hoa', desc: 'Chàng xoay nhẹ tay nàng để tà váy bay tự nhiên trong nắng.' }
    ],
    outfit: {
      palette: ['#FFFFFF', '#F7EDE2', '#F5CAC3', '#84A59D'],
      tonSurTon: 'Tông trắng tinh khôi, hồng đào nhạt hoặc xanh sage.',
      contrast: 'Váy maxi sáng màu và bộ vest/sơ mi lịch lãm.',
      avoid: 'Tránh đồ nhiều họa tiết rối mắt vì nền hoa đã rất rực rỡ.',
      weatherTip: 'Nên đi từ 15:30 để chụp được nhiều bối cảnh trước khi tắt nắng.'
    },
    tips: 'Nằm trên bãi Thạch Cầu, Long Biên. Có phòng thay đồ ngay trong khuôn viên.',
    nearbyIds: ['p1', 'p8']
  },
  {
    id: 'p6',
    slug: 'pho-phan-dinh-phung',
    name: 'Phố Phan Đình Phùng & Cửa Bắc',
    area: 'Ba Đình',
    category: 'photo',
    categoryLabel: 'Chụp ảnh & Đi dạo',
    priceLevel: 1,
    costText: 'Miễn phí (Hoa/nước 50k-100k)',
    moods: ['photo', 'chill', 'romantic'],
    moodLabels: ['Chụp ảnh', 'Chill', 'Lãng mạn'],
    indoor: false,
    status: 'published',
    lat: 21.04,
    lng: 105.844,
    bestTimeText: 'Hợp đi lúc 07:30 - 09:30 nha',
    goldenMorning: '07:00 - 09:30 (Tia nắng xuyên vòm sấu)',
    goldenAfternoon: '16:00 - 17:15',
    blueHour: '17:45 - 18:15',
    bestWeekdays: 'Sáng Thứ 3 - Thứ 5',
    avoidWeekdays: 'Cuối tuần rất đông người chụp xe hoa',
    summary: 'Con đường rợp bóng sấu cổ thụ lãng mạn bậc nhất Hà Nội cùng di tích thành Cửa Bắc cổ kính.',
    coverGradient: 'from-[#6B8E23] via-[#A3B18A] to-[#DAD7CD]',
    emoji: '🍂',
    photoSpots: [
      { name: 'Vỉa hè rộng trước cổng trường Phan Đình Phùng', howToFind: 'Số 30 Phan Đình Phùng.', tip: 'Đón tia nắng xiên qua tán cây lúc 8h sáng.' }
    ],
    poses: [
      { title: 'Ôm bó hoa tươi đi bộ trên thảm lá vàng', desc: 'Hai người vừa đi vừa trò chuyện, góc máy ngang tầm mắt.' }
    ],
    outfit: {
      palette: ['#FFFDF9', '#E9EDC9', '#CCD5AE', '#D4A373'],
      tonSurTon: 'Áo dài truyền thống, váy tiểu thư trắng hoặc sơ mi kem.',
      contrast: 'Trắng tinh khôi nổi bật trên nền lá xanh và tường vàng.',
      avoid: 'Tránh đứng xuống lòng đường gây cản trở giao thông.',
      weatherTip: 'Buổi sáng nắng trong trẻo, nhiệt độ 24°C cực dễ chịu.'
    },
    tips: 'Gửi xe tại khu vực Cửa Bắc rồi đi bộ dọc vỉa hè.',
    nearbyIds: ['p3', 'p2']
  },
  {
    id: 'p7',
    slug: 'lang-gom-bat-trang',
    name: 'Làng gốm Bát Tràng & Bảo tàng Gốm',
    area: 'Gia Lâm',
    category: 'fun',
    categoryLabel: 'Trải nghiệm & Vui chơi',
    priceLevel: 2,
    costText: '200k - 400k/2 người',
    moods: ['fun', 'chill', 'photo'],
    moodLabels: ['Vui chơi', 'Chill', 'Chụp ảnh'],
    indoor: true,
    status: 'published',
    lat: 20.977,
    lng: 105.913,
    bestTimeText: 'Hợp đi lúc 09:00 - 16:00 nha',
    goldenMorning: '08:30 - 10:30',
    goldenAfternoon: '15:30 - 17:00',
    blueHour: '17:30 - 18:00',
    bestWeekdays: 'Thứ 3 - Thứ 6',
    avoidWeekdays: 'Trưa Chủ nhật đông đoàn tham quan',
    summary: 'Cùng nhau tự tay vuốt nặn cốc gốm đôi và check-in kiến trúc xoắn ốc tuyệt đẹp tại Bảo tàng Gốm.',
    coverGradient: 'from-[#B5654D] via-[#D48C70] to-[#F4E3D7]',
    emoji: '🏺',
    photoSpots: [
      { name: 'Vòm xoắn ốc Bảo tàng Gốm Bát Tràng', howToFind: 'Số 28 thôn 5 Bát Tràng.', tip: 'Đứng ở ban công tầng 2 chụp góc rộng lấy đường cong đất nung.' }
    ],
    poses: [
      { title: 'Cùng chuốt gốm trên bàn xoay', desc: 'Khoảnh khắc hai bàn tay chạm nhau bên bàn xoay gốm cực tình cảm.' }
    ],
    outfit: {
      palette: ['#F4F1DE', '#E07A5F', '#3D405B', '#81B29A'],
      tonSurTon: 'Tông be, trắng kem hoặc xanh rêu nổi bật trên nền gốm đỏ nâu.',
      contrast: 'Tránh mặc màu nâu gạch trùng hoàn toàn với tường bảo tàng.',
      avoid: 'Khi nặn gốm nhớ đeo tạp dề để không bắn đất sét lên quần áo.',
      weatherTip: 'Có không gian trong nhà nên mưa hay nắng đều đi chơi trọn vẹn.'
    },
    tips: 'Có thể đi xe máy dọc đê Long Biên - Xuân Quan hoặc đi xe buýt 47A từ Long Biên.',
    nearbyIds: ['p1', 'p5']
  },
  {
    id: 'p8',
    slug: 'ca-phe-view-cau-long-bien',
    name: 'Cà phê Rooftop View Cầu Long Biên',
    area: 'Hoàn Kiếm',
    category: 'cafe',
    categoryLabel: 'Cà phê & Lãng mạn',
    priceLevel: 2,
    costText: '150k - 280k/2 người',
    moods: ['romantic', 'photo', 'chill'],
    moodLabels: ['Lãng mạn', 'Chụp ảnh', 'Chill'],
    indoor: true,
    status: 'published',
    lat: 21.042,
    lng: 105.853,
    bestTimeText: 'Hợp đi lúc 16:45 - 18:30 nha',
    goldenMorning: '08:00 - 10:00',
    goldenAfternoon: '16:45 - 18:15',
    blueHour: '18:15 - 18:45',
    bestWeekdays: 'Mọi ngày trong tuần',
    avoidWeekdays: 'Không có (có tầng trong nhà điều hòa)',
    summary: 'Ngắm trọn toàn cảnh cầu Long Biên cổ kính và đoàn tàu lướt qua từ ban công biệt thự Pháp cổ.',
    coverGradient: 'from-[#6D4C41] via-[#A1887F] to-[#FF9E8D]',
    emoji: '☕',
    photoSpots: [
      { name: 'Ban công tầng 4 nhìn thẳng ra nhịp cầu', howToFind: 'Khu tập thể ga Long Biên / Trần Nhật Duật.', tip: 'Canh lúc tàu hỏa chạy qua khoảng 17:20 để quay clip.' }
    ],
    poses: [
      { title: 'Nâng tách cà phê trứng nhìn về phía cầu', desc: 'Chụp cận cảnh qua vai lấy độ sâu trường ảnh.' }
    ],
    outfit: {
      palette: ['#3B2A2A', '#D7CCC8', '#FF9E8D', '#FFF7F3'],
      tonSurTon: 'Phong cách cổ điển châu Âu: nâu trầm, kem sữa, đen thanh lịch.',
      contrast: 'Váy đen/đỏ đô nổi bật giữa kiến trúc trắng ngà.',
      avoid: 'Không cần lưu ý đặc biệt.',
      weatherTip: 'Phương án thay thế tuyệt vời và an toàn 100% cho phố đường tàu!'
    },
    tips: 'Điểm hẹn đầu tiên lý tưởng: vừa có tầng ngoài trời ngắm hoàng hôn, vừa có phòng máy lạnh yên tĩnh.',
    nearbyIds: ['p1', 'p2']
  },
  {
    id: 'p9',
    slug: 'nha-tu-hoa-lo',
    name: 'Di tích Nhà tù Hỏa Lò',
    area: 'Hoàn Kiếm',
    category: 'indoor',
    categoryLabel: 'Trong nhà & Lịch sử',
    priceLevel: 1,
    costText: '100k/2 người (Có giảm giá SV)',
    moods: ['chill'],
    moodLabels: ['Chill', 'Ý nghĩa'],
    indoor: true,
    status: 'published',
    lat: 21.0253,
    lng: 105.8463,
    bestTimeText: 'Hợp đi lúc 08:30 - 16:30 (Phương án khi mưa)',
    goldenMorning: '08:00 - 11:00',
    goldenAfternoon: '14:00 - 16:30',
    blueHour: 'Tour đêm 19:00 cuối tuần (Đặt trước)',
    bestWeekdays: 'Thứ 2 - Thứ 6',
    avoidWeekdays: 'Cuối tuần đông khách nếu chưa đặt audioguide',
    summary: 'Buổi hẹn hò lắng đọng, sâu sắc tìm hiểu lịch sử cùng thuyết minh tự động (Audio Guide) truyền cảm.',
    coverGradient: 'from-[#4A4E69] via-[#9A8C98] to-[#C9ADA7]',
    emoji: '🏛️',
    photoSpots: [
      { name: 'Hàng cây bàng cổ thụ và cổng chính màu vàng', howToFind: 'Số 1 phố Hỏa Lò.', tip: 'Chụp kỷ niệm nhẹ nhàng, lịch sự bên ngoài sân di tích.' }
    ],
    poses: [
      { title: 'Cùng đeo tai nghe Audio Guide lắng nghe', desc: 'Góc chụp tự nhiên, nghiêm túc và giàu cảm xúc.' }
    ],
    outfit: {
      palette: ['#2B2D42', '#8D99AE', '#EDF2F4', '#3B2A2A'],
      tonSurTon: 'Trang phục lịch sự, kín đáo: sơ mi, quần dài, váy dài qua gối.',
      contrast: 'Tông màu trung tính, nhã nhặn.',
      avoid: 'Tuyệt đối tránh trang phục hở hang hoặc tạo dáng phản cảm trong khu di tích.',
      weatherTip: 'Phương án số 1 khi Hà Nội bất chợt đổ mưa hoặc nắng gắt.'
    },
    tips: 'Nên thuê tai nghe thuyết minh tự động để hai người cùng nghe câu chuyện lịch sử.',
    nearbyIds: ['p2', 'p8']
  },
  {
    id: 'p10',
    slug: 'lotte-observation-deck-top-of-hanoi',
    name: 'Lotte Sky Walk & Top of Hanoi',
    area: 'Ba Đình',
    category: 'food',
    categoryLabel: 'Ăn tối & Kỷ niệm',
    priceLevel: 3,
    costText: 'Trên 500k/2 người',
    moods: ['romantic', 'photo', 'food'],
    moodLabels: ['Lãng mạn', 'Chụp ảnh', 'Ăn uống'],
    indoor: true,
    status: 'published',
    lat: 21.0318,
    lng: 105.8127,
    bestTimeText: 'Hợp đi lúc 17:30 - 21:00 nha',
    goldenMorning: '09:00 - 11:00',
    goldenAfternoon: '17:15 - 18:15 (Ngắm thành phố lên đèn)',
    blueHour: '18:15 - 19:00',
    bestWeekdays: 'Mọi ngày tối trời quang',
    avoidWeekdays: 'Ngày sương mù dày hoặc mưa to',
    summary: 'Ngắm toàn cảnh Hà Nội từ tầng 65-67, bước trên sàn kính Sky Walk và dùng bữa tối kỷ niệm lãng mạn.',
    coverGradient: 'from-[#1D2D44] via-[#3E5C76] to-[#C93F52]',
    emoji: '🥂',
    photoSpots: [
      { name: 'Sàn kính Sky Walk tầng 65', howToFind: '54 Liễu Giai, Ba Đình.', tip: 'Chụp lúc 18:10 khi bầu trời còn xanh đậm và đèn đường vừa sáng.' }
    ],
    poses: [
      { title: 'Cụng ly dưới ánh đèn vàng Top of Hanoi', desc: 'Bật chế độ chân dung ban đêm lấy hiệu ứng bokeh lung linh của thành phố.' }
    ],
    outfit: {
      palette: ['#1B1B1E', '#C93F52', '#F8F9FA', '#D4AF37'],
      tonSurTon: 'Smart Casual / Dressy: Đầm dạ tiệc nhẹ cho nàng, sơ mi/blazer cho chàng.',
      contrast: 'Đen tuyền phối cùng đỏ rượu vang (Crimson) hoặc trắng kem.',
      avoid: 'Tránh mặc đồ tập thể thao hoặc dép lê.',
      weatherTip: 'Tầng 67 ngoài trời buổi tối khá nhiều gió, nên mang theo khăn choàng nhẹ.'
    },
    tips: 'Nên đặt bàn trước 2-3 ngày nếu đi vào dịp kỷ niệm hoặc cuối tuần để có bàn sát lan can.',
    nearbyIds: ['p3', 'p6']
  }
];

export const HIDDEN_SAFETY_PLACE = {
  id: 'p-hidden-train',
  slug: 'pho-ca-phe-duong-tau',
  name: 'Phố cà phê đường tàu (ĐÃ CHẶN AN TOÀN)',
  area: 'Hoàn Kiếm / Điện Biên Phủ',
  category: 'cafe',
  costText: 'Cấm hoạt động',
  status: 'hidden',
  warningMessage:
    'Chính quyền đã dựng rào chắn từ tháng 9/2022 và Sở Du lịch Hà Nội (3/2025) yêu cầu không đưa khách tới khu vực hành lang an toàn đường sắt vì nguy hiểm khi tàu chạy qua.',
  alternatives: ['ca-phe-view-cau-long-bien', 'cau-long-bien'],
};
