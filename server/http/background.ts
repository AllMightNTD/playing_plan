import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface WaitUntilContextLike {
  ctx: {
    waitUntil(promise: Promise<unknown>): void;
  };
}

export type CloudflareContextResolver = () => Promise<WaitUntilContextLike | null>;

const defaultContextResolver: CloudflareContextResolver = async () => {
  try {
    return await getCloudflareContext({ async: true });
  } catch {
    return null;
  }
};

/**
 * Registers fire-and-forget work with Cloudflare Workers ctx.waitUntil so the V8 isolate
 * does not terminate pending DB/audit writes right after returning the HTTP response.
 */
export async function runInBackground(
  work: Promise<unknown>,
  resolveContext: CloudflareContextResolver = defaultContextResolver
): Promise<void> {
  const safeWork = work.catch(() => {
    // Background side-effects must never trigger unhandled rejections
  });

  const cf = await resolveContext().catch(() => null);
  if (cf?.ctx && typeof cf.ctx.waitUntil === "function") {
    cf.ctx.waitUntil(safeWork);
    return;
  }

  await safeWork;
}
