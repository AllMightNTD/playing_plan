import { describe, it, expect } from "vitest";
import {
  getModalBackdropClasses,
  getModalShellClasses,
  getModalHeaderClasses,
  getModalBodyClasses,
  getModalFooterClasses,
} from "./modal-layout";

describe("modal-layout helpers", () => {
  it("trả về class backdrop không có overflow-y-auto và có căn giữa chuẩn", () => {
    const classes = getModalBackdropClasses();
    expect(classes).toContain("fixed inset-0");
    expect(classes).toContain("items-center");
    expect(classes).toContain("justify-center");
    expect(classes).not.toContain("overflow-y-auto");
  });

  it("trả về class shell có max-h dvh, flex-col và overflow-hidden", () => {
    const classes = getModalShellClasses("lg");
    expect(classes).toContain("flex flex-col");
    expect(classes).toContain("overflow-hidden");
    expect(classes).toMatch(/max-h-\[\d+dvh\]/);
    expect(classes).toContain("max-w-4xl");
  });

  it("trả về class shell theo các size khác nhau", () => {
    expect(getModalShellClasses("sm")).toContain("max-w-sm");
    expect(getModalShellClasses("md")).toContain("max-w-md");
    expect(getModalShellClasses("xl")).toContain("max-w-5xl");
    expect(getModalShellClasses()).toContain("max-w-4xl");
  });

  it("trả về class header có shrink-0 và border-b", () => {
    const classes = getModalHeaderClasses();
    expect(classes).toContain("shrink-0");
    expect(classes).toContain("border-b");
  });

  it("trả về class body có flex-1 và overflow-y-auto", () => {
    const classes = getModalBodyClasses();
    expect(classes).toContain("flex-1");
    expect(classes).toContain("overflow-y-auto");
    expect(classes).toContain("overscroll-contain");
  });

  it("trả về class footer có shrink-0 và border-t", () => {
    const classes = getModalFooterClasses();
    expect(classes).toContain("shrink-0");
    expect(classes).toContain("border-t");
  });
});
