import { expect } from "vitest";
import { AppError } from "@/server/http/errors";
import type { MemberSession } from "@/server/db/repositories/types";

/**
 * Kiểm tra tính cô lập phòng (Room Isolation):
 * Khi User thuộc Phòng B truy cập tài nguyên thuộc Phòng A,
 * API/Service bắt buộc ném lỗi 404 (NOT_FOUND) hoặc 401 (UNAUTHORIZED),
 * tuyệt đối không trả về 200 hay để lộ dữ liệu của Phòng A.
 */
export async function assertRoomIsolation(
  action: () => Promise<unknown>,
  expectedErrorCodes: string[] = ["NOT_FOUND", "UNAUTHORIZED", "FORBIDDEN"]
): Promise<void> {
  let threw = false;
  try {
    await action();
  } catch (err) {
    threw = true;
    if (err instanceof AppError) {
      const codeMatches = expectedErrorCodes.some(
        (code) => err.definition.code.includes(code) || err.definition.status === 404 || err.definition.status === 401
      );
      expect(
        codeMatches,
        `Kỳ vọng mã lỗi thuộc ${expectedErrorCodes.join(", ")}, nhưng nhận được: ${err.definition.code} (${err.definition.status})`
      ).toBe(true);
    } else {
      throw err;
    }
  }
  expect(threw, "Lỗ hổng bảo mật: Thao tác trái phòng không ném lỗi mà chạy thành công!").toBe(true);
}
