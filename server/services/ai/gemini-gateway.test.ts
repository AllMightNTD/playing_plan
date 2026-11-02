import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError } from "@google/genai";
import { ERRORS } from "@/server/http/errors";
import {
  DEFAULT_GEMINI_FLASH_MODEL,
  DEFAULT_GEMINI_TIMEOUT_MS,
  GEMINI_BREAKER_COOLDOWN_MS,
  GEMINI_BREAKER_FAILURE_THRESHOLD,
  type GeminiClientLike,
  GeminiCircuitOpenError,
  GeminiInvalidOutputError,
  GeminiMissingKeyError,
  GeminiRateLimitError,
  GeminiTimeoutError,
  generateStructuredJson,
  getGeminiCircuitBreakerState,
  isGeminiTransientFailure,
  resetGeminiCircuitBreaker,
  resolveGeminiApiKey,
} from "./gemini-gateway";

const sampleSchema = z
  .object({
    summary: z.string().min(5),
    tags: z.array(z.string()).max(4),
  })
  .strict();

function makeClientFactory(
  createImpl: GeminiClientLike["interactions"]["create"]
): (apiKey: string) => GeminiClientLike {
  return () => ({
    interactions: {
      create: createImpl,
    },
  });
}

function createNamedError(name: string, message: string): Error {
  const err = new Error(message);
  err.name = name;
  return err;
}

function createStatusError(message: string, status: number): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}

