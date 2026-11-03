import { describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  DEFAULT_ADMIN_EMAIL,
  isAllowedAdminEmail,
  signAdminToken,
  verifyAdminToken,
} from "./admin-auth";

describe("admin-auth", () => {
  it("should enforce 7-day session token duration", () => {
    expect(ADMIN_SESSION_MAX_AGE_SECONDS).toBe(7 * 24 * 60 * 60);
    expect(ADMIN_SESSION_MAX_AGE_SECONDS).toBe(604800);
  });
  describe("isAllowedAdminEmail", () => {
    it("should allow DEFAULT_ADMIN_EMAIL", () => {
      expect(isAllowedAdminEmail(DEFAULT_ADMIN_EMAIL)).toBe(true);
      expect(isAllowedAdminEmail("ADMIN@DATEMATE.VN")).toBe(true);
    });

    it("should reject null or empty email", () => {
      expect(isAllowedAdminEmail(null)).toBe(false);
      expect(isAllowedAdminEmail("")).toBe(false);
      expect(isAllowedAdminEmail(undefined)).toBe(false);
    });

    it("should reject unauthorized email", () => {
      expect(isAllowedAdminEmail("stranger@gmail.com")).toBe(false);
    });
  });

  describe("signAdminToken & verifyAdminToken", () => {
    it("should sign and verify valid admin token", () => {
      const email = "admin@datemate.vn";
      const token = signAdminToken(email);
      expect(token).toContain(".");

      const verified = verifyAdminToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.email).toBe(email);
    });

    it("should reject tampered token", () => {
      const token = signAdminToken("admin@datemate.vn");
      const [data, sig] = token.split(".");
      const tampered = `${data}.${sig.slice(0, -4)}xxxx`;
      expect(verifyAdminToken(tampered)).toBeNull();
    });

    it("should reject invalid token formats", () => {
      expect(verifyAdminToken("")).toBeNull();
      expect(verifyAdminToken("not-a-token")).toBeNull();
      expect(verifyAdminToken(null)).toBeNull();
      expect(verifyAdminToken(undefined)).toBeNull();
    });
  });
});
