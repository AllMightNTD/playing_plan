import { describe, it, expect, vi } from "vitest";
import { queryPlaces } from "@/server/services/user/places.service";

vi.mock("@/server/db/client", () => ({ isDatabaseConfigured: vi.fn(() => false) }));

describe("Places cursor pagination", () => {
  it("phân trang đúng giới hạn limit và trả về nextCursor hợp lệ khi còn phần tử", async () => {
    const page1 = await queryPlaces({}, undefined, 6);
    expect(page1.items.length).toBe(6);
    expect(page1.nextCursor).toBeTruthy();

    const page2 = await queryPlaces({}, page1.nextCursor ?? undefined, 6);
    expect(page2.items.length).toBe(6);
    const page1Ids = new Set(page1.items.map((p) => p.id));
    for (const item of page2.items) {
      expect(page1Ids.has(item.id)).toBe(false);
    }
  });
});
