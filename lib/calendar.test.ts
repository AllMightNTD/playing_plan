import { describe, it, expect } from "vitest";
import { escapeIcsText, foldIcsLine, generateIcsCalendar } from "./calendar";

const BASE_PLAN = {
  id: "plan-1",
  title: "Hồ Tây",
  planDate: "2026-11-01",
  startTime: "16:30",
  durationMin: 180,
};
const NOW = new Date("2026-10-27T08:00:00Z");

describe("generateIcsCalendar", () => {
  it("should convert Vietnam local time to UTC", () => {
    const ics = generateIcsCalendar(BASE_PLAN, NOW);
    expect(ics).toContain("DTSTART:20261101T093000Z");
    expect(ics).toContain("DTEND:20261101T123000Z");
    expect(ics).toContain("DTSTAMP:20261027T080000Z");
  });

  it("should roll the end time over to the next day for late dates", () => {
    const ics = generateIcsCalendar({ ...BASE_PLAN, startTime: "22:00" }, NOW);
    expect(ics).toContain("DTSTART:20261101T150000Z");
    expect(ics).toContain("DTEND:20261101T180000Z");
  });

  it("should include both reminder alarms and CRLF line endings", () => {
    const ics = generateIcsCalendar(BASE_PLAN, NOW);
    expect(ics).toContain("TRIGGER:-P1D");
    expect(ics).toContain("TRIGGER:-PT2H");
    expect(ics.split("\r\n").every((line) => !line.includes("\n"))).toBe(true);
  });

  it("should escape special characters in user text", () => {
    const ics = generateIcsCalendar({ ...BASE_PLAN, note: "Mang ô; áo mưa, sạc\ndự phòng" }, NOW);
    expect(ics).toContain("DESCRIPTION:Mang ô\\; áo mưa\\, sạc\\ndự phòng");
  });
});

describe("escapeIcsText", () => {
  it("should escape backslash before other characters", () => {
    expect(escapeIcsText("a\\b;c")).toBe("a\\\\b\\;c");
  });
});

describe("foldIcsLine", () => {
  it("should keep every physical line within 75 octets without splitting UTF-8 characters", () => {
    const folded = foldIcsLine(`SUMMARY:${"Hẹn hò ở Hồ Gươm ".repeat(10)}`);
    const encoder = new TextEncoder();
    const lines = folded.split("\r\n");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => encoder.encode(line).length <= 75)).toBe(true);
    expect(lines.slice(1).every((line) => line.startsWith(" "))).toBe(true);
    expect(lines.map((line, i) => (i === 0 ? line : line.slice(1))).join("")).toBe(
      `SUMMARY:${"Hẹn hò ở Hồ Gươm ".repeat(10)}`
    );
  });
});
