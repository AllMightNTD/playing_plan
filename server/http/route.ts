import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { AppError, ERRORS, type ErrorDefinition } from "@/server/http/errors";

type RouteHandler<TContext> = (req: NextRequest, context: TContext) => Promise<Response>;

export const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
} as const;

export const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

function errorResponse(definition: ErrorDefinition, fields?: Record<string, string>): NextResponse {
  return NextResponse.json(
    { error: { code: definition.code, message: definition.message, ...(fields ? { fields } : {}) } },
    { status: definition.status, headers: NO_STORE_HEADERS }
  );
}

/** Giữ lỗi đầu tiên của mỗi field (ví dụ "Unrecognized key" không bị refine phía sau ghi đè). */
function toFieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_root";
    fields[key] ??= issue.message;
  }
  return fields;
}

function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) return errorResponse(error.definition, error.fields);
  if (error instanceof ZodError) return errorResponse(ERRORS.COMMON.VALIDATION_FAILED, toFieldErrors(error));

  console.error(
    JSON.stringify({
      event: "api.unhandled_error",
      message: error instanceof Error ? error.message : String(error),
      at: new Date().toISOString(),
    })
  );
  return errorResponse(ERRORS.COMMON.INTERNAL_ERROR);
}

/**
 * Bọc route handler: chuẩn hóa mọi lỗi về `{ error: { code, message, fields? } }`.
 */
export function handleRoute<TContext>(handler: RouteHandler<TContext>): RouteHandler<TContext> {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

export function jsonData<T>(data: T, init?: { status?: number; headers?: Record<string, string> }): NextResponse {
  return NextResponse.json({ data }, { status: init?.status ?? 200, headers: init?.headers ?? NO_STORE_HEADERS });
}

export async function parseJsonBody<TSchema extends ZodTypeAny>(
  req: Request,
  schema: TSchema
): Promise<z.infer<TSchema>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new AppError(ERRORS.COMMON.VALIDATION_FAILED);
  }
  return schema.parse(raw);
}

/** Cho các route mà body là tùy chọn (POST rỗng hợp lệ). */
export async function parseOptionalJsonBody<TSchema extends ZodTypeAny>(
  req: Request,
  schema: TSchema
): Promise<z.infer<TSchema>> {
  const text = await req.text();
  if (!text.trim()) return schema.parse({});
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new AppError(ERRORS.COMMON.VALIDATION_FAILED);
  }
  return schema.parse(raw);
}

export function parseSearchParams<TSchema extends ZodTypeAny>(req: NextRequest, schema: TSchema): z.infer<TSchema> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams));
}
