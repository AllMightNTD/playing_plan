"use client";

import React, { useState } from "react";
import { Undo2, AlertTriangle, Check, X } from "lucide-react";

interface BatchRollbackDialogProps {
  onRollbackSuccess?: () => void;
}

export function BatchRollbackDialog({ onRollbackSuccess }: BatchRollbackDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [batchId, setBatchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleRollback = async () => {
    if (!batchId.trim()) return;
    setLoading(true);
    setResultMsg(null);

    try {
      const res = await fetch("/api/v1/admin/pipeline/rollback-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: batchId.trim() }),
      });
      const json = await res.json();

      if (res.ok) {
        setResultMsg({
          type: "success",
          text: `Đã thu hồi thành công ${json.data?.affectedCount ?? 0} địa điểm khỏi danh mục public.`,
        });
        setBatchId("");
        if (onRollbackSuccess) onRollbackSuccess();
      } else {
        setResultMsg({
          type: "error",
          text: json.error?.message || "Lỗi khi thu hồi đợt xuất bản",
        });
      }
    } catch (e) {
      setResultMsg({ type: "error", text: "Lỗi kết nối máy chủ" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          setResultMsg(null);
        }}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-colors"
      >
        <Undo2 className="w-4 h-4" />
        <span>Thu Hồi Đợt Xuất Bản (Rollback)</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full border border-slate-200 shadow-xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                <AlertTriangle className="w-5 h-5" />
                <h3>Thu Hồi Đợt Xuất Bản Tự Động</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Nhập mã định danh đợt xuất bản (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">batch_id</code>). 
              Toàn bộ các địa điểm thuộc đợt này sẽ lập tức được chuyển về trạng thái <span className="font-semibold text-slate-800">downgraded / draft</span> trong một transaction duy nhất.
            </p>

            <div className="space-y-3 mb-5">
              <label className="block text-xs font-medium text-slate-700">Mã đợt (Batch ID):</label>
              <input
                type="text"
                placeholder="ví dụ: batch_auto_promote_173000..."
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            {resultMsg && (
              <div
                className={`p-3 rounded-lg text-xs mb-4 flex items-center gap-2 ${
                  resultMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {resultMsg.type === "success" ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{resultMsg.text}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleRollback}
                disabled={loading || !batchId.trim()}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? "Đang thu hồi..." : "Xác nhận thu hồi ngay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
