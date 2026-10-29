export interface AdminApiFailure {
  ok: false;
  /** 0 = lỗi mạng, không nhận được phản hồi. */
  status: number;
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export type AdminApiResult<T> = { ok: true; data: T } | AdminApiFailure;

/** Gọi API admin và chuẩn hóa về `{ ok, data }` hoặc lỗi `{ code, message }` từ handleRoute. */
export async function adminFetch<T>(url: string, init?: RequestInit): Promise<AdminApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", ...init });
  } catch {
    return { ok: false, status: 0, code: "NETWORK_ERROR", message: "Không kết nối được máy chủ." };
  }

  const json = (await res.json().catch(() => null)) as
    | { data?: T; error?: { code?: string; message?: string; fields?: Record<string, string> } }
    | null;
  if (res.ok && json && "data" in json) return { ok: true, data: json.data as T };

  return {
    ok: false,
    status: res.status,
    code: json?.error?.code ?? "UNKNOWN_ERROR",
    message: json?.error?.message ?? `Máy chủ trả lỗi ${res.status}.`,
    fields: json?.error?.fields,
  };
}

export function isAdminAuthFailure(failure: AdminApiFailure): boolean {
  return failure.status === 401 || failure.status === 403;
}
