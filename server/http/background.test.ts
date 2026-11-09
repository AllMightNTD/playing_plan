import { describe, expect, it, vi } from "vitest";
import { runInBackground } from "./background";

describe("Cloudflare Workers waitUntil Background Task Helper", () => {
  it("should register background promise with Cloudflare ctx.waitUntil when available", async () => {
    const waitUntil = vi.fn();
    let settled = false;
    const work = Promise.resolve().then(() => {
      settled = true;
    });

    await runInBackground(work, async () => ({ ctx: { waitUntil } }));

    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(settled).toBe(true);
  });

  it("should safely absorb errors outside Cloudflare Worker context without unhandled rejection", async () => {
    const failingWork = Promise.reject(new Error("transient audit failure"));

    await expect(
      runInBackground(failingWork, async () => null)
    ).resolves.toBeUndefined();
  });
});
