import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

vi.mock("@/server/db/client", () => ({ isDatabaseConfigured: vi.fn(() => false) }));

describe("GET /api/v1/user/places/suggestions", () => {
  const dummyContext = { params: Promise.resolve({}) };

  it("trả về gợi ý địa điểm thành công khi có từ khóa hợp lệ", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/user/places/suggestions?q=cau&limit=5");
    const res = await GET(req, dummyContext);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data.some((item: { slug: string }) => item.slug === "cau-long-bien")).toBe(true);
  });

  it("trả về lỗi 400 VALIDATION_FAILED khi thiếu tham số query 'q'", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/user/places/suggestions");
    const res = await GET(req, dummyContext);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_FAILED");
  });

  it("trả về mảng rỗng khi từ khóa không khớp bất kỳ địa điểm nào", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/user/places/suggestions?q=zzznocandidatematched");
    const res = await GET(req, dummyContext);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toEqual([]);
  });
});
