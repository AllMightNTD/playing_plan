"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";

        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-peach-lg border backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-4 duration-300",
              isSuccess
                ? "bg-white/95 border-sage/40 text-brown"
                : isError
                ? "bg-white/95 border-peach-deep/40 text-brown"
                : "bg-white/95 border-peach/40 text-brown"
            )}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-sage" />
              ) : isError ? (
                <AlertCircle className="w-5 h-5 text-peach-deep" />
              ) : (
                <Info className="w-5 h-5 text-peach" />
              )}
            </div>

            <p className="flex-1 text-xs font-medium leading-relaxed">
              {toast.message}
            </p>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-brown-muted hover:text-brown p-0.5 rounded-lg transition"
              aria-label="Đóng"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
