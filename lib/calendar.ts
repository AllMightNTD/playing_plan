import { vietnamLocalToUtc } from "@/lib/datetime";

export interface CalendarPlanInput {
  id: string;
  title: string;
  planDate: string; // YYYY-MM-DD (giờ Việt Nam)
  startTime: string; // HH:mm (giờ Việt Nam)
  durationMin: number;
  note?: string | null;
  location?: string | null;
}

const MAX_LINE_OCTETS = 75;
const DEFAULT_DESCRIPTION = "Buổi hẹn hò cùng DateMate 💕";
const DEFAULT_LOCATION = "Hà Nội";
const utf8 = new TextEncoder();

/** RFC 5545: dạng UTC "YYYYMMDDTHHMMSSZ" để mọi app lịch hiểu đúng múi giờ. */
function toIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** RFC 5545 §3.3.11: escape \ ; , và xuống dòng trong giá trị TEXT. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** RFC 5545 §3.1: gập dòng dài hơn 75 octet, không cắt giữa ký tự UTF-8. */
export function foldIcsLine(line: string): string {
  const parts: string[] = [];
  let current = "";
  let currentOctets = 0;

  for (const char of line) {
    const charOctets = utf8.encode(char).length;
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    if (currentOctets + charOctets > limit) {
      parts.push(current);
      current = "";
      currentOctets = 0;
    }
    current += char;
    currentOctets += charOctets;
  }
  parts.push(current);

  return parts.join("\r\n ");
}

/**
 * Sinh file iCalendar (.ics) cho kế hoạch, kèm 2 mốc nhắc: trước 1 ngày và trước 2 giờ (F08).
 */
export function generateIcsCalendar(plan: CalendarPlanInput, now: Date = new Date()): string {
  const start = vietnamLocalToUtc(plan.planDate, plan.startTime);
  const end = new Date(start.getTime() + plan.durationMin * 60 * 1000);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DateMate//Date Planner//VI",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:plan-${plan.id}@datemate.vn`,
    `DTSTAMP:${toIcsUtc(now)}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(`Hẹn hò: ${plan.title}`)}`,
    `DESCRIPTION:${escapeIcsText(plan.note || DEFAULT_DESCRIPTION)}`,
    `LOCATION:${escapeIcsText(plan.location || DEFAULT_LOCATION)}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText("Ngày mai hai bạn có lịch hẹn hò nè!")}`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText("Sắp đến giờ hẹn rồi, chuẩn bị thôi!")}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
