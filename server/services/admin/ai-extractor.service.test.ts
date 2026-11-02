import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminIdentity } from "@/server/auth/admin-auth";
import { AppError, ERRORS } from "@/server/http/errors";
import * as gateway from "@/server/services/ai/gemini-gateway";
import { extractGuideDraft } from "./ai-extractor.service";

const ADMIN: AdminIdentity = { email: "admin@datemate.vn" };

describe("extractGuideDraft", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    gateway.resetGeminiCircuitBreaker();
    process.env.GEMINI_API_KEY = "real-admin-test-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    gateway.resetGeminiCircuitBreaker();
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  });

  it("returns fallback draft without calling AI when GEMINI_API_KEY is missing or placeholder", async () => {
    process.env.GEMINI_API_KEY = "AIzaSy...placeholder";
    const spy = vi.spyOn(gateway, "generateStructuredJson");

    const draft = await extractGuideDraft(ADMIN, "Quán cà phê góc ban công Hồ Tây siêu lãng mạn");
    expect(draft.isAiGenerated).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it("maps GeminiRateLimitError to 429 AI_QUOTA_EXCEEDED and timeout/circuit-open to 503 AI_UNAVAILABLE", async () => {
    vi.spyOn(gateway, "generateStructuredJson").mockRejectedValueOnce(
      new gateway.GeminiRateLimitError("429")
    );
    await expect(
      extractGuideDraft({ email: "quota@datemate.vn" }, "Nội dung video đủ dài để trích xuất")
    ).rejects.toMatchObject({
      definition: ERRORS.AI.QUOTA_EXCEEDED,
    } satisfies Partial<AppError>);

    vi.spyOn(gateway, "generateStructuredJson").mockRejectedValueOnce(
      new gateway.GeminiTimeoutError(15_000)
    );
    await expect(
      extractGuideDraft({ email: "timeout@datemate.vn" }, "Nội dung video đủ dài để trích xuất")
    ).rejects.toMatchObject({
      definition: ERRORS.AI.UNAVAILABLE,
    } satisfies Partial<AppError>);

    vi.spyOn(gateway, "generateStructuredJson").mockRejectedValueOnce(
      new gateway.GeminiCircuitOpenError(60_000)
    );
    await expect(
      extractGuideDraft({ email: "breaker@datemate.vn" }, "Nội dung video đủ dài để trích xuất")
    ).rejects.toMatchObject({
      definition: ERRORS.AI.UNAVAILABLE,
    } satisfies Partial<AppError>);
  });

  it("maps GeminiInvalidOutputError to 502 AI_INVALID_RESPONSE", async () => {
    vi.spyOn(gateway, "generateStructuredJson").mockRejectedValueOnce(
      new gateway.GeminiInvalidOutputError("Malformed JSON")
    );
    await expect(
      extractGuideDraft({ email: "badjson@datemate.vn" }, "Nội dung video đủ dài để trích xuất")
    ).rejects.toMatchObject({
      definition: ERRORS.AI.INVALID_RESPONSE,
    } satisfies Partial<AppError>);
  });
});
