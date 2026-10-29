"use client";

import React from "react";
import { useApp } from "@/context/AppContext";

export function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div
      id="toastContainer"
      className="fixed bottom-24 md:bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none select-none max-w-xs sm:max-w-sm"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`bg-[#231A16] text-[#FFFDF9] border-2 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center justify-between gap-2.5 pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-300 ${
            toast.type === "error" ? "border-red-400" : "border-brand-coral"
          }`}
        >
          <span className="leading-snug">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-[#CBB292] hover:text-white text-xs px-1"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
