import { ApiError, GoogleGenAI } from "@google/genai";
import type { z } from "zod";

export const DEFAULT_GEMINI_FLASH_MODEL = "gemini-3.8-flash";
export const DEFAULT_GEMINI_TIMEOUT_MS = 15_000;
export const GEMINI_BREAKER_FAILURE_THRESHOLD = 3;
export const GEMINI_BREAKER_COOLDOWN_MS = 60_000;
const PLACEHOLDER_KEY_PREFIX = "AIzaSy...";

const TRANSIENT_CONNECTION_ERROR_NAMES = new Set([
  "APIConnectionTimeoutError",
  "APIConnectionError",
  "APIUserAbortError",
  "RequestTimeoutError",
]);

const TRANSIENT_CONNECTION_MESSAGE_RE =
  /abort|timeout|timed out|fetch failed|network|econnrefused|econnreset|etimedout|socket hang up/i;

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";
export type GeminiThinkingLevel = "minimal" | "low" | "medium" | "high";

export class GeminiMissingKeyError extends Error {
  constructor(message = "GEMINI_API_KEY is missing or uses a placeholder value.") {
    super(message);
    this.name = "GeminiMissingKeyError";
  }
}

export class GeminiRateLimitError extends Error {
  constructor(message = "Gemini API rate limit exceeded (HTTP 429).") {
    super(message);
    this.name = "GeminiRateLimitError";
  }
}

