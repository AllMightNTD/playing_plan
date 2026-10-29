import type { HanoiPlace } from "./types/catalog";

export type { HanoiPlace, PhotoSpot, Pose, OutfitGuide } from "./types/catalog";

// Dữ liệu seed catalog cho môi trường chưa cấu hình DATABASE_URL.
// Tọa độ là gần đúng, admin cần xác minh lại khi nhập CMS.
export const HANOI_PLACES: HanoiPlace[] = [
  {
    id: 'p1',
    coverUrl: "https://images.unsplash.com/photo-1611633346086-1a26ee68dff0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8MXx8TG9uZyUyMEJpZW4lMjBCcmlkZ2UlMjBIYW5vaXxlbnwwfHx8fDE3OTMwOTgxNTN8MA&ixlib=rb-4.1.0&q=80&w=1080",
    media: [
      {
            "id": "Jitt6BlA-G3Pp4x7A9kKE",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1611633346086-1a26ee68dff0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8MXx8TG9uZyUyMEJpZW4lMjBCcmlkZ2UlMjBIYW5vaXxlbnwwfHx8fDE3OTMwOTgxNTN8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "2l39R_f6EUg",
            "caption": "red and white bridge over body of water during daytime",
            "credit": "Harry Tran / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/red-and-white-bridge-over-body-of-water-during-daytime-2l39R_f6EUg",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 0
      },
      {
            "id": "neNVzhp-dxR20XEZG0yZ-",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1707834539150-552a67f5b394?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8Mnx8TG9uZyUyMEJpZW4lMjBCcmlkZ2UlMjBIYW5vaXxlbnwwfHx8fDE3OTMwOTgxNTN8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "jyojyL9sA94",
            "caption": "a motorcycle driving across a bridge over a river",
            "credit": "Hoang Ngo / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/a-motorcycle-driving-across-a-bridge-over-a-river-jyojyL9sA94",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 1
      },
      {
            "id": "oPtRO7y9a8x6RUlEpgr5F",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1625196117182-11dd07334bb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8M3x8TG9uZyUyMEJpZW4lMjBCcmlkZ2UlMjBIYW5vaXxlbnwwfHx8fDE3OTMwOTgxNTN8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "KDIExA3NGn4",
            "caption": "people riding motorcycle on road during daytime",
            "credit": "Nam Hoang / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/people-riding-motorcycle-on-road-during-daytime-KDIExA3NGn4",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 2
      },
      {
            "id": "z3MxdJH-6psAsRI11Iwbg",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1790443540001-5ef6c0ea38e6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8NHx8TG9uZyUyMEJpZW4lMjBCcmlkZ2UlMjBIYW5vaXxlbnwwfHx8fDE3OTMwOTgxNTN8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "Faaqgps74u8",
            "caption": "Motorcyclists riding across the Long Bien Bridge in Hanoi at dusk",
            "credit": "Hạnh Kiều / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/motorcyclists-on-long-bien-bridge-hanoi-Faaqgps74u8",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 3
      },
      {
            "id": "LGZXwLY8MuXWyYeh5TvIH",
            "type": "image",
            "platform": "wikimedia",
            "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Long_Bien_Bridge_destroyed_by_LGBs_1972.jpg/1280px-Long_Bien_Bridge_destroyed_by_LGBs_1972.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
            "embedId": null,
            "caption": "Aerial reconnaissance photograph of the Long Bien Bridge (then called Paul Doumer Bridge), located just outside of Hanoi, after laser-guided munitions destroyed it.",
            "credit": "USAF / Wikimedia Commons",
            "sourceUrl": "https://commons.wikimedia.org/wiki/File:Long_Bien_Bridge_destroyed_by_LGBs_1972.jpg",
            "licenseNote": "Public domain",
            "license": "cc0",
            "sortOrder": 4
      },
      {
            "id": "R09njf3x57G2mbLBapOwN",
            "type": "image",
            "platform": "wikimedia",
            "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Foot_and_Bike_Bridge_%2818535231430%29.jpg/1280px-Foot_and_Bike_Bridge_%2818535231430%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
            "embedId": null,
            "caption": "Long Bien Bridge",
            "credit": "Michael Coghlan from Adelaide, Australia / Wikimedia Commons",
            "sourceUrl": "https://commons.wikimedia.org/wiki/File:Foot_and_Bike_Bridge_(18535231430).jpg",
            "licenseNote": "CC BY-SA 2.0 https://creativecommons.org/licenses/by-sa/2.0",
            "license": "licensed",
            "sortOrder": 5
      }
],
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
    coverUrl: "https://images.unsplash.com/photo-1689080541115-5acffbf0a083?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8MXx8SG9hbiUyMEtpZW0lMjBMYWtlJTIwTmdvYyUyMFNvbiUyMFRlbXBsZXxlbnwwfHx8fDE3OTMwOTgxNTR8MA&ixlib=rb-4.1.0&q=80&w=1080",
    media: [
      {
            "id": "jWd5floGX5wF95ZZXHdtR",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1689080541115-5acffbf0a083?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8MXx8SG9hbiUyMEtpZW0lMjBMYWtlJTIwTmdvYyUyMFNvbiUyMFRlbXBsZXxlbnwwfHx8fDE3OTMwOTgxNTR8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "mZ_L9K36pjo",
            "caption": "a lake surrounded by trees with a building in the background",
            "credit": "Thuỷ Nguyễn / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/a-lake-surrounded-by-trees-with-a-building-in-the-background-mZ_L9K36pjo",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 0
      },
      {
            "id": "7P831WbzygNmcTvRS7HYl",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1715943335714-9557043cb2cb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8Mnx8SG9hbiUyMEtpZW0lMjBMYWtlJTIwTmdvYyUyMFNvbiUyMFRlbXBsZXxlbnwwfHx8fDE3OTMwOTgxNTR8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "TkhMMc6dncw",
            "caption": "a large building sitting on top of a lush green field",
            "credit": "Filipe Freitas / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/a-large-building-sitting-on-top-of-a-lush-green-field-TkhMMc6dncw",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 1
      },
      {
            "id": "bVqXRyj8RMgiyioLAj6TV",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1683880392922-ce66f007d08d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8M3x8SG9hbiUyMEtpZW0lMjBMYWtlJTIwTmdvYyUyMFNvbiUyMFRlbXBsZXxlbnwwfHx8fDE3OTMwOTgxNTR8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "IBLEHMFaY3s",
            "caption": "a man standing in front of a body of water",
            "credit": "menderes kahraman / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/a-man-standing-in-front-of-a-body-of-water-IBLEHMFaY3s",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 2
      },
      {
            "id": "VIhH9k5BSeo0KBhcsBt4r",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1687418145225-656fe3209205?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8NHx8SG9hbiUyMEtpZW0lMjBMYWtlJTIwTmdvYyUyMFNvbiUyMFRlbXBsZXxlbnwwfHx8fDE3OTMwOTgxNTR8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "BTv1dklIpA0",
            "caption": "a body of water surrounded by trees and buildings",
            "credit": "Ryan Le / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/a-body-of-water-surrounded-by-trees-and-buildings-BTv1dklIpA0",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 3
      },
      {
            "id": "uK9rlH4QH0v6I6xE_9nf5",
            "type": "image",
            "platform": "wikimedia",
            "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7a/Lascar_The_Huc_Bridge_-_Hoan_Kiem_Lake_%284550416275%29.jpg/1280px-Lascar_The_Huc_Bridge_-_Hoan_Kiem_Lake_%284550416275%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
            "embedId": null,
            "caption": "The Huc Bridge - Hoan Kiem Lake",
            "credit": "Jorge Láscar from Australia / Wikimedia Commons",
            "sourceUrl": "https://commons.wikimedia.org/wiki/File:Lascar_The_Huc_Bridge_-_Hoan_Kiem_Lake_(4550416275).jpg",
            "licenseNote": "CC BY 2.0 https://creativecommons.org/licenses/by/2.0",
            "license": "licensed",
            "sortOrder": 4
      },
      {
            "id": "x_GZ-L4_vGkedDSiNG5Hv",
            "type": "image",
            "platform": "wikimedia",
            "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Lascar_Tortoise_Tower_%28Thap_Rua%29_-_Hoan_Kiem_Lake_%284551046826%29.jpg/1280px-Lascar_Tortoise_Tower_%28Thap_Rua%29_-_Hoan_Kiem_Lake_%284551046826%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
            "embedId": null,
            "caption": "Thap Rua, or Tortoise Tower, is a three-storey pagoda located in the middle of Ho Hoan Kiem, in the middle of Hanoi. The Thap Rua was built in the 18th century, and is one of the most recognised landm",
            "credit": "Jorge Láscar from Australia / Wikimedia Commons",
            "sourceUrl": "https://commons.wikimedia.org/wiki/File:Lascar_Tortoise_Tower_(Thap_Rua)_-_Hoan_Kiem_Lake_(4551046826).jpg",
            "licenseNote": "CC BY 2.0 https://creativecommons.org/licenses/by/2.0",
            "license": "licensed",
            "sortOrder": 5
      }
],
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
    coverUrl: "https://images.unsplash.com/photo-1683880392723-d7f2e42f5e66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8MXx8V2VzdCUyMExha2UlMjBIYW5vaXxlbnwwfHx8fDE3OTMwOTgxNTZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    media: [
      {
            "id": "PXMEqWaOk49sPx6MNS8S7",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1683880392723-d7f2e42f5e66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8MXx8V2VzdCUyMExha2UlMjBIYW5vaXxlbnwwfHx8fDE3OTMwOTgxNTZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "4cWWgwjKzmA",
            "caption": "a man sitting on a wooden dock in the middle of a lake",
            "credit": "menderes kahraman / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/a-man-sitting-on-a-wooden-dock-in-the-middle-of-a-lake-4cWWgwjKzmA",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 0
      },
      {
            "id": "PX-421IIgcun9d4qC-2VT",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1683880392128-1b0eae4921fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8Mnx8V2VzdCUyMExha2UlMjBIYW5vaXxlbnwwfHx8fDE3OTMwOTgxNTZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "EsMBGaV4G2I",
            "caption": "a man standing on a dock in the middle of a body of water",
            "credit": "menderes kahraman / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/a-man-standing-on-a-dock-in-the-middle-of-a-body-of-water-EsMBGaV4G2I",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 1
      },
      {
            "id": "dDFCCw29xfdkoLWgqOcVC",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1790570614016-bd209213f377?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8M3x8V2VzdCUyMExha2UlMjBIYW5vaXxlbnwwfHx8fDE3OTMwOTgxNTZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "DktWc3ry67Y",
            "caption": "A city skyline across a lake with trees along the shore at dusk",
            "credit": "Hạnh Kiều / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/city-skyline-across-lake-at-dusk-DktWc3ry67Y",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 2
      },
      {
            "id": "rU5_r4cxNM-OdQxSzJQ7R",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1790570614301-29458ba62ac4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8NHx8V2VzdCUyMExha2UlMjBIYW5vaXxlbnwwfHx8fDE3OTMwOTgxNTZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "WiSrMFJU-hY",
            "caption": "Two people fishing on a concrete embankment during the golden hour",
            "credit": "Hạnh Kiều / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/people-fishing-on-embankment-at-golden-hour-WiSrMFJU-hY",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 3
      },
      {
            "id": "noEps1x_gXRyE8kyu9M79",
            "type": "image",
            "platform": "wikimedia",
            "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Chua_Tran_Quoc_%28pagode_de_la_d%C3%A9fense_du_pays%29.jpg/1280px-Chua_Tran_Quoc_%28pagode_de_la_d%C3%A9fense_du_pays%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
            "embedId": null,
            "caption": "Pagode de la défense du pays sur le lac de l'ouest",
            "credit": "Qjafcc / Wikimedia Commons",
            "sourceUrl": "https://commons.wikimedia.org/wiki/File:Chua_Tran_Quoc_(pagode_de_la_d%C3%A9fense_du_pays).jpg",
            "licenseNote": "CC BY-SA 3.0 https://creativecommons.org/licenses/by-sa/3.0",
            "license": "licensed",
            "sortOrder": 4
      },
      {
            "id": "HcmBvhFsm1Jbi5ZoIupLa",
            "type": "image",
            "platform": "wikimedia",
            "url": "https://upload.wikimedia.org/wikipedia/commons/2/28/John_McCain_shot_down%2C_Truc_Bach_lake%2C_Hanoi_-_panoramio.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
            "embedId": null,
            "caption": "John McCain shot down, Truc Bach lake, Hanoi",
            "credit": "David Holt / Wikimedia Commons",
            "sourceUrl": "https://commons.wikimedia.org/wiki/File:John_McCain_shot_down,_Truc_Bach_lake,_Hanoi_-_panoramio.jpg",
            "licenseNote": "CC BY-SA 3.0 https://creativecommons.org/licenses/by-sa/3.0",
            "license": "licensed",
            "sortOrder": 5
      }
],
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
    coverUrl: "https://images.unsplash.com/photo-1579691370236-76f5cbd00ea6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8MXx8UmVkJTIwUml2ZXIlMjBIYW5vaXxlbnwwfHx8fDE3OTMwOTgxNTd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    media: [
      {
            "id": "sGRXat8uPLAkF4wXPJLSt",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1579691370236-76f5cbd00ea6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8MXx8UmVkJTIwUml2ZXIlMjBIYW5vaXxlbnwwfHx8fDE3OTMwOTgxNTd8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "KPMelKqKybY",
            "caption": "green grass field under white sky during daytime",
            "credit": "Tin Ly / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/green-grass-field-under-white-sky-during-daytime-KPMelKqKybY",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 0
      },
      {
            "id": "2TJ3_Vppqr6wO5MhbEGaF",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1790815557071-4d722bf016b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8Mnx8UmVkJTIwUml2ZXIlMjBIYW5vaXxlbnwwfHx8fDE3OTMwOTgxNTd8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "ESChKonoN3w",
            "caption": "A small boat on a wide river with a distant city skyline at dusk",
            "credit": "Hạnh Kiều / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/small-boat-on-river-at-dusk-ESChKonoN3w",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 1
      },
      {
            "id": "Re_316Yi6Ghr0KOI-CASW",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1790443539993-78600f3f174f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8M3x8UmVkJTIwUml2ZXIlMjBIYW5vaXxlbnwwfHx8fDE3OTMwOTgxNTd8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "YNUgespLI54",
            "caption": "A long bridge spanning a wide river under a warm golden hour sky",
            "credit": "Hạnh Kiều / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/bridge-over-river-at-golden-hour-YNUgespLI54",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 2
      },
      {
            "id": "Ztj5cgEPeiVLJIEDn9dCl",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1790815556986-f56317d7a70e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8NHx8UmVkJTIwUml2ZXIlMjBIYW5vaXxlbnwwfHx8fDE3OTMwOTgxNTd8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "Qs3gyrTFmOg",
            "caption": "A long bridge spanning a wide river under a warm orange sky",
            "credit": "Hạnh Kiều / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/bridge-over-river-at-golden-hour-Qs3gyrTFmOg",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 3
      }
],
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
    coverUrl: "https://images.unsplash.com/photo-1773738233689-9bdc641764e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8MXx8Zmxvd2VyJTIwZmllbGQlMjBIYW5vaXxlbnwwfHx8fDE3OTMwOTgxNTl8MA&ixlib=rb-4.1.0&q=80&w=1080",
    media: [
      {
            "id": "kGd0hFtLpBN-rVH5FA9fi",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1773738233689-9bdc641764e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8MXx8Zmxvd2VyJTIwZmllbGQlMjBIYW5vaXxlbnwwfHx8fDE3OTMwOTgxNTl8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "expXILsELqU",
            "caption": "Field of pink and white cosmos flowers outdoors",
            "credit": "Tuaans / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/field-of-pink-and-white-cosmos-flowers-outdoors-expXILsELqU",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 0
      },
      {
            "id": "_FCXT8fv-9sWXF0XXyYqU",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1775151870655-e81f5022ee74?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8Mnx8Zmxvd2VyJTIwZmllbGQlMjBIYW5vaXxlbnwwfHx8fDE3OTMwOTgxNTl8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "WkDgP8rI8UU",
            "caption": "Sunflowers bloom near a bridge at sunrise",
            "credit": "Hieu Do Quang / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/sunflowers-bloom-near-a-bridge-at-sunrise-WkDgP8rI8UU",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 1
      },
      {
            "id": "wnecx_OeZAC3U9h1MQ91z",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1611633360825-7d9657ca6185?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8M3x8Zmxvd2VyJTIwZmllbGQlMjBIYW5vaXxlbnwwfHx8fDE3OTMwOTgxNTl8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "5A_FftG3hD0",
            "caption": "white and brown labeled pack on green grass",
            "credit": "Harry Tran / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/white-and-brown-labeled-pack-on-green-grass-5A_FftG3hD0",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 2
      },
      {
            "id": "Z1qlpYljeSw7VnCnST6qx",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1775151870524-b4f81665dfe7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8NHx8Zmxvd2VyJTIwZmllbGQlMjBIYW5vaXxlbnwwfHx8fDE3OTMwOTgxNTl8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "1dkLnbVkzAE",
            "caption": "Pink flowers bloom before a misty bridge at sunrise",
            "credit": "Hieu Do Quang / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/pink-flowers-bloom-before-a-misty-bridge-at-sunrise-1dkLnbVkzAE",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 3
      },
      {
            "id": "5eD34qULlKi04-j-1UpAw",
            "type": "image",
            "platform": "wikimedia",
            "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/U.S._Ambassador_David_Shear_speaks_at_neglected_tropical_diseases_workshop_in_Hanoi%2C_Sept._8%2C_2011_%286125877045%29.jpg/1280px-U.S._Ambassador_David_Shear_speaks_at_neglected_tropical_diseases_workshop_in_Hanoi%2C_Sept._8%2C_2011_%286125877045%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
            "embedId": null,
            "caption": "U.S. Ambassador David Shear speaks at neglected tropical diseases workshop in Hanoi, Sept. 8, 2011",
            "credit": "USAID Vietnam / Wikimedia Commons",
            "sourceUrl": "https://commons.wikimedia.org/wiki/File:U.S._Ambassador_David_Shear_speaks_at_neglected_tropical_diseases_workshop_in_Hanoi,_Sept._8,_2011_(6125877045).jpg",
            "licenseNote": "Public domain",
            "license": "cc0",
            "sortOrder": 4
      }
],
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
    coverUrl: "https://images.unsplash.com/photo-1613131145282-9476375618e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8MXx8UGhhbiUyMERpbmglMjBQaHVuZyUyMHN0cmVldCUyMEhhbm9pfGVufDB8fHx8MTc5MzA5ODE2MHww&ixlib=rb-4.1.0&q=80&w=1080",
    media: [
      {
            "id": "R3mQOPzqxKqbJkDiXdDOZ",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1613131145282-9476375618e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8MXx8UGhhbiUyMERpbmglMjBQaHVuZyUyMHN0cmVldCUyMEhhbm9pfGVufDB8fHx8MTc5MzA5ODE2MHww&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "6keOhd7idJo",
            "caption": "people riding motorcycle on road near building during daytime",
            "credit": "Elliot Andrews / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/people-riding-motorcycle-on-road-near-building-during-daytime-6keOhd7idJo",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 0
      },
      {
            "id": "1tUmgXHSs-dTRpr2ZKKrQ",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1506800075271-265b16abe1e7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8Mnx8UGhhbiUyMERpbmglMjBQaHVuZyUyMHN0cmVldCUyMEhhbm9pfGVufDB8fHx8MTc5MzA5ODE2MHww&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "PEgu_IdF1BM",
            "caption": "woman carrying woven tray and white pail while walking on wet market",
            "credit": "Frida Aguilar Estrada / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/woman-carrying-woven-tray-and-white-pail-while-walking-on-wet-market-PEgu_IdF1BM",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 1
      },
      {
            "id": "NSwTTWYhFUDSKQK0xYyws",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1727402527960-78ce41e6bdee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8M3x8UGhhbiUyMERpbmglMjBQaHVuZyUyMHN0cmVldCUyMEhhbm9pfGVufDB8fHx8MTc5MzA5ODE2MHww&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "7MpM2Y4inx8",
            "caption": "A group of people riding motorcycles down a street",
            "credit": "Rizki Oceano / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/a-group-of-people-riding-motorcycles-down-a-street-7MpM2Y4inx8",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 2
      },
      {
            "id": "02iqyGmxmxycOwXR1R7jA",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1547158291-2b98c0b0bde4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8NHx8UGhhbiUyMERpbmglMjBQaHVuZyUyMHN0cmVldCUyMEhhbm9pfGVufDB8fHx8MTc5MzA5ODE2MHww&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "mwKVrPXrq1I",
            "caption": "view of balete tree near shops",
            "credit": "Raissa Lara Lütolf (-Fasel) / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/view-of-balete-tree-near-shops-mwKVrPXrq1I",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 3
      },
      {
            "id": "N3U_-irRu-d-vp7hMdcYW",
            "type": "image",
            "platform": "wikimedia",
            "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e9/Thit_rang_chay_canh.jpg/1280px-Thit_rang_chay_canh.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
            "embedId": null,
            "caption": "Thit rang chay canh",
            "credit": "Buileducanh (thảo luận) / Wikimedia Commons",
            "sourceUrl": "https://commons.wikimedia.org/wiki/File:Thit_rang_chay_canh.jpg",
            "licenseNote": "CC BY-SA 3.0 https://creativecommons.org/licenses/by-sa/3.0",
            "license": "licensed",
            "sortOrder": 4
      },
      {
            "id": "Ds_ycSfL0lZIw0HJFFP3Q",
            "type": "image",
            "platform": "wikimedia",
            "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6b/2chunnit.jpg/1280px-2chunnit.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
            "embedId": null,
            "caption": "2chunnit.jpg",
            "credit": "Buileducanh (thảo luận) / Wikimedia Commons",
            "sourceUrl": "https://commons.wikimedia.org/wiki/File:2chunnit.jpg",
            "licenseNote": "CC BY-SA 3.0 https://creativecommons.org/licenses/by-sa/3.0",
            "license": "licensed",
            "sortOrder": 5
      }
],
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
    coverUrl: "https://images.unsplash.com/photo-1733220665182-f6565fc1d056?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8MXx8QmF0JTIwVHJhbmclMjBwb3R0ZXJ5JTIwdmlsbGFnZXxlbnwwfHx8fDE3OTMwOTgxNjF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    media: [
      {
            "id": "Cb-HtkeahSFi3t_42-eNn",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1733220665182-f6565fc1d056?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8MXx8QmF0JTIwVHJhbmclMjBwb3R0ZXJ5JTIwdmlsbGFnZXxlbnwwfHx8fDE3OTMwOTgxNjF8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "1qkfUCVMDHs",
            "caption": "A vase that is sitting on a table",
            "credit": "Cuong Duyen Ceramics / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/a-vase-that-is-sitting-on-a-table-1qkfUCVMDHs",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 0
      },
      {
            "id": "qCQ_Zl5Q9dcadxi3bZyNS",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1733219188502-7aa168cd3188?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8Mnx8QmF0JTIwVHJhbmclMjBwb3R0ZXJ5JTIwdmlsbGFnZXxlbnwwfHx8fDE3OTMwOTgxNjF8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "uBByQZeR_14",
            "caption": "A vase with a fish design on it",
            "credit": "Cuong Duyen Ceramics / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/a-vase-with-a-fish-design-on-it-uBByQZeR_14",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 1
      },
      {
            "id": "kqguihuCvosTj9emg_Gt7",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1733220827775-847820b1c75d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8M3x8QmF0JTIwVHJhbmclMjBwb3R0ZXJ5JTIwdmlsbGFnZXxlbnwwfHx8fDE3OTMwOTgxNjF8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "jPZxvjAkXYs",
            "caption": "A vase with flowers painted on it",
            "credit": "Cuong Duyen Ceramics / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/a-vase-with-flowers-painted-on-it-jPZxvjAkXYs",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 2
      },
      {
            "id": "RiI1hazLPAxK0OnnUDOf0",
            "type": "image",
            "platform": "unsplash",
            "url": "https://images.unsplash.com/photo-1733218567206-a25b58bbe4c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTE1MDMzfDB8MXxzZWFyY2h8NHx8QmF0JTIwVHJhbmclMjBwb3R0ZXJ5JTIwdmlsbGFnZXxlbnwwfHx8fDE3OTMwOTgxNjF8MA&ixlib=rb-4.1.0&q=80&w=1080",
            "embedId": "4BBMTr2Ot7U",
            "caption": "A blue and white vase sitting on top of a table",
            "credit": "Cuong Duyen Ceramics / Unsplash",
            "sourceUrl": "https://unsplash.com/photos/a-blue-and-white-vase-sitting-on-top-of-a-table-4BBMTr2Ot7U",
            "licenseNote": "Unsplash License (hotlink, ghi công tác giả)",
            "license": "licensed",
            "sortOrder": 3
      },
      {
            "id": "uMjTChEIPttmFaG9evpjS",
            "type": "image",
            "platform": "wikimedia",
            "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/28/Bat_Trang_pottery_and_ceramics_village_in_2016_02.jpg/1280px-Bat_Trang_pottery_and_ceramics_village_in_2016_02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
            "embedId": null,
            "caption": "The Bat Trang porcelain village in 2016.",
            "credit": "Vuong Tri Binh / Wikimedia Commons",
            "sourceUrl": "https://commons.wikimedia.org/wiki/File:Bat_Trang_pottery_and_ceramics_village_in_2016_02.jpg",
            "licenseNote": "CC BY-SA 4.0 https://creativecommons.org/licenses/by-sa/4.0",
            "license": "licensed",
            "sortOrder": 4
      },
      {
            "id": "zIFMEzyJ9FfyMgcG8YiuY",
            "type": "image",
            "platform": "wikimedia",
            "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/Bat_Trang_pottery_and_ceramics_village_in_2016_03.jpg/1280px-Bat_Trang_pottery_and_ceramics_village_in_2016_03.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
            "embedId": null,
            "caption": "The Bat Trang porcelain village in 2016.",
            "credit": "Vuong Tri Binh / Wikimedia Commons",
            "sourceUrl": "https://commons.wikimedia.org/wiki/File:Bat_Trang_pottery_and_ceramics_village_in_2016_03.jpg",
            "licenseNote": "CC BY-SA 4.0 https://creativecommons.org/licenses/by-sa/4.0",
            "license": "licensed",
            "sortOrder": 5
      }
],
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
    coverUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bd/HanoiGare.jpg/1280px-HanoiGare.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    media: [
      {
            "id": "cAg85tZb0PNs5xmRIZuyq",
            "type": "image",
            "platform": "wikimedia",
            "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bd/HanoiGare.jpg/1280px-HanoiGare.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
            "embedId": null,
            "caption": "Train en gare d'Hanoï s'apprètant à franchir le fleuve rouge par le pont Long Biên - Vietnam",
            "credit": "BluesyPete / Wikimedia Commons",
            "sourceUrl": "https://commons.wikimedia.org/wiki/File:HanoiGare.jpg",
            "licenseNote": "CC BY-SA 3.0 https://creativecommons.org/licenses/by-sa/3.0",
            "license": "licensed",
            "sortOrder": 0
      },
      {
            "id": "mzYXPZf2yaAOE8vZpH64t",
            "type": "image",
            "platform": "wikimedia",
            "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c9/Hanoi%2C_Vietnam_%2812035240825%29.jpg/1280px-Hanoi%2C_Vietnam_%2812035240825%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
            "embedId": null,
            "caption": "Hanoi, Vietnam",
            "credit": "Clay Gilliland / Wikimedia Commons",
            "sourceUrl": "https://commons.wikimedia.org/wiki/File:Hanoi,_Vietnam_(12035240825).jpg",
            "licenseNote": "CC BY-SA 2.0 https://creativecommons.org/licenses/by-sa/2.0",
            "license": "licensed",
            "sortOrder": 1
      }
],
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
    coverUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c5/Skyline_North-West_of_Hanoi.jpg/1280px-Skyline_North-West_of_Hanoi.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    media: [
      {
            "id": "4t6k7u4QuJ4ReXEE98yNw",
            "type": "image",
            "platform": "wikimedia",
            "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c5/Skyline_North-West_of_Hanoi.jpg/1280px-Skyline_North-West_of_Hanoi.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
            "embedId": null,
            "caption": "Panorama of Skyline North-West of Hanoi",
            "credit": "Jean-Etienne Minh-Duy Poirrier from Bruxelles, Belgium / Wikimedia Commons",
            "sourceUrl": "https://commons.wikimedia.org/wiki/File:Skyline_North-West_of_Hanoi.jpg",
            "licenseNote": "CC BY-SA 2.0 https://creativecommons.org/licenses/by-sa/2.0",
            "license": "licensed",
            "sortOrder": 0
      },
      {
            "id": "SJH2Ueac5YD8bnoDyA79Z",
            "type": "image",
            "platform": "wikimedia",
            "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/50/Hoa_Lo_Prison_Maison_Centrale_Museum_%2839543736421%29.jpg/1280px-Hoa_Lo_Prison_Maison_Centrale_Museum_%2839543736421%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
            "embedId": null,
            "caption": "Hoa Lo Prison Maison Centrale Museum Vietnam Saigon",
            "credit": "dronepicr / Wikimedia Commons",
            "sourceUrl": "https://commons.wikimedia.org/wiki/File:Hoa_Lo_Prison_Maison_Centrale_Museum_(39543736421).jpg",
            "licenseNote": "CC BY 2.0 https://creativecommons.org/licenses/by/2.0",
            "license": "licensed",
            "sortOrder": 1
      }
],
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
    coverUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3a/Kh%C3%A1ch_s%E1%BA%A1n_Daewoo%2C_%C4%90%C3%A0o_T%E1%BA%A5n%2C_H%C3%A0_N%E1%BB%99i_001.JPG/1280px-Kh%C3%A1ch_s%E1%BA%A1n_Daewoo%2C_%C4%90%C3%A0o_T%E1%BA%A5n%2C_H%C3%A0_N%E1%BB%99i_001.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    media: [
      {
            "id": "FufE46VEeWDawNHfLrp3w",
            "type": "image",
            "platform": "wikimedia",
            "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3a/Kh%C3%A1ch_s%E1%BA%A1n_Daewoo%2C_%C4%90%C3%A0o_T%E1%BA%A5n%2C_H%C3%A0_N%E1%BB%99i_001.JPG/1280px-Kh%C3%A1ch_s%E1%BA%A1n_Daewoo%2C_%C4%90%C3%A0o_T%E1%BA%A5n%2C_H%C3%A0_N%E1%BB%99i_001.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
            "embedId": null,
            "caption": "Hà Nội, Việt Nam.",
            "credit": "Phan Minh Tuấn / Wikimedia Commons",
            "sourceUrl": "https://commons.wikimedia.org/wiki/File:Kh%C3%A1ch_s%E1%BA%A1n_Daewoo,_%C4%90%C3%A0o_T%E1%BA%A5n,_H%C3%A0_N%E1%BB%99i_001.JPG",
            "licenseNote": "CC BY-SA 4.0 https://creativecommons.org/licenses/by-sa/4.0",
            "license": "licensed",
            "sortOrder": 0
      },
      {
            "id": "TuitkLRXNKx9qaX-FFfdw",
            "type": "image",
            "platform": "wikimedia",
            "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/09/%C4%90%E1%BA%A1i_s%E1%BB%A9_qu%C3%A1n_Australia%2C_8_%C4%90%C3%A0o_T%E1%BA%A5n%2C_H%C3%A0_N%E1%BB%99i_001.JPG/1280px-%C4%90%E1%BA%A1i_s%E1%BB%A9_qu%C3%A1n_Australia%2C_8_%C4%90%C3%A0o_T%E1%BA%A5n%2C_H%C3%A0_N%E1%BB%99i_001.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
            "embedId": null,
            "caption": "Hà Nội, Việt Nam.",
            "credit": "Phan Minh Tuấn / Wikimedia Commons",
            "sourceUrl": "https://commons.wikimedia.org/wiki/File:%C4%90%E1%BA%A1i_s%E1%BB%A9_qu%C3%A1n_Australia,_8_%C4%90%C3%A0o_T%E1%BA%A5n,_H%C3%A0_N%E1%BB%99i_001.JPG",
            "licenseNote": "CC BY-SA 4.0 https://creativecommons.org/licenses/by-sa/4.0",
            "license": "licensed",
            "sortOrder": 1
      }
],
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
  },
  {
    "id": "p11",
    "coverUrl": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
    "media": [
      {
        "id": "med_aq_1",
        "type": "image",
        "platform": "unsplash",
        "url": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1080&q=80",
        "embedId": null,
        "caption": "Bể cá đại dương sâu thẳm với ánh sáng lung linh",
        "credit": "Unsplash Marine",
        "sourceUrl": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1080&q=80",
        "licenseNote": "Unsplash License",
        "license": "licensed",
        "sortOrder": 0
      },
      {
        "id": "med_aq_2",
        "type": "image",
        "platform": "unsplash",
        "url": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1080&q=80",
        "embedId": null,
        "caption": "Đường hầm vòm kính kỳ thú dưới đáy biển",
        "credit": "Unsplash Aquarium",
        "sourceUrl": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1080&q=80",
        "licenseNote": "Unsplash License",
        "license": "licensed",
        "sortOrder": 1
      },
      {
        "id": "med_v_p11",
        "type": "video",
        "platform": "youtube",
        "url": "https://www.youtube.com/watch?v=1CNtVWPGwpg",
        "embedId": "1CNtVWPGwpg",
        "caption": "Khám phá Thủy cung Lotte Mall lớn nhất Hà Nội",
        "credit": "DateMate Review",
        "sourceUrl": "https://www.youtube.com/watch?v=1CNtVWPGwpg",
        "licenseNote": "YouTube Embed",
        "license": "embed_only",
        "sortOrder": 10
      }
    ],
    "slug": "thuy-cung-lotte-world-aquarium-tay-ho",
    "name": "Thủy Cung Lotte World Aquarium",
    "area": "Tây Hồ",
    "category": "fun",
    "categoryLabel": "Khu vui chơi & Thủy cung",
    "priceLevel": 3,
    "costText": "280k - 350k/vé",
    "moods": [
      "fun",
      "romantic",
      "photo"
    ],
    "moodLabels": [
      "Vui chơi",
      "Lãng mạn",
      "Chụp ảnh"
    ],
    "indoor": true,
    "status": "published",
    "lat": 21.0745,
    "lng": 105.8118,
    "bestTimeText": "Hợp đi lúc 10:00 hoặc 15:30 nha",
    "goldenMorning": "09:30 - 11:30",
    "goldenAfternoon": "14:30 - 17:00",
    "blueHour": "18:00 - 20:00 (Ánh sáng đèn led lung linh)",
    "bestWeekdays": "Thứ 2 - Thứ 6 vắng vẻ",
    "avoidWeekdays": "Chiều Chủ Nhật đông trẻ em",
    "summary": "Thủy cung trong nhà hiện đại bậc nhất với đường hầm vòm kính 360 độ, bể chim cánh cụt và hàng ngàn sinh vật biển kỳ thú.",
    "coverGradient": "from-[#0A2E5C] via-[#1B4965] to-[#62B6CB]",
    "emoji": "🐬",
    "photoSpots": [
      {
        "name": "Đường hầm vòm kính đại dương 360 độ",
        "howToFind": "Khu vực giữa thủy cung, đi dọc lối đi chính.",
        "tip": "Chụp ngược sáng lấy bóng dáng cặp đôi in trên làn nước xanh thẳm."
      },
      {
        "name": "Bể sứa dạ quang phát sáng đổi màu",
        "howToFind": "Khu vực Thế giới kỳ bí ngay sau lối vào.",
        "tip": "Đứng sát kính, chờ nhịp đèn chuyển sang tím/xanh ngọc huyền ảo."
      }
    ],
    "poses": [
      {
        "title": "Tựa vai ngắm đàn cá bơi qua đầu",
        "desc": "Chụp từ phía sau lưng khi đàn cá đuối lượn qua vòm kính."
      },
      {
        "title": "Chạm tay lên vách kính đối xứng",
        "desc": "Hai người cùng chạm nhẹ đầu ngón tay lên mặt kính tương tác."
      }
    ],
    "outfit": {
      "palette": [
        "#1B4965",
        "#FAF0CA",
        "#E0FBFC",
        "#3D5A80"
      ],
      "tonSurTon": "Tông trắng kem hoặc xanh baby blue tiệp màu đại dương mát mắt.",
      "contrast": "Nàng váy trắng tiểu thư nổi bật giữa làn nước xanh sâu thẳm.",
      "avoid": "Tránh trang phục màu xanh lá cây hoặc phản quang gây bóng kính.",
      "weatherTip": "Không gian máy lạnh 22°C quanh năm, nên mang theo áo cardigan mỏng."
    },
    "tips": "Gửi xe tại hầm B2 Lotte Mall. Mua vé online trước trên web để không phải xếp hàng cuối tuần.",
    "nearbyIds": []
  },
  {
    "id": "p12",
    "coverUrl": "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
    "media": [
      {
        "id": "med_cp_1",
        "type": "image",
        "platform": "unsplash",
        "url": "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1080&q=80",
        "embedId": null,
        "caption": "Không gian workshop sáng tạo ấm cúng",
        "credit": "Unsplash Creative",
        "sourceUrl": "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1080&q=80",
        "licenseNote": "Unsplash License",
        "license": "licensed",
        "sortOrder": 0
      },
      {
        "id": "med_cp_2",
        "type": "image",
        "platform": "unsplash",
        "url": "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1080&q=80",
        "embedId": null,
        "caption": "Nội thất gạch mộc phong cách công nghiệp",
        "credit": "Unsplash Interior",
        "sourceUrl": "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1080&q=80",
        "licenseNote": "Unsplash License",
        "license": "licensed",
        "sortOrder": 1
      },
      {
        "id": "med_v_p12",
        "type": "video",
        "platform": "youtube",
        "url": "https://www.youtube.com/watch?v=T-kYvslKj9Y",
        "embedId": "T-kYvslKj9Y",
        "caption": "Hẹn hò trải nghiệm workshop nến thơm tại Complex 01",
        "credit": "DateMate Review",
        "sourceUrl": "https://www.youtube.com/watch?v=T-kYvslKj9Y",
        "licenseNote": "YouTube Embed",
        "license": "embed_only",
        "sortOrder": 10
      }
    ],
    "slug": "to-hop-complex-01-tay-son",
    "name": "Tổ Hợp Sáng Tạo COMPLEX 01",
    "area": "Đống Đa",
    "category": "fun",
    "categoryLabel": "Khu vui chơi & Workshop",
    "priceLevel": 2,
    "costText": "50k - 200k/người",
    "moods": [
      "chill",
      "photo",
      "fun"
    ],
    "moodLabels": [
      "Chill",
      "Chụp ảnh",
      "Vui chơi"
    ],
    "indoor": false,
    "status": "published",
    "lat": 21.0092,
    "lng": 105.8241,
    "bestTimeText": "Hợp đi lúc 14:30 - 17:30 nha",
    "goldenMorning": "08:30 - 10:30",
    "goldenAfternoon": "14:30 - 17:30",
    "blueHour": "18:00 - 19:30 (Đèn vàng ấm cúng)",
    "bestWeekdays": "Chiều Thứ 3 - Thứ 5",
    "avoidWeekdays": "Tối Thứ 7 hội chợ đông đúc",
    "summary": "Không gian nhà máy cũ cải tạo độc đáo thành tổ hợp cafe, triển lãm, workshop làm nến thơm, vẽ tranh và rạp chiếu phim mini.",
    "coverGradient": "from-[#8C3A27] via-[#C96E4B] to-[#E3A857]",
    "emoji": "🎨",
    "photoSpots": [
      {
        "name": "Cầu thang sắt xoắn ốc và tường gạch mộc tầng 2",
        "howToFind": "Khu vực sân trung tâm đi lên cầu thang mở.",
        "tip": "Chụp góc rộng hướng lên để lấy trọn kết cấu khung dầm thép công nghiệp."
      },
      {
        "name": "Giếng trời đón nắng tự nhiên",
        "howToFind": "Khoảng thông tầng giữa các gian hàng workshop.",
        "tip": "Chụp vào khoảng 15:00 khi vệt nắng rọi thẳng qua mái kính."
      }
    ],
    "poses": [
      {
        "title": "Cùng làm nến thơm hoặc vẽ tranh",
        "desc": "Hai người ngồi cạnh nhau bên bàn gỗ, cười vui khi nghịch màu vẽ."
      },
      {
        "title": "Bước xuống cầu thang gạch cổ",
        "desc": "Chàng đi trước ngoái lại nắm tay nàng bước xuống bậc thang."
      }
    ],
    "outfit": {
      "palette": [
        "#4A3B32",
        "#A67B5B",
        "#ECB176",
        "#FED8B1"
      ],
      "tonSurTon": "Phong cách vintage hoặc retro, tone nâu đất và cam cháy ấm áp.",
      "contrast": "Quần yếm denim phối áo phông trắng hoặc sơ mi kẻ caro cổ điển.",
      "avoid": "Tránh trang phục dạ hội quá cầu kỳ không hợp phong cách nhà xưởng.",
      "weatherTip": "Có cả khu trong nhà máy lạnh và sân trời thoáng mát."
    },
    "tips": "Ngõ vào hơi hẹp, nên đi xe máy gửi ở bãi đầu ngõ 167 Tây Sơn.",
    "nearbyIds": []
  },
  {
    "id": "p13",
    "coverUrl": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    "media": [
      {
        "id": "med_sup_1",
        "type": "image",
        "platform": "unsplash",
        "url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1080&q=80",
        "embedId": null,
        "caption": "Hoàng hôn rực rỡ trên mặt nước hồ lãng mạn",
        "credit": "Unsplash Sunset",
        "sourceUrl": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1080&q=80",
        "licenseNote": "Unsplash License",
        "license": "licensed",
        "sortOrder": 0
      },
      {
        "id": "med_v_p13",
        "type": "video",
        "platform": "youtube",
        "url": "https://www.youtube.com/watch?v=gIhIdsKjT5E",
        "embedId": "gIhIdsKjT5E",
        "caption": "Review trải nghiệm chèo SUP săn hoàng hôn Hồ Tây cùng người thương",
        "credit": "DateMate Review",
        "sourceUrl": "https://www.youtube.com/watch?v=gIhIdsKjT5E",
        "licenseNote": "YouTube Embed",
        "license": "embed_only",
        "sortOrder": 10
      }
    ],
    "slug": "cheo-sup-kayak-hoang-hon-ho-tay",
    "name": "Chèo SUP & Kayak Hồ Tây",
    "area": "Tây Hồ",
    "category": "fun",
    "categoryLabel": "Vui chơi thể thao nước",
    "priceLevel": 2,
    "costText": "200k - 250k/ván 2 người",
    "moods": [
      "fun",
      "romantic",
      "nature"
    ],
    "moodLabels": [
      "Vui chơi",
      "Lãng mạn",
      "Thiên nhiên"
    ],
    "indoor": false,
    "status": "published",
    "lat": 21.0668,
    "lng": 105.8276,
    "bestTimeText": "Hợp đi lúc 16:15 - 18:00 nha",
    "goldenMorning": "05:30 - 07:00 (Sương sớm tinh mơ)",
    "goldenAfternoon": "16:15 - 17:45 (Hoàng hôn đỉnh cao)",
    "blueHour": "17:45 - 18:15",
    "bestWeekdays": "Chiều các ngày có nắng đẹp",
    "avoidWeekdays": "Ngày gió mùa đông bắc hoặc mưa rào",
    "summary": "Trải nghiệm lướt ván SUP thả trôi giữa lòng Hồ Tây lộng gió, ngắm trọn vẹn quả cầu lửa hoàng hôn đỏ rực buông xuống mặt nước.",
    "coverGradient": "from-[#F37335] via-[#FDC830] to-[#0083B0]",
    "emoji": "🏄‍♂️",
    "photoSpots": [
      {
        "name": "Giữa lòng hồ Tây ngược hướng mặt trời lặn",
        "howToFind": "Chèo cách bờ khoảng 150m ra vùng nước thoáng.",
        "tip": "Đặt điện thoại trong túi chống nước, quay video slow-motion lúc mặt trời đỏ ối."
      },
      {
        "name": "Mũi thuyền SUP hướng về chùa Trấn Quốc",
        "howToFind": "Khu vực vịnh nước phẳng gần bến chèo.",
        "tip": "Lấy góc rộng thu trọn mặt nước gợn sóng lăn tăn óng ánh."
      }
    ],
    "poses": [
      {
        "title": "Cùng ngồi trên ván ngắm hoàng hôn",
        "desc": "Chàng ngồi phía sau cầm chèo, nàng ngồi phía trước tựa lưng vào chàng."
      },
      {
        "title": "Cụng mái chèo giữa hồ",
        "desc": "Hai người cùng giơ mái chèo tạo thành hình chữ V ngược đón nắng chiều."
      }
    ],
    "outfit": {
      "palette": [
        "#FF7B54",
        "#FFB26B",
        "#FFD56B",
        "#939B62"
      ],
      "tonSurTon": "Trang phục thể thao mau khô năng động hoặc đồ bơi phối áo khoác mỏng.",
      "contrast": "Áo phao cam/vàng neon tương phản ấn tượng với mặt nước xanh biếc.",
      "avoid": "Tránh mang trang phục vải jean nặng hoặc giày dép da ngấm nước.",
      "weatherTip": "Gió hồ chiều muộn khá mát, nhớ mang theo khăn tắm và túi chống nước điện thoại."
    },
    "tips": "Luôn mặc áo phao cài dây an toàn. Đặt lịch ván trước 1 ngày vào dịp cuối tuần.",
    "nearbyIds": []
  },
  {
    "id": "p14",
    "coverUrl": "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=1200&q=80",
    "media": [
      {
        "id": "med_fa_1",
        "type": "image",
        "platform": "unsplash",
        "url": "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=1080&q=80",
        "embedId": null,
        "caption": "Không gian trưng bày nghệ thuật tranh sơn mài",
        "credit": "Unsplash Art",
        "sourceUrl": "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=1080&q=80",
        "licenseNote": "Unsplash License",
        "license": "licensed",
        "sortOrder": 0
      },
      {
        "id": "med_v_p14",
        "type": "video",
        "platform": "youtube",
        "url": "https://www.youtube.com/watch?v=qhbsTtqGyo8",
        "embedId": "qhbsTtqGyo8",
        "caption": "Ghé thăm bảo tàng Mỹ Thuật cổ kính giữa lòng Hà Nội",
        "credit": "DateMate Review",
        "sourceUrl": "https://www.youtube.com/watch?v=qhbsTtqGyo8",
        "licenseNote": "YouTube Embed",
        "license": "embed_only",
        "sortOrder": 10
      }
    ],
    "slug": "bao-tang-my-thuat-viet-nam",
    "name": "Bảo Tàng Mỹ Thuật Việt Nam",
    "area": "Ba Đình",
    "category": "photo",
    "categoryLabel": "Bảo tàng & Nghệ thuật",
    "priceLevel": 1,
    "costText": "40.000đ/vé người lớn",
    "moods": [
      "romantic",
      "photo",
      "indoor"
    ],
    "moodLabels": [
      "Lãng mạn",
      "Chụp ảnh",
      "Trong nhà"
    ],
    "indoor": true,
    "status": "published",
    "lat": 21.0305,
    "lng": 105.8354,
    "bestTimeText": "Hợp đi lúc 09:30 hoặc 14:00 nha",
    "goldenMorning": "09:00 - 11:00 (Nắng xiên qua hành lang)",
    "goldenAfternoon": "14:00 - 16:30",
    "blueHour": "17:00 - 17:30",
    "bestWeekdays": "Thứ 3 - Thứ 6 yên tĩnh",
    "avoidWeekdays": "Thứ 2 (Bảo tàng đóng cửa bảo trì)",
    "summary": "Kiến trúc Pháp cổ thời Đông Dương với hành lang gỗ lim, cửa sổ chớp xanh và kho tàng hội họa sơn mài đỉnh cao của Việt Nam.",
    "coverGradient": "from-[#2C3E50] via-[#4CA1AF] to-[#C4E0E5]",
    "emoji": "🏛️",
    "photoSpots": [
      {
        "name": "Cầu thang gỗ lim uốn lượn cổ điển",
        "howToFind": "Ngay trục sảnh chính tầng 1 lên tầng 2.",
        "tip": "Đứng ở khúc ngoặt cầu thang, chụp từ trên cao xuống lấy toàn cảnh vân gỗ."
      },
      {
        "name": "Dãy hành lang cửa sổ chớp xanh Đông Dương",
        "howToFind": "Hành lang cánh phải tầng 2 khu trưng bày hội họa.",
        "tip": "Chụp lúc nắng sớm chiếu xiên tạo vệt bóng đổ sọc cực kỳ nghệ thuật."
      }
    ],
    "poses": [
      {
        "title": "Cùng chiêm ngưỡng một bức tranh sơn mài",
        "desc": "Hai người đứng sát nhau, chàng chỉ tay tinh tế về chi tiết trong bức tranh."
      },
      {
        "title": "Nắm tay bước dọc hành lang gỗ",
        "desc": "Bước đi nhẹ nhàng trong không gian tĩnh lặng, nụ cười dịu dàng nhìn nhau."
      }
    ],
    "outfit": {
      "palette": [
        "#FAF3E0",
        "#EAB543",
        "#58B19F",
        "#2C3A47"
      ],
      "tonSurTon": "Áo dài cách tân nhã nhặn hoặc đầm midi vintage trắng kem.",
      "contrast": "Sơ mi trắng kết hợp quần âu xám thanh lịch cho bạn nam.",
      "avoid": "Tránh mặc đồ ngắn trên đầu gối hoặc dép lê không phù hợp quy định bảo tàng.",
      "weatherTip": "Không gian trong nhà thoáng mát, lý tưởng để hẹn hò trong cả những ngày mưa phùn."
    },
    "tips": "Gửi xe ngay trong sân bảo tàng số 66 Nguyễn Thái Học. Chú ý đi nhẹ nói khẽ giữ không gian chung.",
    "nearbyIds": []
  },
  {
    "id": "p15",
    "coverUrl": "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80",
    "media": [
      {
        "id": "med_bk_1",
        "type": "image",
        "platform": "unsplash",
        "url": "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1080&q=80",
        "embedId": null,
        "caption": "Các gian nhà sách gỗ ấm cúng rợp bóng cây",
        "credit": "Unsplash Library",
        "sourceUrl": "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1080&q=80",
        "licenseNote": "Unsplash License",
        "license": "licensed",
        "sortOrder": 0
      },
      {
        "id": "med_v_p15",
        "type": "video",
        "platform": "youtube",
        "url": "https://www.youtube.com/watch?v=QkF64AAjRO0",
        "embedId": "QkF64AAjRO0",
        "caption": "Dạo bước phố sách Hà Nội ngày cuối tuần thanh bình",
        "credit": "DateMate Review",
        "sourceUrl": "https://www.youtube.com/watch?v=QkF64AAjRO0",
        "licenseNote": "YouTube Embed",
        "license": "embed_only",
        "sortOrder": 10
      }
    ],
    "slug": "pho-sach-ha-noi-19-thang-12",
    "name": "Phố Sách Hà Nội (19/12)",
    "area": "Hoàn Kiếm",
    "category": "walk",
    "categoryLabel": "Đi dạo & Sách",
    "priceLevel": 1,
    "costText": "Miễn phí vào cổng • Cafe 45k",
    "moods": [
      "chill",
      "walk",
      "photo"
    ],
    "moodLabels": [
      "Chill",
      "Đi dạo",
      "Chụp ảnh"
    ],
    "indoor": false,
    "status": "published",
    "lat": 21.0252,
    "lng": 105.8483,
    "bestTimeText": "Hợp đi lúc 08:30 hoặc 16:00 nha",
    "goldenMorning": "08:00 - 10:00 (Nắng sớm rọi qua tán cây)",
    "goldenAfternoon": "15:30 - 17:30",
    "blueHour": "18:00 - 19:00 (Đèn phố sách lên ấm áp)",
    "bestWeekdays": "Mọi ngày trong tuần đều yên tĩnh",
    "avoidWeekdays": "Trưa nắng hè 12:00 - 14:00",
    "summary": "Tuyến phố đi bộ rợp bóng mát với những gian hàng sách bằng gỗ nâu ấm áp, ghế đá hoa cỏ và không gian tĩnh lặng giữa lòng phố thị.",
    "coverGradient": "from-[#3A506B] via-[#5BC0BE] to-[#6FFFE9]",
    "emoji": "📚",
    "photoSpots": [
      {
        "name": "Hàng ghế gỗ dưới tán cây lộc vừng",
        "howToFind": "Giữa phố sách đoạn gần quảng trường mini.",
        "tip": "Ngồi tựa lưng, chụp góc ngang với hậu cảnh là các gian nhà gỗ."
      },
      {
        "name": "Góc hiên nhà sách vách kính phản chiếu",
        "howToFind": "Bên ngoài các gian sách Nhã Nam hoặc Kim Đồng.",
        "tip": "Chụp lúc nắng phản chiếu bóng lá cây lên mặt kính trong veo."
      }
    ],
    "poses": [
      {
        "title": "Cùng đọc chung một cuốn sách mở",
        "desc": "Hai người cùng cầm một trang sách, chàng ghé tai thì thầm với nàng."
      },
      {
        "title": "Chọn sách qua ô cửa kính",
        "desc": "Chụp từ bên ngoài cửa kính vào trong khi người yêu đang say sưa ngắm sách."
      }
    ],
    "outfit": {
      "palette": [
        "#D4A373",
        "#CCD5AE",
        "#E9EDC9",
        "#FAEDCD"
      ],
      "tonSurTon": "Tông nâu be, kem sữa hoặc xanh olive nhẹ nhàng chuẩn phong cách Morigirl.",
      "contrast": "Chàng diện sơ mi trắng quần tây xám; nàng diện đầm suông vải đũi.",
      "avoid": "Tránh trang phục màu dạ quang hoặc giày cao gót nhọn khó đi bộ lâu.",
      "weatherTip": "Tán cây cổ thụ râm mát, trời thu Hà Nội đi dạo ở đây là chuẩn bài nhất."
    },
    "tips": "Gửi xe ở hai đầu phố sách (phía đường Lý Thường Kiệt hoặc Hai Bà Trưng). Có các quán cafe sách ngồi đọc rất chill.",
    "nearbyIds": []
  },
  {
    "id": "p16",
    "coverUrl": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=80",
    "media": [
      {
        "id": "med_pot_1",
        "type": "image",
        "platform": "unsplash",
        "url": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1080&q=80",
        "embedId": null,
        "caption": "Bàn xoay gốm thủ công ấm áp",
        "credit": "Unsplash Pottery",
        "sourceUrl": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1080&q=80",
        "licenseNote": "Unsplash License",
        "license": "licensed",
        "sortOrder": 0
      },
      {
        "id": "med_v_p16",
        "type": "video",
        "platform": "youtube",
        "url": "https://www.youtube.com/watch?v=EsxxKA4xdEA",
        "embedId": "EsxxKA4xdEA",
        "caption": "Trải nghiệm hẹn hò nặn gốm tình yêu tại Hà Nội",
        "credit": "DateMate Review",
        "sourceUrl": "https://www.youtube.com/watch?v=EsxxKA4xdEA",
        "licenseNote": "YouTube Embed",
        "license": "embed_only",
        "sortOrder": 10
      }
    ],
    "slug": "workshop-lam-gom-bat-trang-moment",
    "name": "Workshop Gốm Bát Tràng Moment",
    "area": "Ba Đình",
    "category": "fun",
    "categoryLabel": "Khu vui chơi & Workshop",
    "priceLevel": 2,
    "costText": "150k - 220k/sản phẩm",
    "moods": [
      "fun",
      "romantic",
      "indoor"
    ],
    "moodLabels": [
      "Vui chơi",
      "Lãng mạn",
      "Trong nhà"
    ],
    "indoor": true,
    "status": "published",
    "lat": 21.0312,
    "lng": 105.8225,
    "bestTimeText": "Hợp đi lúc 14:00 - 17:00 nha",
    "goldenMorning": "09:30 - 11:30",
    "goldenAfternoon": "14:00 - 17:00",
    "blueHour": "17:30 - 19:00",
    "bestWeekdays": "Thứ 2 - Thứ 6 để được thợ hướng dẫn kỹ",
    "avoidWeekdays": "Sáng Chủ Nhật đông nhóm bạn trẻ",
    "summary": "Tự tay xoay bàn gốm, cùng người yêu nhào nặn chiếc cốc đôi độc nhất vô nhị và khắc chữ kỷ niệm tình yêu nung mang về.",
    "coverGradient": "from-[#8B4513] via-[#CD853F] to-[#DEB887]",
    "emoji": "🏺",
    "photoSpots": [
      {
        "name": "Bàn xoay gốm với đôi bàn tay vấy đất sét",
        "howToFind": "Khu vực bàn xoay trung tâm của xưởng gốm.",
        "tip": "Chụp cận cảnh hai bàn tay lồng vào nhau đang nắn vuốt khối đất xoay tròn."
      },
      {
        "name": "Kệ gốm mộc thành phẩm",
        "howToFind": "Kệ gỗ phía sau xưởng nơi xếp sản phẩm chờ nung.",
        "tip": "Đặt chiếc cốc có khắc ngày kỷ niệm của hai bạn lên kệ làm tâm điểm nét ảnh."
      }
    ],
    "poses": [
      {
        "title": "Cảnh Ghost kinh điển bên bàn xoay",
        "desc": "Chàng ngồi sau vòng tay qua người nàng cùng nắn vuốt khối đất sét trên bàn xoay."
      },
      {
        "title": "Nụ cười giơ thành phẩm cốc gốm",
        "desc": "Hai người cùng cầm chiếc cốc vừa tạo hình xong, cười tươi rạng rỡ với vết đất dính mũi."
      }
    ],
    "outfit": {
      "palette": [
        "#8B4513",
        "#D2B48C",
        "#F5DEB3",
        "#FFF8DC"
      ],
      "tonSurTon": "Trang phục màu đất, be kem đơn giản, xắn tay áo gọn gàng.",
      "contrast": "Áo thun trắng khoác tạp dề nâu canvas dày dặn do xưởng phát.",
      "avoid": "Tránh đeo đồng hồ kim loại đắt tiền hoặc nhẫn dễ dính đất sét.",
      "weatherTip": "Không gian quạt gió mát mẻ, không ngại mưa nắng bên ngoài."
    },
    "tips": "Sau khi vuốt gốm, xưởng sẽ nung tráng men và gửi về tận nhà cho hai bạn sau 7 ngày.",
    "nearbyIds": []
  },
  {
    "id": "p17",
    "coverUrl": "https://images.unsplash.com/photo-1545232979-fbf671158d3d?auto=format&fit=crop&w=1200&q=80",
    "media": [
      {
        "id": "med_bw_1",
        "type": "image",
        "platform": "unsplash",
        "url": "https://images.unsplash.com/photo-1545232979-fbf671158d3d?auto=format&fit=crop&w=1080&q=80",
        "embedId": null,
        "caption": "Đường lane bowling đèn neon rực rỡ",
        "credit": "Unsplash Bowling",
        "sourceUrl": "https://images.unsplash.com/photo-1545232979-fbf671158d3d?auto=format&fit=crop&w=1080&q=80",
        "licenseNote": "Unsplash License",
        "license": "licensed",
        "sortOrder": 0
      },
      {
        "id": "med_v_p17",
        "type": "video",
        "platform": "youtube",
        "url": "https://www.youtube.com/watch?v=joSbRvsbFI4",
        "embedId": "joSbRvsbFI4",
        "caption": "Hẹn hò ngày mưa: Thử tài ném bowling tại Royal City",
        "credit": "DateMate Review",
        "sourceUrl": "https://www.youtube.com/watch?v=joSbRvsbFI4",
        "licenseNote": "YouTube Embed",
        "license": "embed_only",
        "sortOrder": 10
      }
    ],
    "slug": "bowling-truot-bang-royal-city",
    "name": "Bowling & Trượt Băng Royal City",
    "area": "Thanh Xuân",
    "category": "fun",
    "categoryLabel": "Khu vui chơi & Giải trí",
    "priceLevel": 2,
    "costText": "120k - 250k/người",
    "moods": [
      "fun",
      "indoor"
    ],
    "moodLabels": [
      "Vui chơi",
      "Trong nhà"
    ],
    "indoor": true,
    "status": "published",
    "lat": 21.0028,
    "lng": 105.8157,
    "bestTimeText": "Hợp đi lúc 15:00 - 18:00 nha",
    "goldenMorning": "10:00 - 12:00",
    "goldenAfternoon": "14:30 - 18:00",
    "blueHour": "19:00 - 21:30 (Đèn UV rực rỡ)",
    "bestWeekdays": "Thứ 2 - Thứ 6 giá vé ưu đãi",
    "avoidWeekdays": "Tối Thứ 7 phải đợi lane bowling",
    "summary": "Tổ hợp ném bowling tranh điểm hào hứng và sân trượt băng tự nhiên trong nhà mát lạnh quanh năm cho buổi hẹn tràn ngập tiếng cười.",
    "coverGradient": "from-[#FF416C] via-[#FF4B2B] to-[#7918F2]",
    "emoji": "🎳",
    "photoSpots": [
      {
        "name": "Lane bowling dạ quang phản quang đèn neon",
        "howToFind": "Khu vực bowling Heroworld tầng B2.",
        "tip": "Bật chế độ chụp đêm, chụp lúc quả bóng bowling lao tới cụm pin gỗ."
      },
      {
        "name": "Sân trượt băng tự nhiên Ice Rink",
        "howToFind": "Ngay trung tâm tầng B2 đối diện quảng trường ngầm.",
        "tip": "Chụp lúc hai người đang nắm tay trượt lướt qua dải rào chắn tuyết."
      }
    ],
    "poses": [
      {
        "title": "High-five ăn mừng cú ném Strike",
        "desc": "Hai người cùng giơ tay đập tay nụ cười rạng rỡ sau cú ném đổ 10 quả pin."
      },
      {
        "title": "Nắm tay giữ thăng bằng trên băng",
        "desc": "Chàng khom lưng nắm hai tay nàng giúp nàng tập những bước trượt đầu tiên."
      }
    ],
    "outfit": {
      "palette": [
        "#FF4B2B",
        "#2B2D42",
        "#8D99AE",
        "#EDF2F4"
      ],
      "tonSurTon": "Phong cách thể thao Sporty năng động, quần jogger và áo hoodie đôi.",
      "contrast": "Áo thun trắng nổi bật dưới ánh đèn UV của sàn bowling.",
      "avoid": "Tránh đi giày cao gót hoặc váy ngắn không tiện vận động.",
      "weatherTip": "Sân băng nhiệt độ khoảng 16°C, bắt buộc mang theo áo khoác nỉ và tất cao cổ."
    },
    "tips": "Thuê giày bowling và giày trượt băng tại quầy vé. Nhớ mang theo tất riêng để tiết kiệm chi phí.",
    "nearbyIds": []
  },
  {
    "id": "p18",
    "coverUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
    "media": [
      {
        "id": "med_ast_1",
        "type": "image",
        "platform": "unsplash",
        "url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1080&q=80",
        "embedId": null,
        "caption": "Kiến trúc công viên chủ đề vũ trụ độc đáo",
        "credit": "Unsplash Space",
        "sourceUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1080&q=80",
        "licenseNote": "Unsplash License",
        "license": "licensed",
        "sortOrder": 0
      },
      {
        "id": "med_v_p18",
        "type": "video",
        "platform": "youtube",
        "url": "https://www.youtube.com/watch?v=PLR5bj-uQmY",
        "embedId": "PLR5bj-uQmY",
        "caption": "Check-in công viên thiên văn học siêu ảo tại Hà Đông",
        "credit": "DateMate Review",
        "sourceUrl": "https://www.youtube.com/watch?v=PLR5bj-uQmY",
        "licenseNote": "YouTube Embed",
        "license": "embed_only",
        "sortOrder": 10
      }
    ],
    "slug": "cong-vien-thien-van-hoc-ha-dong",
    "name": "Công Viên Thiên Văn Học",
    "area": "Hà Đông",
    "category": "walk",
    "categoryLabel": "Công viên & Không gian",
    "priceLevel": 1,
    "costText": "Miễn phí vào cổng",
    "moods": [
      "walk",
      "chill",
      "photo"
    ],
    "moodLabels": [
      "Đi dạo",
      "Chill",
      "Chụp ảnh"
    ],
    "indoor": false,
    "status": "published",
    "lat": 20.9785,
    "lng": 105.7482,
    "bestTimeText": "Hợp đi lúc 16:30 - 18:30 nha",
    "goldenMorning": "06:00 - 08:00 (Yên tĩnh tập thể dục)",
    "goldenAfternoon": "16:30 - 17:45 (Hoàng hôn trên hồ)",
    "blueHour": "18:00 - 19:30 (Cầu ánh sao bật đèn lung linh)",
    "bestWeekdays": "Chiều Thứ 2 - Thứ 6 ít đông",
    "avoidWeekdays": "Trưa nắng gắt ít bóng râm",
    "summary": "Công viên chủ đề thiên văn học ngoài trời độc đáo với cầu đi bộ mô phỏng dải ngân hà, hồ Bách Hợp Thủy và quảng trường 12 cung hoàng đạo.",
    "coverGradient": "from-[#0F2027] via-[#203A43] to-[#2C5364]",
    "emoji": "🪐",
    "photoSpots": [
      {
        "name": "Cầu đi bộ Ánh Sao vòm kim loại",
        "howToFind": "Bắc qua hồ Bách Hợp Thủy giữa công viên.",
        "tip": "Chụp lúc hoàng hôn khi đèn led trên cầu bắt đầu thắp sáng lấp lánh."
      },
      {
        "name": "Quảng trường 12 Cung Hoàng Đạo",
        "howToFind": "Khu vực sân tròn gần lối vào chính đường Tố Hữu.",
        "tip": "Tìm biểu tượng chòm sao hoàng đạo của chàng và nàng để chụp cận cảnh bàn chân đôi."
      }
    ],
    "poses": [
      {
        "title": "Tựa lan can cầu ngắm hoàng hôn",
        "desc": "Hai người cùng nhìn về hướng mặt trời lặn sau những tòa nhà cao tầng phía chân trời."
      },
      {
        "title": "Cùng chỉ tay ngắm bầu trời đêm",
        "desc": "Chàng chỉ tay lên vòm cầu ánh sao, nàng nghiêng đầu mỉm cười nhìn theo."
      }
    ],
    "outfit": {
      "palette": [
        "#14213D",
        "#FCA311",
        "#E5E5E5",
        "#FFFFFF"
      ],
      "tonSurTon": "Tông đen, xanh navy hoặc trắng tối giản phong cách Minimalist hiện đại.",
      "contrast": "Trang phục màu trắng tinh khôi nổi bật giữa nền kiến trúc kim loại và mặt hồ.",
      "avoid": "Tránh giày cao gót vì công viên rất rộng cần đi bộ nhiều.",
      "weatherTip": "Khuôn viên sát hồ gió lộng, nên chuẩn bị áo khoác nhẹ vào buổi tối."
    },
    "tips": "Gửi xe máy tại cổng số 2 công viên. Hoàng hôn ở đây rất rộng và thoáng đãng.",
    "nearbyIds": []
  },
  {
    "id": "p19",
    "coverUrl": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
    "media": [
      {
        "id": "med_fd_1",
        "type": "image",
        "platform": "unsplash",
        "url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1080&q=80",
        "embedId": null,
        "caption": "Bữa ăn ấm áp đầy hương vị phố cổ",
        "credit": "Unsplash Food",
        "sourceUrl": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1080&q=80",
        "licenseNote": "Unsplash License",
        "license": "licensed",
        "sortOrder": 0
      },
      {
        "id": "med_v_p19",
        "type": "video",
        "platform": "youtube",
        "url": "https://www.youtube.com/watch?v=DtLbnuR7n5I",
        "embedId": "DtLbnuR7n5I",
        "caption": "Food tour phố đêm Tống Duy Tân cùng người yêu",
        "credit": "DateMate Review",
        "sourceUrl": "https://www.youtube.com/watch?v=DtLbnuR7n5I",
        "licenseNote": "YouTube Embed",
        "license": "embed_only",
        "sortOrder": 10
      }
    ],
    "slug": "pho-am-thuc-tong-duy-tan-ngo-cam",
    "name": "Phố Ẩm Thực Tống Duy Tân",
    "area": "Hoàn Kiếm",
    "category": "food",
    "categoryLabel": "Ẩm thực & Phố đêm",
    "priceLevel": 1,
    "costText": "80k - 180k/người",
    "moods": [
      "food",
      "chill",
      "fun"
    ],
    "moodLabels": [
      "Ẩm thực",
      "Chill",
      "Vui chơi"
    ],
    "indoor": false,
    "status": "published",
    "lat": 21.0307,
    "lng": 105.8436,
    "bestTimeText": "Hợp đi lúc 18:30 - 22:30 nha",
    "goldenMorning": "Không mở ban sáng",
    "goldenAfternoon": "17:30 - 18:30 (Phố bắt đầu lên đèn)",
    "blueHour": "18:30 - 20:00 (Giờ ăn tối rực rỡ nhất)",
    "bestWeekdays": "Mọi tối trong tuần",
    "avoidWeekdays": "Tối Thứ 7 cần gửi xe xa một chút",
    "summary": "Con phố ẩm thực đêm nhộn nhịp nhất thủ đô, nổi tiếng với món gà tần thuốc bắc, xôi chim, mì xào giòn và ốc nóng hổi bên ánh đèn lồng.",
    "coverGradient": "from-[#8E0E00] via-[#1F1C18] to-[#E52D27]",
    "emoji": "🍲",
    "photoSpots": [
      {
        "name": "Đầu ngõ Tống Duy Tân rực rỡ biển hiệu",
        "howToFind": "Giao cắt giữa phố Trần Phú và Tống Duy Tân.",
        "tip": "Chụp với hiệu ứng đèn xe và bảng hiệu neon nhấp nháy phong cách Wong Kar-wai."
      },
      {
        "name": "Bàn ăn vỉa hè bốc khói ấm cúng",
        "howToFind": "Các quán gà tần lon hoặc ốc nóng gia truyền.",
        "tip": "Chụp cận cảnh tô gà tần bốc khói ngun ngút với biểu cảm thèm thuồng của đối phương."
      }
    ],
    "poses": [
      {
        "title": "Gắp đồ ăn cho người yêu",
        "desc": "Chàng tươi cười gắp miếng đùi gà tần vào bát nàng, bắt trọn khoảnh khắc ấm áp."
      },
      {
        "title": "Cùng thổi nguội thìa cháo nóng",
        "desc": "Hai người cùng cúi đầu thổi thìa nước dùng sóng sánh nghi ngút khói thơm."
      }
    ],
    "outfit": {
      "palette": [
        "#1F1C18",
        "#8E0E00",
        "#FAF0E6",
        "#C0392B"
      ],
      "tonSurTon": "Trang phục dạo phố thoải mái, áo khoác denim hoặc bomber jacket khỏe khoắn.",
      "contrast": "Tông đỏ mận hoặc đen huyền bí phong cách Hong Kong cinema.",
      "avoid": "Tránh trang phục màu trắng tinh dễ bị vấy sốt ăn uống.",
      "weatherTip": "Đặc biệt ấm lòng trong những tối mùa thu se lạnh hay đông lạnh."
    },
    "tips": "Nên thử gà tần lon Cây Si hoặc xôi chiên bà Hoa. Đi xe máy gửi ngay đầu ngõ 10k.",
    "nearbyIds": []
  },
  {
    "id": "p20",
    "coverUrl": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
    "media": [
      {
        "id": "med_cn_1",
        "type": "image",
        "platform": "unsplash",
        "url": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1080&q=80",
        "embedId": null,
        "caption": "Rạp chiếu phim lãng mạn ánh sáng ấm áp",
        "credit": "Unsplash Cinema",
        "sourceUrl": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1080&q=80",
        "licenseNote": "Unsplash License",
        "license": "licensed",
        "sortOrder": 0
      },
      {
        "id": "med_v_p20",
        "type": "video",
        "platform": "youtube",
        "url": "https://www.youtube.com/watch?v=7MHD91GBeUw",
        "embedId": "7MHD91GBeUw",
        "caption": "Trải nghiệm hẹn hò xem phim rạp Sweetbox ghế đôi",
        "credit": "DateMate Review",
        "sourceUrl": "https://www.youtube.com/watch?v=7MHD91GBeUw",
        "licenseNote": "YouTube Embed",
        "license": "embed_only",
        "sortOrder": 10
      }
    ],
    "slug": "rap-chieu-phim-lotte-sweetbox-lieu-giai",
    "name": "Rạp Phim Lotte Sweetbox Liễu Giai",
    "area": "Ba Đình",
    "category": "indoor",
    "categoryLabel": "Giải trí trong nhà",
    "priceLevel": 2,
    "costText": "220k - 300k/ghế đôi",
    "moods": [
      "romantic",
      "indoor"
    ],
    "moodLabels": [
      "Lãng mạn",
      "Trong nhà"
    ],
    "indoor": true,
    "status": "published",
    "lat": 21.0326,
    "lng": 105.8125,
    "bestTimeText": "Hợp đi các suất chiếu lúc 17:00 hoặc 19:30 nha",
    "goldenMorning": "10:30 - 12:30",
    "goldenAfternoon": "14:30 - 17:00",
    "blueHour": "18:00 - 21:00",
    "bestWeekdays": "Thứ 4 ưu đãi thành viên",
    "avoidWeekdays": "Tối Thứ 7 cần đặt vé sớm tránh hết ghế đẹp",
    "summary": "Không gian rạp chiếu cao cấp với ghế đôi vách ngăn riêng tư, màn hình cong cực nét và combo bắp nước ngọt ngào cho ngày mưa gió.",
    "coverGradient": "from-[#141E30] via-[#243B55] to-[#E52D27]",
    "emoji": "🎬",
    "photoSpots": [
      {
        "name": "Sảnh chờ tráng gương Lotte Center tầng 6",
        "howToFind": "Khu vực quầy vé sảnh chính rạp phim.",
        "tip": "Chụp bắt góc gương trần phản chiếu ánh đèn chùm pha lê lộng lẫy."
      },
      {
        "name": "Cầm cặp vé và hộp bắp rang bơ đôi",
        "howToFind": "Trước poster bộ phim hai người cùng xem.",
        "tip": "Chụp cận cảnh hai bàn tay chạm nhau cầm hộp bắp caramel thơm phức."
      }
    ],
    "poses": [
      {
        "title": "Tựa đầu ngọt ngào chờ suất chiếu",
        "desc": "Nàng tựa đầu vào vai chàng ở sofa sảnh chờ, xem trailer trên điện thoại."
      },
      {
        "title": "Cầm 2 tấm vé kỷ niệm",
        "desc": "Hai người cùng giơ tấm vé xem phim che nửa khuôn mặt cười tinh nghịch."
      }
    ],
    "outfit": {
      "palette": [
        "#1F1C18",
        "#8E0E00",
        "#FAF0E6",
        "#C0392B"
      ],
      "tonSurTon": "Trang phục thanh lịch, áo len mỏng hoặc cardigan phối chân váy dài.",
      "contrast": "Sơ mi tối màu lịch lãm cho bạn nam, váy liền hoa nhí nữ tính cho bạn nữ.",
      "avoid": "Tránh mặc đồ quá phong phanh vì phòng chiếu có điều hòa khá lạnh.",
      "weatherTip": "Phương án số 1 hoàn hảo cho những ngày Hà Nội mưa dầm dề hoặc rét đậm."
    },
    "tips": "Đặt trước ghế Sweetbox ở hàng E hoặc F trung tâm để có tầm nhìn mắt chuẩn nhất.",
    "nearbyIds": []
  },
  {
    "id": "p21",
    "coverUrl": "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?auto=format&fit=crop&w=1200&q=80",
    "media": [
      {
        "id": "med_op_1",
        "type": "image",
        "platform": "unsplash",
        "url": "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?auto=format&fit=crop&w=1080&q=80",
        "embedId": null,
        "caption": "Kiến trúc Nhà hát Opera tráng lệ dưới ánh đèn",
        "credit": "Unsplash Opera",
        "sourceUrl": "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?auto=format&fit=crop&w=1080&q=80",
        "licenseNote": "Unsplash License",
        "license": "licensed",
        "sortOrder": 0
      },
      {
        "id": "med_v_p21",
        "type": "video",
        "platform": "youtube",
        "url": "https://www.youtube.com/watch?v=1CNtVWPGwpg",
        "embedId": "1CNtVWPGwpg",
        "caption": "Hẹn hò ăn kem Tràng Tiền ngắm Nhà Hát Lớn lên đèn",
        "credit": "DateMate Review",
        "sourceUrl": "https://www.youtube.com/watch?v=1CNtVWPGwpg",
        "licenseNote": "YouTube Embed",
        "license": "embed_only",
        "sortOrder": 10
      }
    ],
    "slug": "nha-hat-lon-ha-noi-vuon-hoa-co-tan",
    "name": "Nhà Hát Lớn & Vườn Hoa Cổ Tân",
    "area": "Hoàn Kiếm",
    "category": "photo",
    "categoryLabel": "Kiến trúc & Di sản",
    "priceLevel": 1,
    "costText": "Miễn phí dạo chụp • Kem 15k",
    "moods": [
      "photo",
      "romantic",
      "walk"
    ],
    "moodLabels": [
      "Chụp ảnh",
      "Lãng mạn",
      "Đi dạo"
    ],
    "indoor": false,
    "status": "published",
    "lat": 21.0242,
    "lng": 105.8576,
    "bestTimeText": "Hợp đi lúc 16:30 hoặc 19:30 nha",
    "goldenMorning": "06:30 - 08:30",
    "goldenAfternoon": "16:30 - 17:45 (Nắng vàng dát lên tường vàng)",
    "blueHour": "18:00 - 19:00 (Nhà hát lên đèn vàng lộng lẫy)",
    "bestWeekdays": "Chiều Thứ 2 - Thứ 6 ít đông",
    "avoidWeekdays": "Tối Thứ 7 cấm xe phố đi bộ",
    "summary": "Công trình biểu tượng kiến trúc Phục Hưng Pháp tráng lệ, điểm hẹn kinh điển để ăn que kem Tràng Tiền và chụp những bức ảnh thanh xuân.",
    "coverGradient": "from-[#F2994A] via-[#F2C94C] to-[#E2B714]",
    "emoji": "🎭",
    "photoSpots": [
      {
        "name": "Bậc thềm đá trước mặt tiền Nhà Hát Lớn",
        "howToFind": "Phía trước sảnh chính hướng ra quảng trường Cách Mạng Tháng 8.",
        "tip": "Chụp góc thấp hất lên lấy trọn những hàng cột Corinth và mái ngói đá đen tráng lệ."
      },
      {
        "name": "Vườn hoa Cổ Tân đối diện",
        "howToFind": "Vườn hoa nhỏ bên hông nhà hát phía phố Tràng Tiền.",
        "tip": "Ngồi ghế đá rợp bóng cây cổ thụ nhìn sang tháp chuông nhà hát."
      }
    ],
    "poses": [
      {
        "title": "Nắm tay bước trên bậc thềm đá",
        "desc": "Chàng dắt tay nàng bước xuống thềm đá phong cách điện ảnh lãng mạn."
      },
      {
        "title": "Cụng que kem Tràng Tiền",
        "desc": "Hai người cùng cầm que kem ốc quế cười giòn tan trước bậc thềm."
      }
    ],
    "outfit": {
      "palette": [
        "#FAF0CA",
        "#0D3B66",
        "#F4D35E",
        "#EE964B"
      ],
      "tonSurTon": "Váy tiểu thư trắng tinh khôi hoặc sơ mi cổ điển phong cách Pháp.",
      "contrast": "Chàng diện vest blazer xanh navy, nàng váy đỏ đô quyến rũ.",
      "avoid": "Tránh trang phục thể thao luộm thuộm không hợp nét quý phái của nhà hát.",
      "weatherTip": "Hoàng hôn ở đây nắng chiều chiếu xiên lên tường vàng rực rỡ tuyệt mỹ."
    },
    "tips": "Gửi xe máy tại phố Đinh Lễ hoặc hầm Tràng Tiền Plaza ngay gần đó.",
    "nearbyIds": []
  },
  {
    "id": "p22",
    "coverUrl": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    "media": [
      {
        "id": "med_fl_1",
        "type": "image",
        "platform": "unsplash",
        "url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1080&q=80",
        "embedId": null,
        "caption": "Bình minh trên đồi hoa bát ngát ven hồ",
        "credit": "Unsplash Meadow",
        "sourceUrl": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1080&q=80",
        "licenseNote": "Unsplash License",
        "license": "licensed",
        "sortOrder": 0
      },
      {
        "id": "med_v_p22",
        "type": "video",
        "platform": "youtube",
        "url": "https://www.youtube.com/watch?v=T-kYvslKj9Y",
        "embedId": "T-kYvslKj9Y",
        "caption": "Check-in thung lũng hoa Hồ Tây mùa đẹp nhất",
        "credit": "DateMate Review",
        "sourceUrl": "https://www.youtube.com/watch?v=T-kYvslKj9Y",
        "licenseNote": "YouTube Embed",
        "license": "embed_only",
        "sortOrder": 10
      }
    ],
    "slug": "thung-lung-hoa-ho-tay-nhat-tan",
    "name": "Thung Lũng Hoa Hồ Tây",
    "area": "Tây Hồ",
    "category": "nature",
    "categoryLabel": "Thiên nhiên & Đồi hoa",
    "priceLevel": 2,
    "costText": "100k - 120k/người",
    "moods": [
      "photo",
      "romantic",
      "nature"
    ],
    "moodLabels": [
      "Chụp ảnh",
      "Lãng mạn",
      "Thiên nhiên"
    ],
    "indoor": false,
    "status": "published",
    "lat": 21.0682,
    "lng": 105.8194,
    "bestTimeText": "Hợp đi lúc 08:00 hoặc 15:30 nha",
    "goldenMorning": "07:30 - 09:30",
    "goldenAfternoon": "15:30 - 17:30",
    "blueHour": "17:45 - 18:15",
    "bestWeekdays": "Sáng Thứ 2 - Thứ 6 để có cả đồi hoa riêng mình",
    "avoidWeekdays": "Trưa nắng gắt hoặc ngày lễ đông nghẹt",
    "summary": "Thiên đường hoa ngát hương ven hồ với đồi hoa tam giác mạch, hoa cánh bướm, cối xay gió và góc picnic ngắm hoàng hôn thênh thang.",
    "coverGradient": "from-[#FF9A9E] via-[#FECFEF] to-[#A1C4FD]",
    "emoji": "🌸",
    "photoSpots": [
      {
        "name": "Đồi hoa cánh bướm rực rỡ sắc màu",
        "howToFind": "Khu vực trung tâm thung lũng hướng ra hồ Tây.",
        "tip": "Hạ thấp góc máy ngang tầm hoa để hoa làm mờ tiền cảnh lung linh."
      },
      {
        "name": "Cối xay gió phong cách Hà Lan",
        "howToFind": "Đỉnh đồi thoải giữa bạt ngàn hoa tím.",
        "tip": "Chụp góc rộng thu trọn bầu trời mây trắng và thảm hoa bát ngát."
      }
    ],
    "poses": [
      {
        "title": "Cài nhành hoa lên tai",
        "desc": "Chàng dịu dàng cài nhành hoa lên tóc nàng, nàng cúi đầu mỉm cười thẹn thùng."
      },
      {
        "title": "Nắm tay bước giữa luống hoa",
        "desc": "Hai người cùng bước đi giữa lối đi nhỏ trong luống hoa, tay trong tay đung đưa."
      }
    ],
    "outfit": {
      "palette": [
        "#FFB6C1",
        "#FFF0F5",
        "#E6E6FA",
        "#98FB98"
      ],
      "tonSurTon": "Váy maxi hoa nhí bồng bềnh, mũ cói mềm, tone pastel thơ mộng.",
      "contrast": "Nàng váy trắng tinh khôi, chàng sơ mi đũi màu be kem mộc mạc.",
      "avoid": "Tránh đi giày cao gót nhọn vì đất vườn hoa mềm dễ lún.",
      "weatherTip": "Thời tiết mùa xuân và thu hoa nở rộ đẹp nhất trong năm."
    },
    "tips": "Trong khuôn viên có dịch vụ cho thuê trang phục truyền thống và đồ uống picnic.",
    "nearbyIds": []
  },
  {
    "id": "p23",
    "coverUrl": "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1200&q=80",
    "media": [
      {
        "id": "med_tcs_1",
        "type": "image",
        "platform": "unsplash",
        "url": "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1080&q=80",
        "embedId": null,
        "caption": "Không gian đi bộ thanh bình ven hồ ngập hoa",
        "credit": "Unsplash Walk",
        "sourceUrl": "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1080&q=80",
        "licenseNote": "Unsplash License",
        "license": "licensed",
        "sortOrder": 0
      },
      {
        "id": "med_v_p23",
        "type": "video",
        "platform": "youtube",
        "url": "https://www.youtube.com/watch?v=gIhIdsKjT5E",
        "embedId": "gIhIdsKjT5E",
        "caption": "Khám phá phố đi bộ Trịnh Công Sơn lãng mạn bên hồ Tây",
        "credit": "DateMate Review",
        "sourceUrl": "https://www.youtube.com/watch?v=gIhIdsKjT5E",
        "licenseNote": "YouTube Embed",
        "license": "embed_only",
        "sortOrder": 10
      }
    ],
    "slug": "pho-di-bo-trinh-cong-son-cho-hoa-quang-an",
    "name": "Phố Đi Bộ Trịnh Công Sơn",
    "area": "Tây Hồ",
    "category": "walk",
    "categoryLabel": "Phố đi bộ & Đầm sen",
    "priceLevel": 1,
    "costText": "Miễn phí dạo phố • Mua hoa 50k",
    "moods": [
      "walk",
      "chill",
      "romantic"
    ],
    "moodLabels": [
      "Đi dạo",
      "Chill",
      "Lãng mạn"
    ],
    "indoor": false,
    "status": "published",
    "lat": 21.0691,
    "lng": 105.8188,
    "bestTimeText": "Hợp đi lúc 17:00 hoặc 20:00 nha",
    "goldenMorning": "06:00 - 08:00 (Ngắm hoa sen sớm nở)",
    "goldenAfternoon": "16:45 - 17:45",
    "blueHour": "18:00 - 19:30 (Đèn lồng thắp sáng bờ hồ)",
    "bestWeekdays": "Tối Thứ 6 - Chủ Nhật có hoạt động âm nhạc đường phố",
    "avoidWeekdays": "Trưa hè nắng chang chang",
    "summary": "Con đường nghệ thuật ven đầm sen Tây Hồ êm đềm, kết hợp ghé chợ hoa đêm ngập tràn sắc hương sen tây và cúc họa mi lúc lên đèn.",
    "coverGradient": "from-[#4568DC] via-[#B06AB3] to-[#F80759]",
    "emoji": "🪷",
    "photoSpots": [
      {
        "name": "Con đường ô dù sắc màu trên cao",
        "howToFind": "Đoạn giữa phố đi bộ Trịnh Công Sơn.",
        "tip": "Chụp góc hất lên bầu trời ngắm những vòm ô bay rực rỡ sắc màu."
      },
      {
        "name": "Cầu gỗ đầm sen Tây Hồ",
        "howToFind": "Phía cuối phố đi bộ hướng ra đầm sen tự nhiên.",
        "tip": "Ngồi sát mép cầu gỗ, chụp lúc hoàng hôn phản chiếu dải lụa mây cam đỏ."
      }
    ],
    "poses": [
      {
        "title": "Tặng nàng bó sen ngát hương",
        "desc": "Chàng trao tay nàng bó sen thơm vừa mua, nàng ôm bó hoa khẽ mỉm cười."
      },
      {
        "title": "Nắm tay sải bước dưới đèn lồng",
        "desc": "Bật chế độ chụp liên tục, hai người cùng rảo bước cười nói tự nhiên."
      }
    ],
    "outfit": {
      "palette": [
        "#D8B4E2",
        "#AEB8FE",
        "#F9F871",
        "#FFEAA7"
      ],
      "tonSurTon": "Trang phục dạo mát nhẹ nhàng, váy suông linen hoặc quần ống rộng.",
      "contrast": "Áo sơ mi hoa văn nhiệt đới hoặc áo thun pastel trẻ trung.",
      "avoid": "Tránh trang phục gò bó công sở.",
      "weatherTip": "Gió đầm sen mát rười rượi quanh năm."
    },
    "tips": "Khu vực có các quầy trà sen Tây Hồ gia truyền rất đáng thử.",
    "nearbyIds": []
  },
  {
    "id": "p24",
    "coverUrl": "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80",
    "media": [
      {
        "id": "med_vcca_1",
        "type": "image",
        "platform": "unsplash",
        "url": "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1080&q=80",
        "embedId": null,
        "caption": "Không gian triển lãm nghệ thuật tối giản đương đại",
        "credit": "Unsplash Art",
        "sourceUrl": "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1080&q=80",
        "licenseNote": "Unsplash License",
        "license": "licensed",
        "sortOrder": 0
      },
      {
        "id": "med_v_p24",
        "type": "video",
        "platform": "youtube",
        "url": "https://www.youtube.com/watch?v=qhbsTtqGyo8",
        "embedId": "qhbsTtqGyo8",
        "caption": "Triển lãm nghệ thuật VCCA - Điểm hẹn hò cuối tuần không tốn 1 xu",
        "credit": "DateMate Review",
        "sourceUrl": "https://www.youtube.com/watch?v=qhbsTtqGyo8",
        "licenseNote": "YouTube Embed",
        "license": "embed_only",
        "sortOrder": 10
      }
    ],
    "slug": "trung-tam-nghe-thuat-duong-dai-vcca",
    "name": "Trung Tâm Nghệ Thuật Đương Đại VCCA",
    "area": "Thanh Xuân",
    "category": "indoor",
    "categoryLabel": "Triển lãm & Nghệ thuật",
    "priceLevel": 1,
    "costText": "Miễn phí vé vào cửa",
    "moods": [
      "photo",
      "chill",
      "indoor"
    ],
    "moodLabels": [
      "Chụp ảnh",
      "Chill",
      "Trong nhà"
    ],
    "indoor": true,
    "status": "published",
    "lat": 21.0025,
    "lng": 105.8152,
    "bestTimeText": "Hợp đi lúc 10:00 hoặc 15:00 nha",
    "goldenMorning": "10:00 - 12:00",
    "goldenAfternoon": "14:00 - 17:00",
    "blueHour": "18:00 - 20:30 (Ánh sáng triển lãm nổi bật)",
    "bestWeekdays": "Thứ 3 - Thứ 6 để không gian tĩnh lặng",
    "avoidWeekdays": "Chiều Chủ Nhật đông bạn trẻ xếp hàng chụp ảnh",
    "summary": "Bảo tàng nghệ thuật ngầm đạt chuẩn quốc tế với các triển lãm sắp đặt ánh sáng, điêu khắc trừu tượng và không gian tối giản cực chất.",
    "coverGradient": "from-[#000000] via-[#434343] to-[#8E9EAB]",
    "emoji": "🎨",
    "photoSpots": [
      {
        "name": "Bức tường trắng tối giản logo VCCA",
        "howToFind": "Ngay sảnh vào triển lãm tầng B1.",
        "tip": "Đứng cách tường 2m, chụp toàn thân góc rộng lấy mảng tường trắng vô tận."
      },
      {
        "name": "Khu vực nghệ thuật ánh sáng tương tác",
        "howToFind": "Phòng tối chiếu máy chiếu đa điểm bên trong triển lãm.",
        "tip": "Chụp silhouette lấy bóng đen cơ thể tương phản với vệt sáng trừu tượng."
      }
    ],
    "poses": [
      {
        "title": "Bóng lưng đôi chiêm nghiệm tác phẩm",
        "desc": "Hai người đứng sát nhau nhìn vào bức tranh lớn, chụp góc 3/4 từ phía sau."
      },
      {
        "title": "Soi bóng qua mặt gương nghệ thuật",
        "desc": "Chụp phản chiếu hình ảnh hai người qua tác phẩm gương sắp đặt trừu tượng."
      }
    ],
    "outfit": {
      "palette": [
        "#000000",
        "#FFFFFF",
        "#708090",
        "#DCDCDC"
      ],
      "tonSurTon": "Phong cách Monochrome trắng đen tối giản hoặc All-Black cá tính.",
      "contrast": "Nàng diện váy đen cut-out tinh tế, chàng sơ mi đen hoặc áo cổ lọ xám.",
      "avoid": "Tránh trang phục màu sắc quá sặc sỡ làm át đi màu của các tác phẩm nghệ thuật.",
      "weatherTip": "Không gian máy lạnh trung tâm mát lạnh, cực kỳ thoải mái."
    },
    "tips": "Miễn phí vé hoàn toàn. Chú ý không chạm tay vào các hiện vật triển lãm.",
    "nearbyIds": []
  }
];

export { HIDDEN_SAFETY_PLACE } from "./constants/catalog";
