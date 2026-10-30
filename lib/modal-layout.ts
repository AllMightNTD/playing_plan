export type ModalSize = "sm" | "md" | "lg" | "xl";

export function getModalBackdropClasses(): string {
  return "fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 md:p-6 animate-in fade-in duration-200";
}

export function getModalShellClasses(size: ModalSize = "lg"): string {
  const sizeMap: Record<ModalSize, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-4xl",
    xl: "max-w-5xl",
  };

  return `bg-[#FAF4E8] border-2 border-paper-ink rounded-3xl w-full ${sizeMap[size]} max-h-[92dvh] sm:max-h-[88dvh] flex flex-col shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 select-none`;
}

export function getModalHeaderClasses(): string {
  return "flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 bg-[#FAF4E8] border-b border-[#E6D7C3] shrink-0 z-20";
}

export function getModalBodyClasses(): string {
  return "flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 overscroll-contain select-text";
}

export function getModalFooterClasses(): string {
  return "shrink-0 px-4 sm:px-6 py-3 sm:py-3.5 bg-[#FAF4E8]/95 backdrop-blur-xs border-t border-dashed border-[#CBB292] flex flex-wrap items-center justify-between gap-3 z-20";
}