export class GeminiTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Gemini API request timed out after ${timeoutMs}ms.`);
    this.name = "GeminiTimeoutError";
  }
}

export class GeminiCircuitOpenError extends Error {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(`Gemini circuit breaker is OPEN (retry in ${retryAfterMs}ms).`);
    this.name = "GeminiCircuitOpenError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class GeminiInvalidOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiInvalidOutputError";
  }
}

function extractGeminiHttpStatus(err: unknown): number | null {
  if (err instanceof ApiError) {
    return err.status;
  }
  if (!(err instanceof Error)) {
    return null;
  }
  if ("status" in err && typeof err.status === "number") {
    return err.status;
  }
  if ("statusCode" in err && typeof err.statusCode === "number") {
    return err.statusCode;
  }
  return null;
}

function isConnectionOrTimeoutError(err: unknown): err is Error {
  if (!(err instanceof Error)) {
    return false;
  }
  return (
    TRANSIENT_CONNECTION_ERROR_NAMES.has(err.name) ||
    TRANSIENT_CONNECTION_MESSAGE_RE.test(err.message)
  );
}

/**
 * Identifies transient upstream failures (rate-limit, timeout, connection drop, 5xx, or open circuit)
 * across both legacy ApiError and NextGen Interactions SDK errors.
 */
export function isGeminiTransientFailure(err: unknown): boolean {
  if (
    err instanceof GeminiRateLimitError ||
    err instanceof GeminiTimeoutError ||
    err instanceof GeminiCircuitOpenError
  ) {
    return true;
  }
  const httpStatus = extractGeminiHttpStatus(err);
  if (httpStatus !== null) {
    return httpStatus === 429 || httpStatus >= 500;
  }
  return isConnectionOrTimeoutError(err);
}

export type GeminiInteractionContentPart =
  | { type: "text"; text: string }
  | {
      type: "video";
      uri: string;
      mime_type?: string;
      resolution?: "low" | "medium" | "high";
    };

export type GeminiInteractionCreateRequest = {
  model: string;
  input: string | GeminiInteractionContentPart[];
  store: false;
  response_format: {
    type: "text";
    mime_type: "application/json";
    schema?: Record<string, unknown>;
  };
  generation_config: {
    thinking_level: GeminiThinkingLevel;
  };
  system_instruction?: string;
};

export interface GeminiClientLike {
  interactions: {
    create: (
      params: GeminiInteractionCreateRequest,
      options?: { timeout_ms?: number; maxRetries?: number }
    ) => Promise<{ output_text?: string | null }>;
  };
}

export interface GenerateStructuredJsonParams<T> {
  schema: z.ZodType<T>;
  input: string | GeminiInteractionContentPart[];
  systemInstruction?: string;
  responseJsonSchema?: Record<string, unknown>;
  model?: string;
  apiKey?: string;
  timeoutMs?: number;
  thinkingLevel?: GeminiThinkingLevel;
  now?: () => number;
  clientFactory?: (apiKey: string) => GeminiClientLike;
}

interface BreakerInternalState {
  consecutiveFailures: number;
  openedUntilMs: number | null;
  probeInFlight: boolean;
}

const breaker: BreakerInternalState = {
  consecutiveFailures: 0,
  openedUntilMs: null,
  probeInFlight: false,
};

export function resetGeminiCircuitBreaker(): void {
  breaker.consecutiveFailures = 0;
  breaker.openedUntilMs = null;
  breaker.probeInFlight = false;
}

export function getGeminiCircuitBreakerState(now: () => number = Date.now): {
  state: CircuitState;
  consecutiveFailures: number;
  retryAfterMs: number;
} {
  if (breaker.openedUntilMs === null) {
    return {
      state: "CLOSED",
      consecutiveFailures: breaker.consecutiveFailures,
      retryAfterMs: 0,
    };
  }
  const remaining = breaker.openedUntilMs - now();
  if (remaining > 0) {
    return {
      state: "OPEN",
      consecutiveFailures: breaker.consecutiveFailures,
      retryAfterMs: remaining,
    };
  }
  return {
    state: "HALF_OPEN",
    consecutiveFailures: breaker.consecutiveFailures,
    retryAfterMs: 0,
  };
}

export function resolveGeminiApiKey(explicitKey?: string): string | null {
  const candidate = (explicitKey ?? process.env.GEMINI_API_KEY ?? "").trim();
  if (!candidate || candidate.startsWith(PLACEHOLDER_KEY_PREFIX)) {
    return null;
  }
  return candidate;
}

/**
 * Wraps the official GoogleGenAI SDK client with our narrow non-streaming Interactions adapter
 * and disables internal SDK retries so our gateway circuit breaker governs failure budgets.
 */
function createDefaultGeminiClient(apiKey: string): GeminiClientLike {
  const sdk = new GoogleGenAI({ apiKey });
  return {
    interactions: {
      create: async (params, options) => {
        const interaction = await sdk.interactions.create(params, {
          timeout_ms: options?.timeout_ms,
          maxRetries: options?.maxRetries ?? 0,
        });
        return { output_text: interaction.output_text ?? null };
      },
    },
  };
}

function acquireBreakerSlot(now: () => number): { acquiredHalfOpenProbe: boolean } {
  const snapshot = getGeminiCircuitBreakerState(now);
  if (snapshot.state === "OPEN") {
    throw new GeminiCircuitOpenError(snapshot.retryAfterMs);
  }
  if (snapshot.state === "HALF_OPEN") {
    if (breaker.probeInFlight) {
      throw new GeminiCircuitOpenError(GEMINI_BREAKER_COOLDOWN_MS);
    }
    breaker.probeInFlight = true;
    return { acquiredHalfOpenProbe: true };
  }
  return { acquiredHalfOpenProbe: false };
}

function buildInteractionRequest<T>(
  params: GenerateStructuredJsonParams<T>
): GeminiInteractionCreateRequest {
  const model = (params.model ?? "").trim() || DEFAULT_GEMINI_FLASH_MODEL;
  const responseFormat: GeminiInteractionCreateRequest["response_format"] = {
    type: "text",
    mime_type: "application/json",
    ...(params.responseJsonSchema ? { schema: params.responseJsonSchema } : {}),
  };

  return {
    model,
    input: params.input,
    store: false,
    response_format: responseFormat,
    generation_config: {
      thinking_level: params.thinkingLevel ?? "minimal",
    },
    ...(params.systemInstruction ? { system_instruction: params.systemInstruction } : {}),
  };
}

function stripMarkdownJsonFence(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function recordTransientFailure(nowMs: number, forceOpen: boolean): void {
  breaker.consecutiveFailures += 1;
  if (forceOpen || breaker.consecutiveFailures >= GEMINI_BREAKER_FAILURE_THRESHOLD) {
    breaker.openedUntilMs = nowMs + GEMINI_BREAKER_COOLDOWN_MS;
  }
}

function recordSuccess(): void {
  breaker.consecutiveFailures = 0;
  breaker.openedUntilMs = null;
  breaker.probeInFlight = false;
}

async function withHardTimeout<R>(work: Promise<R>, timeoutMs: number): Promise<R> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new GeminiTimeoutError(timeoutMs)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function classifyAndRecordFailure(
  err: unknown,
  timeoutMs: number,
  wasHalfOpen: boolean,
  now: () => number
): never {
  if (err instanceof GeminiTimeoutError) {
    recordTransientFailure(now(), wasHalfOpen);
    throw err;
  }
  const httpStatus = extractGeminiHttpStatus(err);
  if (httpStatus === 429) {
    recordTransientFailure(now(), true);
    const message = err instanceof Error && err.message ? err.message : undefined;
    throw new GeminiRateLimitError(message);
  }
  if (httpStatus !== null && httpStatus >= 500) {
    recordTransientFailure(now(), wasHalfOpen);
    throw err;
  }
  if (isConnectionOrTimeoutError(err)) {
    recordTransientFailure(now(), wasHalfOpen);
    throw new GeminiTimeoutError(timeoutMs);
  }
  throw err;
}

async function executeInteractionCall(options: {
  client: GeminiClientLike;
  requestPayload: GeminiInteractionCreateRequest;
  timeoutMs: number;
  wasHalfOpen: boolean;
  now: () => number;
}): Promise<string> {
  const { client, requestPayload, timeoutMs, wasHalfOpen, now } = options;
  try {
    const interaction = await withHardTimeout(
      client.interactions.create(requestPayload, { timeout_ms: timeoutMs }),
      timeoutMs
    );
    const cleaned = stripMarkdownJsonFence(interaction.output_text ?? "");
    recordSuccess();
    return cleaned;
  } catch (err: unknown) {
    return classifyAndRecordFailure(err, timeoutMs, wasHalfOpen, now);
  }
}

function parseStructuredOutput<T>(rawText: string, schema: z.ZodType<T>): T {
  if (!rawText) {
    throw new GeminiInvalidOutputError("Gemini returned empty output_text.");
  }
  try {
    const parsedUnknown: unknown = JSON.parse(rawText);
    return schema.parse(parsedUnknown);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "Invalid JSON response";
    throw new GeminiInvalidOutputError(detail);
  }
}

/**
 * Executes a non-streaming Gemini Interactions call with Zero-PII storage disabled,
 * hard timeout protection, in-process circuit breaker, and strict Zod output validation.
 */
export async function generateStructuredJson<T>(
  params: GenerateStructuredJsonParams<T>
): Promise<T> {
  const now = params.now ?? Date.now;
  const apiKey = resolveGeminiApiKey(params.apiKey);
  if (!apiKey) {
    throw new GeminiMissingKeyError();
  }

  const { acquiredHalfOpenProbe } = acquireBreakerSlot(now);
  try {
    const timeoutMs = params.timeoutMs ?? DEFAULT_GEMINI_TIMEOUT_MS;
    const client = params.clientFactory
      ? params.clientFactory(apiKey)
      : createDefaultGeminiClient(apiKey);
    const requestPayload = buildInteractionRequest(params);

    const rawText = await executeInteractionCall({
      client,
      requestPayload,
      timeoutMs,
      wasHalfOpen: acquiredHalfOpenProbe,
      now,
    });

    return parseStructuredOutput(rawText, params.schema);
  } finally {
    if (acquiredHalfOpenProbe) {
      breaker.probeInFlight = false;
    }
  }
}
