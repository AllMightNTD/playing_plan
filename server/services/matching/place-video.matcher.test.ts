import { describe, it, expect } from "vitest";
import {
  calculatePlaceVideoMatch,
  matchVideosWithPlaces,
  PlaceForMatching,
  VideoForMatching,
} from "./place-video.matcher";

describe("Place-Video Matcher Engine", () => {
  const places: PlaceForMatching[] = [
    {
      id: "place_giang_yen_phu",
      name: "Cafe Giảng",
      address: "106 Yên Phụ, Tây Hồ, Hà Nội",
      district: "tay_ho",
    },
    {
      id: "place_giang_nhh",
      name: "Cafe Giảng",
      address: "39 Nguyễn Hữu Huân, Hoàn Kiếm, Hà Nội",
      district: "hoan_kiem",
    },
    {
      id: "place_santorini",
      name: "Santorini Lounge Cafe",
      address: "Ven hồ Tây, Quảng An, Tây Hồ",
      district: "tay_ho",
    },
  ];

  it("should disambiguate duplicate place names using district and street context", () => {
    const videoYenPhu: VideoForMatching = {
      videoId: "vid_yp",
      title: "Khám phá Cafe Giảng cơ sở Yên Phụ view hồ Tây cực chill",
      description: "Hôm nay mình dẫn các bạn đi uống cà phê trứng tại đường Yên Phụ, quận Tây Hồ.",
    };

    const matchYenPhu = calculatePlaceVideoMatch(places[0], videoYenPhu);
    const matchNhh = calculatePlaceVideoMatch(places[1], videoYenPhu);

    // Quán Yên Phụ khớp cả tên + phố Yên Phụ + quận Tây Hồ -> Đạt >= 80 (auto_linked)
    expect(matchYenPhu.status).toBe("auto_linked");
    expect(matchYenPhu.score).toBeGreaterThanOrEqual(80);

    // Quán Nguyễn Hữu Huân chỉ khớp tên, không khớp phố -> Điểm thấp hơn hẳn
    expect(matchNhh.score).toBeLessThan(matchYenPhu.score);
    expect(matchNhh.status).not.toBe("auto_linked");
  });

  it("should auto link romantic video with specific cafe and district match", () => {
    const videoSantorini: VideoForMatching = {
      videoId: "vid_san",
      title: "Hẹn hò lãng mạn tại Santorini Lounge Cafe ngắm hoàng hôn Hồ Tây",
      description: "Quán nằm ngay ven hồ Tây, view triệu đô cực đẹp cho các cặp đôi.",
    };

    const match = calculatePlaceVideoMatch(places[2], videoSantorini);
    expect(match.status).toBe("auto_linked");
    expect(match.score).toBeGreaterThanOrEqual(80);
    expect(match.breakdown.nameMatchScore).toBe(50);
    expect(match.breakdown.geoContextScore).toBe(30);
  });

  it("should mark ambiguous matches as pending_review", () => {
    const vagueVideo: VideoForMatching = {
      videoId: "vid_vague",
      title: "Đi uống Cafe Giảng với người yêu cuối tuần",
      description: "Hà Nội mùa thu đi uống cà phê trứng rất thích.",
    };

    // Khớp tên nhưng không rõ ở quận/cơ sở nào
    const match = calculatePlaceVideoMatch(places[0], vagueVideo);
    expect(match.status).toBe("pending_review");
    expect(match.score).toBeGreaterThanOrEqual(50);
    expect(match.score).toBeLessThan(80);
  });

  it("should reject completely irrelevant videos", () => {
    const irrelevantVideo: VideoForMatching = {
      videoId: "vid_irrelevant",
      title: "Review xe máy điện mới ra mắt tại Cầu Giấy",
      description: "Video trải nghiệm xe tay ga công nghệ.",
    };

    const match = calculatePlaceVideoMatch(places[0], irrelevantVideo);
    expect(match.status).toBe("rejected");
    expect(match.score).toBeLessThan(50);
  });

  it("should support M:N matching where one video links to multiple places", () => {
    const roundUpVideo: VideoForMatching = {
      videoId: "vid_roundup",
      title: "Top quán cà phê view hồ Tây: Santorini Lounge Cafe và Cafe Giảng Yên Phụ",
      description: "Tổng hợp các điểm hẹn hò tuyệt vời tại Tây Hồ gồm Santorini Lounge Cafe và Cafe Giảng đường Yên Phụ.",
    };

    const results = matchVideosWithPlaces(places, [roundUpVideo]);
    const linkedPlaceIds = results
      .filter((r) => r.status === "auto_linked")
      .map((r) => r.placeId);

    expect(linkedPlaceIds).toContain("place_giang_yen_phu");
    expect(linkedPlaceIds).toContain("place_santorini");
  });
});
