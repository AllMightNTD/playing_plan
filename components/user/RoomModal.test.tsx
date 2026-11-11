import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";

const mockUseApp = vi.fn();

vi.mock("@/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

import { RoomModal } from "./RoomModal";

describe("components/user/RoomModal", () => {
  it("returns null when modal is closed", () => {
    mockUseApp.mockReturnValue({
      isRoomModalOpen: false,
      setIsRoomModalOpen: vi.fn(),
      addToast: vi.fn(),
      homeSummary: null,
      roomProfile: null,
      refetchHomeSummary: vi.fn(),
      refreshRoomProfile: vi.fn(),
    });

    const html = renderToString(<RoomModal />);
    expect(html).toBe("");
  });

  it("renders accessible dialog, profile form, recovery key section and dissolve trigger when open", () => {
    mockUseApp.mockReturnValue({
      isRoomModalOpen: true,
      setIsRoomModalOpen: vi.fn(),
      addToast: vi.fn(),
      homeSummary: {
        room: {
          id: "room-1",
          name: "Phòng Của Tụi Mình",
          memberCount: 2,
          isPaired: true,
          anniversary: { date: "2025-11-20", daysLeft: 9 },
        },
      },
      roomProfile: {
        room: {
          id: "room-1",
          name: "Phòng Của Tụi Mình",
          anniversaryDate: "2025-11-20",
          pendingDeletedAt: null,
        },
        me: {
          id: "user-1",
          nickname: "Gấu",
        },
        members: [
          { id: "user-1", nickname: "Gấu", isMe: true },
          { id: "user-2", nickname: "Thỏ", isMe: false },
        ],
      },
      refetchHomeSummary: vi.fn(),
      refreshRoomProfile: vi.fn(),
    });

    const html = renderToString(<RoomModal />);

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="Quản lý phòng đôi"');
    expect(html).toContain("Phòng Của Tụi Mình");
    expect(html).toContain("Kỷ niệm tiếp theo còn 9 ngày nữa");
    expect(html).toContain("Khóa khôi phục phòng đôi");
    expect(html).toContain("Yêu cầu giải tán phòng");
    expect(html).toContain("Tải toàn bộ Kỷ niệm (.zip)");
  });
});

