/**
 * KHO ẢNH HẸN HÒ CHẤT LƯỢNG CAO 100% TỪ UNSPLASH (UNSPLASH LICENSE)
 * Phân chia theo Danh mục (Category) & 4 Góc nhìn thực tế (Angles):
 * 1. Overview: Không gian tổng quan / Mặt tiền / Kiến trúc
 * 2. Table: Bàn hẹn hò đôi / Ánh sáng ấm cúng / Sự riêng tư
 * 3. Detail: Thức uống / Món ăn / Chi tiết tinh tế
 * 4. Aesthetic: Góc check-in sống ảo / View hoàng hôn / Ban công
 */

export interface UnsplashPhotoItem {
  url: string;
  caption: string;
  credit: string;
  angle: "overview" | "table" | "detail" | "aesthetic";
}

export const UNSPLASH_CATEGORY_POOLS: Record<string, UnsplashPhotoItem[]> = {
  cafe: [
    // Góc 1: Overview
    {
      url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
      caption: "Không gian quán cà phê cổ điển mang hơi thở hoài niệm",
      credit: "Petr Sevcovic / Unsplash",
      angle: "overview",
    },
    {
      url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
      caption: "Mặt tiền thoáng đãng ngập tràn ánh sáng tự nhiên",
      credit: "Daiki F / Unsplash",
      angle: "overview",
    },
    {
      url: "https://images.unsplash.com/photo-1445116572660-238413488f6a?auto=format&fit=crop&w=1200&q=80",
      caption: "Khoảng sân vườn xanh mát yên tĩnh giữa lòng phố",
      credit: "Kari Shea / Unsplash",
      angle: "overview",
    },
    // Góc 2: Table
    {
      url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
      caption: "Bàn đôi ấm cúng bên ánh đèn vàng dịu nhẹ",
      credit: "Jason Leung / Unsplash",
      angle: "table",
    },
    {
      url: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80",
      caption: "Góc bàn cửa sổ đón nắng chiều nhẹ nhàng",
      credit: "Ali Yahya / Unsplash",
      angle: "table",
    },
    {
      url: "https://images.unsplash.com/photo-1497636577773-f1231844b336?auto=format&fit=crop&w=1200&q=80",
      caption: "Góc ngồi riêng tư cho những câu chuyện thân mật",
      credit: "Dan Gold / Unsplash",
      angle: "table",
    },
    // Góc 3: Detail
    {
      url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
      caption: "Tách cà phê thủ công thơm nồng và bánh ngọt nhẹ",
      credit: "Nathan Dumlao / Unsplash",
      angle: "detail",
    },
    {
      url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80",
      caption: "Ly Latte art tỉ mỉ và thức uống mát lành",
      credit: "Cyril Saulnier / Unsplash",
      angle: "detail",
    },
    {
      url: "https://images.unsplash.com/photo-1509785307050-d4066910ec1e?auto=format&fit=crop&w=1200&q=80",
      caption: "Thực đơn tráng miệng ngọt ngào cho buổi hẹn đầu",
      credit: "Demi DeHerrera / Unsplash",
      angle: "detail",
    },
    // Góc 4: Aesthetic
    {
      url: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1200&q=80",
      caption: "Ban công tầng thượng view ngắm hoàng hôn rực rỡ",
      credit: "Alisa Anton / Unsplash",
      angle: "aesthetic",
    },
    {
      url: "https://images.unsplash.com/photo-1525610553991-2bede1a236e2?auto=format&fit=crop&w=1200&q=80",
      caption: "Góc check-in vintage cực thơ mộng cho các cặp đôi",
      credit: "Brooke Cagle / Unsplash",
      angle: "aesthetic",
    },
    {
      url: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1200&q=80",
      caption: "Khoảnh khắc lên đèn lung linh khi trời chập tối",
      credit: "Roman Bozhko / Unsplash",
      angle: "aesthetic",
    },
  ],

  food: [
    // Góc 1: Overview
    {
      url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
      caption: "Không gian nhà hàng thanh lịch, phong cách kiến trúc tinh tế",
      credit: "Jay Wennington / Unsplash",
      angle: "overview",
    },
    {
      url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
      caption: "Bầu không khí ẩm thực ấm áp và sang trọng",
      credit: "Jason Leung / Unsplash",
      angle: "overview",
    },
    {
      url: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
      caption: "Thiết kế hiện đại kết hợp chất liệu mộc mạc",
      credit: "Klara Kulikova / Unsplash",
      angle: "overview",
    },
    // Góc 2: Table
    {
      url: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1200&q=80",
      caption: "Bàn tiệc đôi lãng mạn thắp nến lung linh cho tối kỷ niệm",
      credit: "Nils Stahl / Unsplash",
      angle: "table",
    },
    {
      url: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=1200&q=80",
      caption: "Góc bàn riêng tư yên tĩnh bên khung cửa sổ kính lớn",
      credit: "Roman Bozhko / Unsplash",
      angle: "table",
    },
    {
      url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
      caption: "Bàn ăn ấm cúng trọn vẹn sự kết nối cho hai người",
      credit: "Stefan Johnson / Unsplash",
      angle: "table",
    },
    // Góc 3: Detail
    {
      url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80",
      caption: "Món khai vị tươi ngon và bắt mắt",
      credit: "Danijela Prijovic / Unsplash",
      angle: "detail",
    },
    {
      url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
      caption: "Món chính hấp dẫn với hương vị tinh tế",
      credit: "Lily Banse / Unsplash",
      angle: "detail",
    },
    {
      url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80",
      caption: "Ly rượu vang và tráng miệng hoàn hảo cho buổi tối",
      credit: "Hermes Rivera / Unsplash",
      angle: "detail",
    },
    // Góc 4: Aesthetic
    {
      url: "https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=1200&q=80",
      caption: "Góc quầy bar mở ngắm đầu bếp chế biến trực tiếp",
      credit: "Rene Asmussen / Unsplash",
      angle: "aesthetic",
    },
    {
      url: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80",
      caption: "Ánh đèn vàng dịu nhẹ tạo nên bức hình check-in hoàn hảo",
      credit: "Unsplash Foodies",
      angle: "aesthetic",
    },
  ],

  fun: [
    // Góc 1: Overview
    {
      url: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80",
      caption: "Không gian giải trí & cocktail bar lung linh huyền ảo",
      credit: "Alexander Popov / Unsplash",
      angle: "overview",
    },
    {
      url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
      caption: "Khu vui chơi giải trí đầy màu sắc và năng động",
      credit: "Unsplash Fun & Arcade",
      angle: "overview",
    },
    {
      url: "https://images.unsplash.com/photo-1545232979-fbf671158d3d?auto=format&fit=crop&w=1200&q=80",
      caption: "Khu vực bowling & tương tác vui nhộn cho cặp đôi",
      credit: "Unsplash Bowling",
      angle: "overview",
    },
    // Góc 2: Table
    {
      url: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=1200&q=80",
      caption: "Quầy bar đôi ấm áp cho những cuộc trò chuyện dài",
      credit: "M.S. Meeuwesen / Unsplash",
      angle: "table",
    },
    {
      url: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1200&q=80",
      caption: "Bàn tiệc cocktail ngọt ngào trong tiếng nhạc êm dịu",
      credit: "Alut Vinicius / Unsplash",
      angle: "table",
    },
    // Góc 3: Detail
    {
      url: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80",
      caption: "Ly cocktail thủ công pha chế điệu nghệ và bắt mắt",
      credit: "Kobby Mendez / Unsplash",
      angle: "detail",
    },
    {
      url: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=80",
      caption: "Chi tiết đồ gốm và vật phẩm trải nghiệm tự tay làm",
      credit: "Unsplash Workshop Craft",
      angle: "detail",
    },
    // Góc 4: Aesthetic
    {
      url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
      caption: "Rạp chiếu phim lãng mạn dành riêng cho hai người",
      credit: "Felix Mooneeram / Unsplash",
      angle: "aesthetic",
    },
    {
      url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80",
      caption: "Góc nghệ thuật thị giác ánh sáng ấn tượng",
      credit: "Steve Johnson / Unsplash",
      angle: "aesthetic",
    },
  ],

  nature: [
    // Góc 1: Overview
    {
      url: "https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=1200&q=80",
      caption: "Khung cảnh cắm trại ven hồ yên bình ngoại ô",
      credit: "Unsplash Camping Outdoor",
      angle: "overview",
    },
    {
      url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
      caption: "Bình minh và làn gió mát lành bên mặt hồ phẳng lặng",
      credit: "Unsplash Nature Lake",
      angle: "overview",
    },
    {
      url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
      caption: "Rừng thông bạt ngàn với những lối đi thơ mộng",
      credit: "Unsplash Forest Trails",
      angle: "overview",
    },
    // Góc 2: Table
    {
      url: "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1200&q=80",
      caption: "Góc lều trại glamping ấm áp và riêng tư giữa thiên nhiên",
      credit: "Unsplash Glamping Tent",
      angle: "table",
    },
    {
      url: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1200&q=80",
      caption: "Thảm dã ngoại picnic đầy đủ đồ ăn vặt và hoa quả",
      credit: "Unsplash Picnic Lawn",
      angle: "table",
    },
    // Góc 3: Detail
    {
      url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
      caption: "Ly trà nóng bên đốm lửa trại bập bùng lúc chạng vạng",
      credit: "Unsplash Campfire Drink",
      angle: "detail",
    },
    {
      url: "https://images.unsplash.com/photo-1533240332313-0db49b459ad0?auto=format&fit=crop&w=1200&q=80",
      caption: "Giỏ picnic xinh xắn với bánh mì nướng và hoa tươi",
      credit: "Unsplash Picnic Details",
      angle: "detail",
    },
    // Góc 4: Aesthetic
    {
      url: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1200&q=80",
      caption: "Cảnh hoàng hôn nhuộm vàng mặt hồ cực lãng mạn",
      credit: "Eric Park / Unsplash",
      angle: "aesthetic",
    },
    {
      url: "https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1200&q=80",
      caption: "Ánh nắng xiên qua tán cây tạo nên khung hình tuyệt đẹp",
      credit: "Luca Bravo / Unsplash",
      angle: "aesthetic",
    },
  ],

  photo: [
    // Góc 1: Overview
    {
      url: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=1200&q=80",
      caption: "Không gian bảo tàng nghệ thuật đương đại sang trọng",
      credit: "Unsplash Art Gallery",
      angle: "overview",
    },
    {
      url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
      caption: "Tổ hợp sáng tạo với không gian triển lãm đa sắc màu",
      credit: "Unsplash Creative Space",
      angle: "overview",
    },
    {
      url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
      caption: "Kiến trúc độc đáo mang đậm tính thẩm mỹ",
      credit: "Unsplash Architecture",
      angle: "overview",
    },
    // Góc 2: Table / Corner
    {
      url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80",
      caption: "Băng ghế gỗ dừng chân yên bình giữa không gian nghệ thuật",
      credit: "Unsplash Reading Bench",
      angle: "table",
    },
    {
      url: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80",
      caption: "Góc đọc sách và thư giãn nhẹ nhàng bên nhau",
      credit: "Unsplash Gallery Lounge",
      angle: "table",
    },
    // Góc 3: Detail
    {
      url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=80",
      caption: "Tác phẩm điêu khắc và hội họa đầy cảm hứng",
      credit: "Steve Johnson / Unsplash",
      angle: "detail",
    },
    {
      url: "https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1200&q=80",
      caption: "Vệt màu nghệ thuật và ánh sáng tạo điểm nhấn thị giác",
      credit: "Unsplash Fine Art",
      angle: "detail",
    },
    // Góc 4: Aesthetic
    {
      url: "https://images.unsplash.com/photo-1508997449629-303059a039c0?auto=format&fit=crop&w=1200&q=80",
      caption: "Góc chụp ảnh chân dung ngược sáng cực nghệ thuật",
      credit: "Unsplash Aesthetic Portrait",
      angle: "aesthetic",
    },
    {
      url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80",
      caption: "Ánh sáng neon nghệ thuật cho những bức ảnh sống ảo độc lạ",
      credit: "Unsplash Neon Glow",
      angle: "aesthetic",
    },
  ],

  walk: [
    // Góc 1: Overview
    {
      url: "https://images.unsplash.com/photo-1611633346086-1a26ee68dff0?auto=format&fit=crop&w=1200&q=80",
      caption: "Cây cầu lịch sử vắt qua sông trong ánh chiều hoàng hôn",
      credit: "Harry Tran / Unsplash",
      angle: "overview",
    },
    {
      url: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80",
      caption: "Tuyến phố đi bộ rợp bóng cây cổ thụ thanh bình",
      credit: "Unsplash Promenade",
      angle: "overview",
    },
    {
      url: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80",
      caption: "Khung cảnh phố phường rực rỡ sắc màu khi lên đèn",
      credit: "Unsplash City Lights",
      angle: "overview",
    },
    // Góc 2: Table / Bench
    {
      url: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80",
      caption: "Ghế đá ven hồ ngắm gió chiều lộng mát",
      credit: "Unsplash Lakeside Bench",
      angle: "table",
    },
    {
      url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
      caption: "Trạm dừng chân thư thái trò chuyện bên góc phố quen",
      credit: "Unsplash Street Corner",
      angle: "table",
    },
    // Góc 3: Detail
    {
      url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80",
      caption: "Món quà vặt đường phố nóng hổi cho ngày se lạnh",
      credit: "Unsplash Street Food Detail",
      angle: "detail",
    },
    {
      url: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&w=1200&q=80",
      caption: "Bó hoa tươi cầm tay nhẹ nhàng dạo phố",
      credit: "Unsplash Flower Bouquet",
      angle: "detail",
    },
    // Góc 4: Aesthetic
    {
      url: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80",
      caption: "Con ngõ nhỏ phủ đầy rêu phong và ánh nắng chiều",
      credit: "Unsplash Cozy Alley",
      angle: "aesthetic",
    },
    {
      url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
      caption: "Mặt hồ phẳng lặng phản chiếu ráng chiều rực rỡ",
      credit: "Bailey Zindel / Unsplash",
      angle: "aesthetic",
    },
  ],
};

