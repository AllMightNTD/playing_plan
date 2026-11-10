import { beforeEach, afterEach, describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  DEFAULT_ADMIN_EMAIL,
  isAllowedAdminEmail,
  getExpectedAdminPassword,
  signAdminToken,
  verifyAdminToken,
} from "./admin-auth";

describe("admin-auth", () => {
  const origAuthSecret = process.env.AUTH_SECRET;
  const origAdminPassword = process.env.ADMIN_PASSWORD;

  beforeEach(() => {
    process.env.AUTH_SECRET = "test-auth-secret-key-for-unit-tests-1234";
    process.env.ADMIN_PASSWORD = "test-admin-password-secret-5678";
  });

  afterEach(() => {
    process.env.AUTH_SECRET = origAuthSecret;
    process.env.ADMIN_PASSWORD = origAdminPassword;
  });

  it("should enforce 7-day session token duration", () => {
    expect(ADMIN_SESSION_MAX_AGE_SECONDS).toBe(7 * 24 * 60 * 60);
    expect(ADMIN_SESSION_MAX_AGE_SECONDS).toBe(604800);
  });

  describe("getExpectedAdminPassword", () => {
    it("should return ADMIN_PASSWORD from env", () => {
      expect(getExpectedAdminPassword()).toBe("test-admin-password-secret-5678");
    });

    it("should throw error if ADMIN_PASSWORD is not set", () => {
      delete process.env.ADMIN_PASSWORD;
      expect(() => getExpectedAdminPassword()).toThrow("ADMIN_PASSWORD environment variable is required");
    });
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

    it("should honor explicit ADMIN_EMAILS_ALLOWLIST when configured", () => {
      const orig = process.env.ADMIN_EMAILS_ALLOWLIST;
      try {
        process.env.ADMIN_EMAILS_ALLOWLIST = "lead@datemate.vn,tech@datemate.vn";
        expect(isAllowedAdminEmail("lead@datemate.vn")).toBe(true);
        expect(isAllowedAdminEmail("tech@datemate.vn")).toBe(true);
        expect(isAllowedAdminEmail("other@datemate.vn")).toBe(false);
        expect(isAllowedAdminEmail(DEFAULT_ADMIN_EMAIL)).toBe(false);
      } finally {
        process.env.ADMIN_EMAILS_ALLOWLIST = orig;
      }
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

    it("should fail signing and verification when AUTH_SECRET is not configured", () => {
      delete process.env.AUTH_SECRET;
      expect(() => signAdminToken("admin@datemate.vn")).toThrow("AUTH_SECRET is not configured");
      expect(verifyAdminToken("sample.token")).toBeNull();
    });
  });
});