describe("gemini-gateway (6-Layer Matrix)", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    resetGeminiCircuitBreaker();
    vi.restoreAllMocks();
    process.env.GEMINI_API_KEY = "real-test-gemini-key";
  });

  afterEach(() => {
    resetGeminiCircuitBreaker();
    vi.restoreAllMocks();
    if (originalKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  it("Layer 1 (Happy Path): invokes interactions.create with gemini-3.8-flash, store:false, and validates Zod output", async () => {
    const createMock = vi.fn<GeminiClientLike["interactions"]["create"]>().mockResolvedValue({
      output_text: JSON.stringify({ summary: "Romantic lakeside cafe", tags: ["chill"] }),
    });

    const jsonSchema = {
      type: "object",
      properties: {
        summary: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["summary", "tags"],
    };

    const output = await generateStructuredJson({
      schema: sampleSchema,
      systemInstruction: "Extract venue summary.",
      responseJsonSchema: jsonSchema,
      input: "West Lake sunset cafe",
      clientFactory: makeClientFactory(createMock),
    });

    expect(output).toEqual({ summary: "Romantic lakeside cafe", tags: ["chill"] });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: DEFAULT_GEMINI_FLASH_MODEL,
        store: false,
        system_instruction: "Extract venue summary.",
        input: "West Lake sunset cafe",
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: jsonSchema,
        },
        generation_config: { thinking_level: "minimal" },
      }),
      expect.objectContaining({ timeout_ms: DEFAULT_GEMINI_TIMEOUT_MS })
    );
  });

  it("Layer 2 (Dirty Output): strips markdown json fences, rejects empty output, and rejects forbidden extra fields via strict Zod", async () => {
    const fencedMock = vi.fn<GeminiClientLike["interactions"]["create"]>().mockResolvedValue({
      output_text: "```json\n{\"summary\":\"Cozy corner\",\"tags\":[\"warm\"]}\n```",
    });

    const parsed = await generateStructuredJson({
      schema: sampleSchema,
      input: "Cozy corner",
      clientFactory: makeClientFactory(fencedMock),
    });
    expect(parsed.summary).toBe("Cozy corner");

    const emptyMock = vi.fn<GeminiClientLike["interactions"]["create"]>().mockResolvedValue({
      output_text: "   ",
    });
    await expect(
      generateStructuredJson({
        schema: sampleSchema,
        input: "Empty response",
        clientFactory: makeClientFactory(emptyMock),
      })
    ).rejects.toBeInstanceOf(GeminiInvalidOutputError);

    const hallucinatedMock = vi.fn<GeminiClientLike["interactions"]["create"]>().mockResolvedValue({
      output_text: JSON.stringify({
        summary: "Cozy corner",
        tags: ["warm"],
        estCost: "100k",
      }),
    });

    await expect(
      generateStructuredJson({
        schema: sampleSchema,
        input: "Cozy corner",
        clientFactory: makeClientFactory(hallucinatedMock),
      })
    ).rejects.toBeInstanceOf(GeminiInvalidOutputError);
  });

  it("Layer 3 (Zero-PII & Parameter Isolation): enforces store:false on multimodal inputs and omits deprecated sampling params", async () => {
    let capturedApiKey = "";
    const createMock = vi.fn<GeminiClientLike["interactions"]["create"]>().mockResolvedValue({
      output_text: JSON.stringify({ summary: "Hanoi rooftop date", tags: ["rooftop"] }),
    });

    await generateStructuredJson({
      schema: sampleSchema,
      apiKey: "explicit-scoped-key",
      thinkingLevel: "low",
      input: [
        { type: "video", uri: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", resolution: "low" },
        { type: "text", text: "Identify rooftop venue" },
      ],
      clientFactory: (key) => {
        capturedApiKey = key;
        return { interactions: { create: createMock } };
      },
    });

    expect(capturedApiKey).toBe("explicit-scoped-key");
    const sentPayload = createMock.mock.calls[0]?.[0];
    expect(sentPayload?.store).toBe(false);
    expect(sentPayload?.generation_config).toEqual({ thinking_level: "low" });
    expect("temperature" in (sentPayload?.generation_config ?? {})).toBe(false);
    expect("top_p" in (sentPayload?.generation_config ?? {})).toBe(false);
    expect("top_k" in (sentPayload?.generation_config ?? {})).toBe(false);
  });

  it("Layer 4 (Boundary & Credentials): rejects missing or placeholder AIzaSy... keys and enforces hard timeout", async () => {
    delete process.env.GEMINI_API_KEY;
    expect(resolveGeminiApiKey()).toBeNull();
    expect(resolveGeminiApiKey("   ")).toBeNull();
    expect(resolveGeminiApiKey("AIzaSy...placeholder")).toBeNull();

    await expect(
      generateStructuredJson({
        schema: sampleSchema,
        input: "Test",
      })
    ).rejects.toBeInstanceOf(GeminiMissingKeyError);

    process.env.GEMINI_API_KEY = "real-test-gemini-key";
    const slowMock = vi.fn<GeminiClientLike["interactions"]["create"]>().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ output_text: "{}" }), 200))
    );

    await expect(
      generateStructuredJson({
        schema: sampleSchema,
        input: "Slow request",
        timeoutMs: 30,
        clientFactory: makeClientFactory(slowMock),
      })
    ).rejects.toBeInstanceOf(GeminiTimeoutError);
  });

  it("Layer 5 (Circuit Breaker & Concurrency): opens on 429 or 3 consecutive 5xx, enforces single in-flight HALF_OPEN probe, and recovers cleanly", async () => {
    let nowMs = 1_000_000;
    const rateLimitedMock = vi
      .fn<GeminiClientLike["interactions"]["create"]>()
      .mockRejectedValueOnce(new ApiError({ message: "Quota exceeded", status: 429 }));

    await expect(
      generateStructuredJson({
        schema: sampleSchema,
        input: "Call 1",
        now: () => nowMs,
        clientFactory: makeClientFactory(rateLimitedMock),
      })
    ).rejects.toBeInstanceOf(GeminiRateLimitError);

    expect(getGeminiCircuitBreakerState(() => nowMs).state).toBe("OPEN");

    // Fast-fail without invoking underlying SDK while cooldown is active
    await expect(
      generateStructuredJson({
        schema: sampleSchema,
        input: "Call 2 during cooldown",
        now: () => nowMs + 10_000,
        clientFactory: makeClientFactory(rateLimitedMock),
      })
    ).rejects.toBeInstanceOf(GeminiCircuitOpenError);
    expect(rateLimitedMock).toHaveBeenCalledTimes(1);

    // Advance past 60s cooldown -> HALF_OPEN: only 1 concurrent probe is permitted
    nowMs += GEMINI_BREAKER_COOLDOWN_MS + 1_000;
    expect(getGeminiCircuitBreakerState(() => nowMs).state).toBe("HALF_OPEN");

    const delayedProbeMock = vi
      .fn<GeminiClientLike["interactions"]["create"]>()
      .mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  output_text: JSON.stringify({ summary: "Recovered venue", tags: ["ok"] }),
                }),
              20
            )
          )
      );

    const concurrentResults = await Promise.allSettled([
      generateStructuredJson({
        schema: sampleSchema,
        input: "Concurrent HALF_OPEN probe A",
        now: () => nowMs,
        clientFactory: makeClientFactory(delayedProbeMock),
      }),
      generateStructuredJson({
        schema: sampleSchema,
        input: "Concurrent HALF_OPEN probe B",
        now: () => nowMs,
        clientFactory: makeClientFactory(delayedProbeMock),
      }),
    ]);

    expect(delayedProbeMock).toHaveBeenCalledTimes(1);
    const fulfilled = concurrentResults.filter(
      (r): r is PromiseFulfilledResult<z.infer<typeof sampleSchema>> => r.status === "fulfilled"
    );
    const rejected = concurrentResults.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    );
    expect(fulfilled).toHaveLength(1);
    expect(fulfilled[0]?.value.summary).toBe("Recovered venue");
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBeInstanceOf(GeminiCircuitOpenError);
    expect(getGeminiCircuitBreakerState(() => nowMs).state).toBe("CLOSED");

    // Consecutive 5xx threshold -> opens on 3rd failure, and HALF_OPEN failure re-opens immediately
    const serverErrorMock = vi
      .fn<GeminiClientLike["interactions"]["create"]>()
      .mockRejectedValue(new ApiError({ message: "Backend unavailable", status: 503 }));

    for (let i = 1; i <= GEMINI_BREAKER_FAILURE_THRESHOLD; i += 1) {
      await expect(
        generateStructuredJson({
          schema: sampleSchema,
          input: `503 attempt ${i}`,
          now: () => nowMs,
          clientFactory: makeClientFactory(serverErrorMock),
        })
      ).rejects.toBeInstanceOf(ApiError);
    }

    expect(getGeminiCircuitBreakerState(() => nowMs).state).toBe("OPEN");

    nowMs += GEMINI_BREAKER_COOLDOWN_MS + 500;
    expect(getGeminiCircuitBreakerState(() => nowMs).state).toBe("HALF_OPEN");

    await expect(
      generateStructuredJson({
        schema: sampleSchema,
        input: "Failed HALF_OPEN probe",
        now: () => nowMs,
        clientFactory: makeClientFactory(serverErrorMock),
      })
    ).rejects.toBeInstanceOf(ApiError);

    expect(getGeminiCircuitBreakerState(() => nowMs).state).toBe("OPEN");
  });

  it("Layer 6 (Real @google/genai SDK + fetch integration): exercises default client without clientFactory across 200, 429 (no SDK retry), and 503", async () => {
    const capturedRequests: Request[] = [];
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const req = input instanceof Request ? input : new Request(input, init);
        capturedRequests.push(req);
        return new Response(
          JSON.stringify({
            id: "int_1",
            status: "completed",
            steps: [
              {
                type: "model_output",
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({ summary: "Real SDK path", tags: ["ok"] }),
                  },
                ],
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

    // 1. 200 OK via real GoogleGenAI SDK adapter: key in header, never in URL
    const result = await generateStructuredJson({
      schema: sampleSchema,
      apiKey: "secret-header-only-key",
      input: "Check real SDK adapter",
    });

    expect(result).toEqual({ summary: "Real SDK path", tags: ["ok"] });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(capturedRequests[0]?.url).not.toContain("secret-header-only-key");
    expect(capturedRequests[0]?.headers.get("x-goog-api-key")).toBe("secret-header-only-key");

    // 2. HTTP 429 via real SDK (NextGen RateLimitError, NOT instanceof ApiError, maxRetries: 0)
    fetchSpy.mockClear();
    fetchSpy.mockImplementation(async () => {
      return new Response(
        JSON.stringify({ error: { code: 429, message: "Resource exhausted" } }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    });

    await expect(
      generateStructuredJson({
        schema: sampleSchema,
        apiKey: "secret-header-only-key",
        input: "Trigger 429 on real SDK",
      })
    ).rejects.toBeInstanceOf(GeminiRateLimitError);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(getGeminiCircuitBreakerState().state).toBe("OPEN");

    // 3. HTTP 503 via real SDK (NextGen InternalServerError, NOT instanceof ApiError)
    resetGeminiCircuitBreaker();
    fetchSpy.mockClear();
    fetchSpy.mockImplementation(async () => {
      return new Response(
        JSON.stringify({ error: { code: 503, message: "Model overloaded" } }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    });

    for (let attempt = 1; attempt <= GEMINI_BREAKER_FAILURE_THRESHOLD; attempt += 1) {
      let caughtError: unknown;
      try {
        await generateStructuredJson({
          schema: sampleSchema,
          apiKey: "secret-header-only-key",
          input: `Trigger 503 #${attempt}`,
        });
      } catch (err: unknown) {
        caughtError = err;
      }
      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError).not.toBeInstanceOf(ApiError);
      expect(isGeminiTransientFailure(caughtError)).toBe(true);
    }

    expect(fetchSpy).toHaveBeenCalledTimes(GEMINI_BREAKER_FAILURE_THRESHOLD);
    expect(getGeminiCircuitBreakerState().state).toBe("OPEN");
  });

  it("Layer 6b (Error Classification & Registry Contract): classifies NextGen SDK errors, connection errors, and HTTP 429/503 AI error definitions", () => {
    expect(isGeminiTransientFailure(new GeminiRateLimitError())).toBe(true);
    expect(isGeminiTransientFailure(new GeminiTimeoutError(15_000))).toBe(true);
    expect(isGeminiTransientFailure(new GeminiCircuitOpenError(30_000))).toBe(true);
    expect(isGeminiTransientFailure(new ApiError({ message: "Unavailable", status: 503 }))).toBe(true);
    expect(isGeminiTransientFailure(createStatusError("NextGen 429", 429))).toBe(true);
    expect(isGeminiTransientFailure(createStatusError("NextGen 502", 502))).toBe(true);
    expect(isGeminiTransientFailure(createNamedError("APIConnectionTimeoutError", "Request timed out"))).toBe(true);
    expect(isGeminiTransientFailure(createNamedError("APIConnectionError", "Socket closed"))).toBe(true);
    expect(isGeminiTransientFailure(createNamedError("APIUserAbortError", "Request aborted"))).toBe(true);
    expect(isGeminiTransientFailure(new Error("read ECONNRESET"))).toBe(true);

    expect(isGeminiTransientFailure(new GeminiMissingKeyError())).toBe(false);
    expect(isGeminiTransientFailure(new GeminiInvalidOutputError("bad json"))).toBe(false);
    expect(isGeminiTransientFailure(new ApiError({ message: "Bad request", status: 400 }))).toBe(false);
    expect(isGeminiTransientFailure(createStatusError("NextGen 400", 400))).toBe(false);

    expect(ERRORS.AI.QUOTA_EXCEEDED).toEqual({
      code: "AI_QUOTA_EXCEEDED",
      status: 429,
      message: "Hạn mức AI tạm thời chạm trần, thử lại sau ít phút nhé.",
    });
    expect(ERRORS.AI.UNAVAILABLE).toEqual({
      code: "AI_UNAVAILABLE",
      status: 503,
      message: "Trợ lý AI đang bận hoặc phản hồi chậm, thử lại sau nhé.",
    });
  });
});
