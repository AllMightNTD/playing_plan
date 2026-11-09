import { afterEach, describe, expect, it } from "vitest";
import { assertDatabaseConfigured, db, isDatabaseConfigured } from "./client";

describe("Lazy TiDB Serverless Client (Cloudflare workerd runtime env support)", () => {
  const originalUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalUrl;
    }
  });

  it("should evaluate DATABASE_URL dynamically at request time rather than freezing at module import", () => {
    delete process.env.DATABASE_URL;
    expect(isDatabaseConfigured()).toBe(false);
    expect(() => assertDatabaseConfigured()).toThrowError("DB_NOT_CONFIGURED");

    // Simulate Cloudflare Worker populating process.env per-isolate after module load
    process.env.DATABASE_URL = "mysql://user:pass@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/datemate?ssl=true";
    expect(isDatabaseConfigured()).toBe(true);
    expect(() => assertDatabaseConfigured()).not.toThrow();
    expect(typeof db.select).toBe("function");
  });
});
