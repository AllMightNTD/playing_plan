"use client";

import React from "react";

export type ViewportMode = "auto" | "desktop" | "tablet" | "mobile";

interface DeviceSwitcherBarProps {
  currentMode: ViewportMode;
  onModeChange: (mode: ViewportMode) => void;
}

export function DeviceSwitcherBar({ currentMode, onModeChange }: DeviceSwitcherBarProps) {
  return (
    <header className="sticky top-0 z-50 bg-[#261E1B]/95 backdrop-blur-md border-b border-[#4A3B34] px-3 py-1.5 text-[#FAF4E8] flex flex-wrap items-center justify-between gap-2 text-xs select-none">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-terracotta text-white font-bold text-xs shadow">
          ♥
        </span>
        <span className="font-serif font-bold text-sm tracking-wide text-[#FADCD2]">
          DateMate Scrapbook UI
        </span>
        <span className="hidden sm:inline-block text-[#B39E93] text-[11px]">
          • Navbar cố định tự động Active khi cuộn (Scrollspy)
        </span>
      </div>

      <div className="flex items-center gap-1.5 bg-[#382C27] p-1 rounded-lg border border-[#52413A]">
        <button
          onClick={() => onModeChange("auto")}
          className={`px-2.5 py-1 rounded-md font-medium transition ${
            currentMode === "auto"
              ? "bg-brand-terracotta text-white shadow-sm font-bold"
              : "text-[#DFCDBE] hover:text-white"
          }`}
        >
          ↔️ Tự động (Full)
        </button>
        <button
          onClick={() => onModeChange("desktop")}
          className={`px-2.5 py-1 rounded-md font-medium transition hidden md:inline-block ${
            currentMode === "desktop"
              ? "bg-brand-terracotta text-white shadow-sm font-bold"
              : "text-[#DFCDBE] hover:text-white"
          }`}
        >
          🖥️ Web Desktop
        </button>
        <button
          onClick={() => onModeChange("tablet")}
          className={`px-2.5 py-1 rounded-md font-medium transition ${
            currentMode === "tablet"
              ? "bg-brand-terracotta text-white shadow-sm font-bold"
              : "text-[#DFCDBE] hover:text-white"
          }`}
        >
          📱 Tablet (iPad)
        </button>
        <button
          onClick={() => onModeChange("mobile")}
          className={`px-2.5 py-1 rounded-md font-medium transition ${
            currentMode === "mobile"
              ? "bg-brand-terracotta text-white shadow-sm font-bold"
              : "text-[#DFCDBE] hover:text-white"
          }`}
        >
          📲 Mobile (iPhone)
        </button>
      </div>
    </header>
  );
}
