import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchPlansList, fetchPlanDetail } from "./plans-fetchers";

global.fetch = vi.fn();

describe("Plans fetchers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchPlansList trả về mảng rỗng nếu res không ok", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }));
    const result = await fetchPlansList();
    expect(result).toEqual([]);
  });

  it("fetchPlansList trả về danh sách plans khi res ok", async () => {
    const mockPlans = [{ id: "pl-1", title: "Hẹn hò Hồ Tây" }];
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ data: mockPlans }), { status: 200 }));
    const result = await fetchPlansList();
    expect(result).toEqual(mockPlans);
  });

  it("fetchPlanDetail trả về null nếu không có planId", async () => {
    const result = await fetchPlanDetail(null);
    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetchPlanDetail trả về chi tiết plan khi res ok", async () => {
    const mockDetail = { id: "pl-1", title: "Hẹn hò Hồ Tây", stops: [] };
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ data: mockDetail }), { status: 200 }));
    const result = await fetchPlanDetail("pl-1");
    expect(result).toEqual(mockDetail);
  });
});
