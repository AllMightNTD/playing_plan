"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  Camera,
  UploadCloud,
  Calendar,
  Sparkles,
  ShieldCheck,
  Star,
} from "lucide-react";

interface MemoryItem {
  id: string;
  title: string;
  date: string;
  rating: number;
  journal: string;
  compressedInfo: string;
  emojis: string[];
}

const INITIAL_MEMORIES: MemoryItem[] = [
  {
    id: "m1",
    title: "Buổi chiều thu Phố Phan Đình Phùng & Hồ Gươm",
    date: "18/10/2026",
    rating: 5,
    journal:
      "Nắng xuyên qua hàng sấu đẹp mê hồn, mua được bó cúc họa mi đầu mùa và ăn kem Thủy Tạ.",
    compressedInfo: "3 ảnh • Đã nén Client WebP: 11.4 MB → 480 KB (-95%)",
    emojis: ["🍂", "💐", "🍦"],
  },
  {
    id: "m2",
    title: "Nặn gốm đôi tại Làng gốm Bát Tràng",
    date: "04/10/2026",
    rating: 5,
    journal:
      "Hai đứa làm được đôi cốc méo xẹo nhưng vui hết nấc. Góc xoắn ốc Bảo tàng Gốm lên ảnh siêu chất!",
    compressedInfo: "4 ảnh • Đã nén Client WebP: 14.2 MB → 610 KB (-95%)",
    emojis: ["🏺", "🎨", "💑"],
  },
];

export default function MemoriesPage() {
  const { addToast } = useApp();
  const [memories, setMemories] = useState<MemoryItem[]>(INITIAL_MEMORIES);

  const handleSimulateUpload = () => {
    const newMem: MemoryItem = {
      id: "m-" + Date.now(),
      title: "Hoàng hôn Cầu Long Biên & Cà phê trứng",
      date: "27/10/2026",
      rating: 5,
      journal:
        "Đi đúng khung giờ vàng 17:15 app gợi ý, nắng chiếu qua nhịp cầu sắt đẹp không góc chết!",
      compressedInfo: "5 ảnh • Đã nén Client WebP: 18.6 MB → 720 KB (-96%)",
      emojis: ["🌉", "☕", "🌇"],
    };

    setMemories([newMem, ...memories]);
    addToast(
      "📸 Đã nén ảnh sang WebP (<300KB/ảnh), xóa EXIF GPS và lưu vào Kho kỷ niệm!",
      "success"
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Year in Review Banner (F11 + Cloudflare R2 Free) */}
      <div className="bg-gradient-to-r from-[#3B2A2A] to-[#6B4B4B] text-white rounded-3xl p-5 sm:p-7 flex flex-wrap items-center justify-between gap-4 shadow-peach-lg">
        <div className="space-y-1.5 max-w-xl">
          <span className="text-[11px] font-mono uppercase text-peach flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" />
            <span>F11 • Kho kỷ niệm riêng tư (Cloudflare R2 Free)</span>
          </span>
          <h3 className="font-display font-extrabold text-2xl sm:text-3xl">
            Năm 2026 của Dũng & Linh 💕
          </h3>
          <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
            Đã đi cùng nhau <strong>14 buổi hẹn</strong> • Khu vực yêu thích nhất:{" "}
            <strong>Hoàn Kiếm & Tây Hồ</strong>
          </p>
        </div>

        <button
          onClick={handleSimulateUpload}
          className="px-5 py-3 rounded-2xl bg-peach-deep hover:bg-peach-hover text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-2 active:scale-95"
        >
          <UploadCloud className="w-4 h-4" />
          <span>+ Lưu kỷ niệm mới (Nén WebP)</span>
        </button>
      </div>

      {/* Memory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {memories.map((m) => (
          <div
            key={m.id}
            className="bg-white rounded-3xl p-5 sm:p-6 border border-peach-soft shadow-sm space-y-4 hover:shadow-peach transition flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-peach-deep bg-peach-soft px-3 py-1 rounded-full flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{m.date}</span>
                </span>
                <div className="flex items-center text-amber-500">
                  {Array.from({ length: m.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </div>

              <h4 className="font-display font-extrabold text-base sm:text-lg text-brown">
                {m.title}
              </h4>

              <p className="text-xs sm:text-sm text-brown-muted leading-relaxed italic">
                &ldquo;{m.journal}&rdquo;
              </p>

              {/* Emoji badges */}
              <div className="flex items-center gap-2 pt-1">
                {m.emojis.map((e, idx) => (
                  <div
                    key={idx}
                    className="w-14 h-14 rounded-2xl bg-cream border border-peach-soft flex items-center justify-center text-2xl shadow-inner"
                  >
                    {e}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer with WebP compression and EXIF wipe */}
            <div className="pt-3 border-t border-peach-soft/70 flex flex-wrap items-center justify-between gap-2 text-[11px] text-sage-dark font-mono">
              <span className="font-semibold">✅ {m.compressedInfo}</span>
              <span className="flex items-center gap-1 text-brown-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-sage" />
                <span>Đã xóa EXIF GPS</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
