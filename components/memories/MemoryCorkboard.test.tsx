import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { MemoryCorkboard } from "./MemoryCorkboard";

vi.mock("@/context/AppContext", () => ({
  useApp: () => ({
    homeSummary: {
      room: {
        id: "room-test",
        memberCount: 2,
        anniversary: {
          title: "Kỷ niệm 1 năm yêu nhau",
          date: "2026-11-20T00:00:00Z",
          daysLeft: 9,
        },
      },
    },
    refetchHomeSummary: vi.fn(),
    addToast: vi.fn(),
    setIsRoomModalOpen: vi.fn(),
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: {
      notes: [
        {
          id: "note-1",
          content: "Tối nay đi ăn phở cuốn nhé anh!",
          color: "peach",
          authorName: "Thỏ",
          isMine: false,
          createdAt: new Date().toISOString(),
        },
      ],
      memories: [
        {
          id: "mem-1",
          title: "Hoàng hôn Hồ Tây",
          visitedAt: "2026-10-15T00:00:00Z",
          rating: 5,
          coverUrl: "https://example.com/photo.jpg",
          coverCaption: "Hoàng hôn đẹp",
          journal: "Trời thu mát rượi, hai đứa uống cà phê ngắm hồ.",
        },
      ],
    },
    isLoading: false,
  }),
  useQueryClient: () => ({
    setQueryData: vi.fn(),
  }),
}));

describe("components/memories/MemoryCorkboard", () => {
  it("renders romantic hero countdown widget, couple sticky notes, and polaroid cards", () => {
    const html = renderToString(<MemoryCorkboard />);

    // Header & Room
    expect(html).toContain("Kho Kỷ Niệm Của Hai Bạn");
    expect(html).toContain("Phòng 2/2");

    // Hero Countdown Widget
    expect(html).toContain("Đếm ngược ngày đặc biệt");
    expect(html).toContain("Còn 9 Ngày Nữa!");
    expect(html).toContain("Kỷ niệm 1 năm yêu nhau");
    expect(html).toContain("Mở QR Phòng đôi →");

    // Sticky Notes
    expect(html).toContain("Thỏ dán");
    expect(html).toContain("Tối nay đi ăn phở cuốn nhé anh!");

    // Polaroid card
    expect(html).toContain("Hoàng hôn Hồ Tây");
    expect(html).toContain("⭐⭐⭐⭐⭐");
    expect(html).toContain("Chạm lật");

    // Compose button
    expect(html).toContain("Dán giấy nhớ");
  });
});

