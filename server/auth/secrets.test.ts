import { describe, expect, it } from "vitest";
import { formatInviteCode, normalizeInviteCode } from "@/server/auth/secrets";
import { joinRoomBodySchema } from "@/lib/validators/user";

describe("invite code", () => {
  it("chấp nhận mã đúng như đang hiển thị (DM-XXXX-XXXX)", () => {
    const shown = formatInviteCode("ABCD2345");
    expect(shown).toBe("DM-ABCD-2345");
    expect(normalizeInviteCode(shown)).toBe("ABCD2345");
    expect(joinRoomBodySchema.parse({ code: shown }).code).toBe("ABCD2345");
  });

  it("không cắt nhầm mã thật bắt đầu bằng DM", () => {
    expect(normalizeInviteCode("DMXY2345")).toBe("DMXY2345");
    expect(formatInviteCode("DMXY2345")).toBe("DM-DMXY-2345");
    expect(normalizeInviteCode("DM-DMXY-2345")).toBe("DMXY2345");
    expect(joinRoomBodySchema.parse({ code: "dm-dmxy-2345" }).code).toBe("DMXY2345");
  });

  it("chấp nhận mã gõ trần, chữ thường, có khoảng trắng", () => {
    expect(joinRoomBodySchema.parse({ code: "abcd 2345" }).code).toBe("ABCD2345");
  });
});
