import { describe, it, expect, vi } from "vitest";
import { revalidatePlaceCatalog } from "./revalidation";
import * as nextCache from "next/cache";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("On-demand Revalidation Service", () => {
  it("should revalidate default paths when no slug provided", async () => {
    const res = await revalidatePlaceCatalog();
    expect(res.revalidated).toBe(true);
    expect(res.paths).toContain("/places");
    expect(res.paths).toContain("/");
    expect(res.paths).toContain("/explore");
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/places");
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/");
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/explore");
  });

  it("should include specific place path when slug is provided", async () => {
    const res = await revalidatePlaceCatalog("ca-phe-enh-uong");
    expect(res.revalidated).toBe(true);
    expect(res.paths).toContain("/places/ca-phe-enh-uong");
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/places/ca-phe-enh-uong");
  });
});
