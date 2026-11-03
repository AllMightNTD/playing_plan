import { describe, expect, it } from "vitest";
import { getAffectedRows } from "./client";

describe("getAffectedRows", () => {
  it("should extract rowsAffected from TiDB Cloud Serverless response", () => {
    expect(getAffectedRows({ rowsAffected: 1 })).toBe(1);
    expect(getAffectedRows({ rowsAffected: 5 })).toBe(5);
    expect(getAffectedRows({ rowsAffected: 0 })).toBe(0);
  });

  it("should extract affectedRows from mysql2 response array", () => {
    expect(getAffectedRows([{ affectedRows: 2 }])).toBe(2);
    expect(getAffectedRows([{ affectedRows: 0 }])).toBe(0);
  });

  it("should extract direct affectedRows property", () => {
    expect(getAffectedRows({ affectedRows: 3 })).toBe(3);
  });

  it("should return 0 for null, undefined, empty array or non-matching structures", () => {
    expect(getAffectedRows(null)).toBe(0);
    expect(getAffectedRows(undefined)).toBe(0);
    expect(getAffectedRows([])).toBe(0);
    expect(getAffectedRows({})).toBe(0);
    expect(getAffectedRows("unknown")).toBe(0);
  });
});
