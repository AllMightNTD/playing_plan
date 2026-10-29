"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import {
  Camera,
  Calendar,
  ShieldCheck,
  Star,
  Lock,
  Upload,
  Trash2,
} from "lucide-react";
import { VirtualVideoCanvas } from "@/components/scrapbook/VirtualVideoCanvas";

interface MemoryItem {
  id: string;
  title: string;
  date: string;
  rating: number;
  journal: string;
  compressedInfo: string;
  emojis: string[];
  imageUrl?: string;
}

interface UploadedPhotoItem {
  id: string;
  url: string;
  fileName: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // States
  const [memories] = useState<MemoryItem[]>(INITIAL_MEMORIES);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhotoItem[]>([]);
  const [hasConsent, setHasConsent] = useState(true);
  const [storageUsedBytes, setStorageUsedBytes] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [videoRefreshTrigger, setVideoRefreshTrigger] = useState(0);

  // Hàm định dạng dung lượng thông minh (hiển thị KB khi < 1MB, MB khi >= 1MB)
  const formatBytes = (bytes: number) => {
    if (bytes <= 0) return "0 KB";
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Load thông tin phòng & danh sách ảnh thực tế từ Backend
  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        // 1. Lấy thông tin phòng & quota
        const roomRes = await fetch("/api/v1/user/rooms/me");
        if (roomRes.ok) {
          const roomJson = await roomRes.json();
          if (!ignore && roomJson.data?.room) {
            setStorageUsedBytes(roomJson.data.room.storageUsedBytes || 0);
            setPhotoCount(roomJson.data.room.photoCount || 0);
            if (roomJson.data.room.consentVersion) {
              setHasConsent(true);
            }
          }
        }

        // 2. Lấy danh sách ảnh đã tải lên
        const uploadRes = await fetch("/api/v1/user/uploads");
        if (uploadRes.ok) {
          const uploadJson = await uploadRes.json();
          if (!ignore && Array.isArray(uploadJson.data)) {
            setUploadedPhotos(uploadJson.data);
          }
        }
      } catch {
        // Fallback khi offline
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  // Thay đổi đồng thuận Nghị định 13
  const handleToggleConsent = async (checked: boolean) => {
    setHasConsent(checked);
    if (checked) {
      try {
        await fetch("/api/v1/user/rooms/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consentVersion: "2026.1" }),
        });
        addToast("☑️ Đã đồng thuận Nghị định 13/2023/NĐ-CP (lưu trữ ảnh ngoài web root).", "success");
      } catch {
        // Ignored
      }
    } else {
      addToast("⚠️ Bạn đã tắt đồng thuận Nghị định 13/2023 — Không thể tải ảnh mới!", "info");
    }
  };

