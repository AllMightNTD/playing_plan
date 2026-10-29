import { describe, expect, it } from "vitest";
import { formatTimestamp, matchChapterToPlace, parseVideoChapters } from "./video-chapters";

describe("parseVideoChapters", () => {
  it("tách chapter thật từ mô tả YouTube", () => {
    const description = "Vlog Hà Nội\n0:00 Intro\n02:10 Đền Ngọc Sơn (ngày 1)\n(1:02:03) - Hồ Tây\nCảm ơn đã xem";
    expect(parseVideoChapters(description)).toEqual([
      { timestampSec: 0, label: "Intro" },
      { timestampSec: 130, label: "Đền Ngọc Sơn (ngày 1)" },
      { timestampSec: 3723, label: "Hồ Tây" },
    ]);
  });

  it("dưới 2 mốc thì không phải chapter", () => {
    expect(parseVideoChapters("Mở cửa 7:30 sáng tới tối")).toEqual([]);
    expect(parseVideoChapters("0:45 Quán ngon")).toEqual([]);
    expect(parseVideoChapters(undefined)).toEqual([]);
  });
});

describe("matchChapterToPlace", () => {
  const places = [
    { id: "a", name: "Văn Miếu - Quốc Tử Giám" },
    { id: "b", name: "Hồ Tây" },
    { id: "c", name: "Chùa Trấn Quốc" },
    { id: "d", name: "Hồ" },
  ];

  it("khớp không dấu, bỏ dấu câu và lấy tên dài nhất", () => {
    expect(matchChapterToPlace("Van Mieu Quoc Tu Giam (ngày 1)", places)?.id).toBe("a");
    expect(matchChapterToPlace("Chùa Trấn Quốc bên Hồ Tây", places)?.id).toBe("c");
  });

  it("không khớp nửa từ hoặc tên quá ngắn", () => {
    expect(matchChapterToPlace("Hồ Tâyy", places)).toBeNull();
    expect(matchChapterToPlace("Intro", places)).toBeNull();
  });
});

describe("formatTimestamp", () => {
  it("định dạng giống YouTube", () => {
    expect(formatTimestamp(42)).toBe("0:42");
    expect(formatTimestamp(3723)).toBe("1:02:03");
  });
});