/**
 * Lấy ra từ 3 đến 5 ảnh demo Unsplash đa dạng góc nhìn cho một địa điểm
 * Dựa trên danh mục và chỉ số băm của địa điểm để các quán không bị trùng hệt nhau.
 */
export function getCuratedUnsplashGalleryForPlace(
  category: string,
  placeSeed: string,
  count = 4
): UnsplashPhotoItem[] {
  const normCat = category.toLowerCase();
  let pool = UNSPLASH_CATEGORY_POOLS.cafe;

  if (normCat.includes("food") || normCat.includes("restaurant") || normCat.includes("bakery")) {
    pool = UNSPLASH_CATEGORY_POOLS.food;
  } else if (normCat.includes("bar") || normCat.includes("pub") || normCat.includes("fun") || normCat.includes("arcade")) {
    pool = UNSPLASH_CATEGORY_POOLS.fun;
  } else if (normCat.includes("nature") || normCat.includes("park") || normCat.includes("picnic") || normCat.includes("camping")) {
    pool = UNSPLASH_CATEGORY_POOLS.nature;
  } else if (normCat.includes("photo") || normCat.includes("gallery") || normCat.includes("museum")) {
    pool = UNSPLASH_CATEGORY_POOLS.photo;
  } else if (normCat.includes("walk") || normCat.includes("lake") || normCat.includes("viewpoint")) {
    pool = UNSPLASH_CATEGORY_POOLS.walk;
  }

  // Phân nhóm theo 4 góc nhìn
  const overviews = pool.filter((p) => p.angle === "overview");
  const tables = pool.filter((p) => p.angle === "table");
  const details = pool.filter((p) => p.angle === "detail");
  const aesthetics = pool.filter((p) => p.angle === "aesthetic");

  // Hash seed
  let hash = 0;
  for (let i = 0; i < placeSeed.length; i++) {
    hash = (hash << 5) - hash + placeSeed.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);

  const selected: UnsplashPhotoItem[] = [
    overviews[absHash % overviews.length] || pool[0],
    tables[(absHash + 1) % tables.length] || pool[1],
    details[(absHash + 2) % details.length] || pool[2],
    aesthetics[(absHash + 3) % aesthetics.length] || pool[3],
  ];

  if (count >= 5 && pool.length >= 5) {
    selected.push(pool[(absHash + 4) % pool.length]);
  }

  return selected.slice(0, count);
}