  // Upload ảnh thật từ máy người dùng
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!hasConsent) {
      addToast("🚫 Bạn cần tích chọn đồng thuận Nghị định 13/2023 trước khi tải ảnh!", "error");
      return;
    }

    setIsUploading(true);
    try {
      // Đảm bảo consent đã được lưu trên server
      await fetch("/api/v1/user/rooms/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentVersion: "2026.1" }),
      });

      let uploadSuccessCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("memoryId", "memory-hanoi-autumn");

        const res = await fetch("/api/v1/user/uploads", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const json = await res.json();
          const uploadData = json.data as UploadedPhotoItem;
          uploadSuccessCount++;
          addToast(`📸 Tải lên thành công: ${file.name} (${Math.round(uploadData.sizeBytes / 1024)} KB WebP)!`, "success");

          setUploadedPhotos((prev) => [uploadData, ...prev]);
        } else {
          const errJson = await res.json().catch(() => ({}));
          const errMsg = errJson?.error?.message || "Không thể tải ảnh lên";
          addToast(`❌ Lỗi tải ảnh ${file.name}: ${errMsg}`, "error");
        }
      }

      if (uploadSuccessCount > 0) {
        // Đồng bộ lại dung lượng và số ảnh chính xác từ Database
        const roomRes = await fetch("/api/v1/user/rooms/me");
        if (roomRes.ok) {
          const roomJson = await roomRes.json();
          if (roomJson.data?.room) {
            setStorageUsedBytes(roomJson.data.room.storageUsedBytes || 0);
            setPhotoCount(roomJson.data.room.photoCount || 0);
          }
        }
        // Kích hoạt nạp lại thước phim Ken Burns với ảnh vừa tải
        setVideoRefreshTrigger((prev) => prev + 1);
        addToast("✨ Đã cập nhật thước phim kỷ niệm với ảnh thật vừa tải lên!", "success");
      }
    } catch {
      addToast("❌ Lỗi mạng khi tải ảnh lên, vui lòng kiểm tra kết nối.", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Xóa ảnh đã tải lên
  const handleDeleteUpload = async (uploadId: string) => {
    try {
      const res = await fetch(`/api/v1/user/uploads/${uploadId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        addToast("🗑️ Đã xóa ảnh kỷ niệm và hoàn trả dung lượng phòng.", "info");
        setUploadedPhotos((prev) => prev.filter((p) => p.id !== uploadId));

        // Đồng bộ lại phòng & nạp lại slide
        const roomRes = await fetch("/api/v1/user/rooms/me");
        if (roomRes.ok) {
          const roomJson = await roomRes.json();
          if (roomJson.data?.room) {
            setStorageUsedBytes(roomJson.data.room.storageUsedBytes || 0);
            setPhotoCount(roomJson.data.room.photoCount || 0);
          }
        }
        setVideoRefreshTrigger((prev) => prev + 1);
      } else {
        addToast("Không thể xóa ảnh, vui lòng thử lại.", "error");
      }
    } catch {
      addToast("Lỗi kết nối khi xóa ảnh.", "error");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Year in Review Banner (F11 Scrapbook Album) */}
      <div className="relative overflow-hidden rounded-3xl bg-[#FFFDF9] border border-[#E6D7C3] p-5 sm:p-7 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="washi-tape washi-terracotta -top-3.5 left-10" />

        <div className="space-y-1.5 max-w-xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-terracotta flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" />
            <span>Kho Kỷ Niệm Cặp Đôi • Thước Phim Ken Burns & Lưu Trữ Riêng Tư</span>
          </span>
          <h3 className="font-serif font-extrabold text-2xl sm:text-3xl text-paper-ink">
            Thước Phim & Nhật Ký Kỷ Niệm 💕
          </h3>
          <p className="text-xs sm:text-sm text-paper-muted leading-relaxed">
            Xem lại hành trình hẹn hò qua hiệu ứng điện ảnh Ken Burns 60fps, nhạc Lo-Fi chuyển phách tự động và lưu trữ ảnh an toàn tuyệt đối.
          </p>
        </div>
      </div>

      {/* 2-Column Responsive Layout: Left (Canvas + Lo-Fi) & Right (Upload Zone & Quota) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI (7/12): CANVAS KEN BURNS 60FPS + ĐĨA THAN BEAT-SYNC */}
        <div className="lg:col-span-7">
          <VirtualVideoCanvas
            memoryId="memory-hanoi-autumn"
            initialTrackId="hanoi-autumn-lofi"
            onToast={addToast}
            refreshTrigger={videoRefreshTrigger}
          />
        </div>

        {/* CỘT PHẢI (5/12): TẢI ẢNH THỰC TẾ + QUOTA 25MB + NGHỊ ĐỊNH 13 */}
        <div className="lg:col-span-5 bg-[#FFFDF9] border-2 border-[#CBB292] rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-brand-olive flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                <span>Lưu Trữ Ảnh An Toàn (Sharp WebP)</span>
              </span>
              <span className="text-[11px] font-mono bg-[#EFE5D4] px-2 py-0.5 rounded font-bold text-paper-ink">
                Bảo vệ ngoài Web Root
              </span>
            </div>

            {/* Thanh Quota 25MB & 50 ảnh */}
            <div className="bg-[#FAF4E8] border border-[#D8CBB8] rounded-xl p-3 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-paper-ink">Dung lượng phòng:</span>
                <span className="text-brand-terracotta">{formatBytes(storageUsedBytes)} / 25.0 MB</span>
              </div>
              <div className="w-full bg-[#E5D8C5] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-brand-terracotta h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(storageUsedBytes > 0 ? 2 : 0, (storageUsedBytes / (25 * 1024 * 1024)) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-paper-muted font-semibold">
                <span>
                  Đã tải: <strong className="text-paper-ink">{photoCount} / 50 ảnh</strong>
                </span>
                <span>Tự động tối ưu WebP</span>
              </div>
            </div>

            {/* Checkbox đồng thuận Nghị định 13/2023/NĐ-CP */}
            <label className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FFF9F2] border border-brand-coral cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={hasConsent}
                onChange={(e) => handleToggleConsent(e.target.checked)}
                className="mt-0.5 accent-brand-terracotta"
              />
              <span className="text-[11px] text-paper-ink leading-relaxed">
                <strong>Đồng thuận Nghị định 13/2023/NĐ-CP:</strong> Tôi đồng ý lưu trữ ảnh kỷ niệm bảo mật ngoài web root và tự động xóa vĩnh viễn sau 14 ngày khi giải tán phòng.
              </span>
            </label>

            {/* Khu Vực Tải Ảnh Thật Từ Máy */}
            <div className="pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#CBB292] hover:border-brand-terracotta bg-[#FAF4E8]/60 hover:bg-[#FAF4E8] rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 group"
              >
                <div className="w-12 h-12 rounded-full bg-brand-peach flex items-center justify-center text-brand-terracotta group-hover:scale-110 transition shadow-xs">
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-brand-terracotta border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <span className="font-bold text-xs sm:text-sm text-paper-ink block">
                    {isUploading ? "Đang xử lý nén & tải ảnh lên..." : "Bấm để chọn ảnh từ máy của bạn"}
                  </span>
                  <span className="text-[11px] text-paper-muted block mt-0.5">
                    Hỗ trợ JPG, PNG, WebP (Tối đa 16MP, tự động xóa EXIF GPS)
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isUploading}
                  className="mt-1 bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition disabled:opacity-50"
                >
                  {isUploading ? "Đang tải lên..." : "📁 Chọn ảnh từ thiết bị"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Memory Cards Grid - Corkboard style */}
      <div className="pt-4">
        <h4 className="font-serif font-extrabold text-xl text-paper-ink mb-4">
          📌 Thẻ Polaroid Kỷ Niệm Đã Ghim ({uploadedPhotos.length + memories.length} khoảnh khắc)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. Các ảnh thật vừa được người dùng tải lên */}
          {uploadedPhotos.map((photo, idx) => (
            <div
              key={photo.id}
              className="bg-[#FFFDF9] rounded-3xl p-4 sm:p-5 border border-[#E6D7C3] shadow-xs space-y-3 hover:shadow-md transition flex flex-col justify-between relative group"
            >
              <div
                className={`washi-tape ${
                  idx % 2 === 0 ? "washi-olive -top-3.5 left-6" : "washi-terracotta -top-3.5 right-6"
                }`}
              />

              <div className="space-y-2">
                <div className="w-full aspect-4/3 rounded-2xl overflow-hidden bg-black/5 relative border border-[#E6D7C3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.fileName}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-paper-ink truncate max-w-[180px]">
                    {photo.fileName}
                  </span>
                  <span className="text-[11px] text-paper-muted font-mono">
                    {new Date(photo.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E6D7C3] flex items-center justify-between text-[11px] font-mono">
                <span className="text-brand-olive font-semibold">
                  ✅ {Math.round(photo.sizeBytes / 1024)} KB WebP
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteUpload(photo.id)}
                  className="text-red-600 hover:text-red-800 font-bold flex items-center gap-1 font-sans text-xs transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>
              </div>
            </div>
          ))}

          {/* 2. Các thẻ kỷ niệm có sẵn */}
          {memories.map((m, idx) => (
            <div
              key={m.id}
              className="bg-[#FFFDF9] rounded-3xl p-5 sm:p-6 border border-[#E6D7C3] shadow-xs space-y-4 hover:shadow-md transition flex flex-col justify-between relative group"
            >
              <div
                className={`washi-tape ${
                  idx % 2 === 0 ? "washi-olive -top-3.5 left-6" : "washi-terracotta -top-3.5 right-6"
                }`}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-terracottaDark bg-brand-peach px-3 py-1 rounded-full flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{m.date}</span>
                  </span>
                  <div className="flex items-center text-amber-500">
                    {Array.from({ length: m.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                </div>

                <h4 className="font-serif font-extrabold text-base sm:text-lg text-paper-ink">
                  {m.title}
                </h4>

                <p className="text-xs sm:text-sm text-paper-ink font-hand text-base leading-relaxed italic">
                  &ldquo;{m.journal}&rdquo;
                </p>

                <div className="flex items-center gap-2 pt-1">
                  {m.emojis.map((e, eIdx) => (
                    <div
                      key={eIdx}
                      className="w-12 h-12 rounded-2xl bg-[#FAF4E8] border border-[#E6D7C3] flex items-center justify-center text-xl shadow-inner group-hover:scale-105 transition"
                    >
                      {e}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E6D7C3] flex flex-wrap items-center justify-between gap-2 text-[11px] text-brand-olive font-mono">
                <span className="font-semibold">✅ {m.compressedInfo}</span>
                <span className="flex items-center gap-1 text-paper-muted">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-olive" />
                  <span>Đã xóa EXIF GPS</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
