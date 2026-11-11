"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import imageCompression from "browser-image-compression";
import { useApp } from "@/context/AppContext";
import { VirtualVideoCanvas } from "@/components/scrapbook/VirtualVideoCanvas";
import { MemoryCorkboard } from "@/components/memories/MemoryCorkboard";

const DEFAULT_STORAGE_QUOTA_BYTES = 25 * 1024 * 1024;
const DEFAULT_MAX_PHOTOS = 50;

interface UploadedPhotoItem {
  id: string;
  url: string;
  fileName: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}

type MemoryTab = "corkboard" | "cinema" | "album";

export default function MemoriesPage() {
  const { addToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  const { data: roomData } = useQuery({
    queryKey: ["user", "room-me"],
    queryFn: async () => {
      const res = await fetch("/api/v1/user/rooms/me");
      const json = await res.json().catch(() => null);
      return res.ok && json?.data?.room ? json.data.room : null;
    },
  });

  const { data: uploadedPhotos = [] } = useQuery<UploadedPhotoItem[]>({
    queryKey: ["user", "uploads"],
    queryFn: async () => {
      const res = await fetch("/api/v1/user/uploads");
      const json = await res.json().catch(() => null);
      return res.ok && Array.isArray(json?.data) ? json.data : [];
    },
  });

  // Mobile/Tablet Segmented Tab State
  const [activeTab, setActiveTab] = useState<MemoryTab>("corkboard");

  // States
  const [hasConsent, setHasConsent] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [videoRefreshTrigger, setVideoRefreshTrigger] = useState(0);

  const storageUsedBytes = roomData?.storageUsedBytes || 0;
  const storageQuotaBytes = roomData?.storageQuotaBytes || DEFAULT_STORAGE_QUOTA_BYTES;
  const photoCount = roomData?.photoCount || 0;
  const maxPhotos = roomData?.maxPhotos || DEFAULT_MAX_PHOTOS;

  useEffect(() => {
    if (roomData?.consentVersion) {
      setHasConsent(true);
    }
  }, [roomData]);

  // Định dạng dung lượng thông minh (KB khi < 1MB, MB khi >= 1MB)
  const formatBytes = (bytes: number) => {
    if (bytes <= 0) return "0 KB";
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

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
        addToast("🔒 Đã bật chế độ lưu trữ ảnh kỷ niệm riêng tư cho phòng đôi.", "success");
      } catch {
        // Ignored
      }
    } else {
      addToast("⚠️ Bạn cần bật xác nhận quyền riêng tư bên dưới để tải ảnh mới vào Album chung.", "info");
    }
  };

  // Upload ảnh thật từ máy người dùng
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!hasConsent) {
      addToast("💌 Hãy tích chọn ô xác nhận quyền riêng tư bên dưới trước khi tải ảnh nhé!", "error");
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
        const rawFile = files[i];
        const compressedBlob = await imageCompression(rawFile, {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 2048,
          initialQuality: 0.85,
          fileType: "image/webp",
          useWebWorker: true,
        }).catch(() => rawFile);
        const baseName = rawFile.name.replace(/\.[^.]+$/, "") || "photo";
        const uploadFile =
          compressedBlob.type === "image/webp"
            ? new File([compressedBlob], `${baseName}.webp`, { type: "image/webp" })
            : rawFile;

        const formData = new FormData();
        formData.append("file", uploadFile);

        const res = await fetch("/api/v1/user/uploads", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const json = await res.json();
          const uploadData = json.data as UploadedPhotoItem;
          uploadSuccessCount++;
          addToast(`📸 Đã thêm ảnh kỷ niệm: ${rawFile.name} (${Math.round(uploadData.sizeBytes / 1024)} KB)!`, "success");

          queryClient.setQueryData<UploadedPhotoItem[]>(["user", "uploads"], (prev = []) => [uploadData, ...prev]);
        } else {
          const errJson = await res.json().catch(() => ({}));
          const errMsg = errJson?.error?.message || "Không thể tải ảnh lên";
          addToast(`❌ Lỗi tải ảnh ${rawFile.name}: ${errMsg}`, "error");
        }
      }

      if (uploadSuccessCount > 0) {
        // Đồng bộ lại dung lượng và số ảnh chính xác từ Database
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["user", "room-me"] }),
          queryClient.invalidateQueries({ queryKey: ["user", "uploads"] }),
        ]);
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
        queryClient.setQueryData<UploadedPhotoItem[]>(["user", "uploads"], (prev = []) => prev.filter((p) => p.id !== uploadId));

        // Đồng bộ lại phòng & nạp lại slide
        await queryClient.invalidateQueries({ queryKey: ["user", "room-me"] });
        setVideoRefreshTrigger((prev) => prev + 1);
      } else {
        addToast("Không thể xóa ảnh, vui lòng thử lại.", "error");
      }
    } catch {
      addToast("Lỗi kết nối khi xóa ảnh.", "error");
    }
  };

  const quotaPct = Math.min(100, Math.max(storageUsedBytes > 0 ? 2 : 0, (storageUsedBytes / storageQuotaBytes) * 100));

  // Render khay upload & cuộn ảnh
  const renderPhotoAlbumSection = (isMobileView = false) => (
    <div className="bg-[#FFFDF9] border-2 border-[#D8C7B0] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif font-extrabold text-base text-paper-ink">📷 Album Ảnh Phòng Đôi</h3>
          <p className="text-[11px] text-paper-muted">Kho ảnh riêng tư tự động ghép vào thước phim kỷ niệm</p>
        </div>
        <span className="text-[11px] font-bold text-brand-olive bg-brand-olive/10 px-2.5 py-0.5 rounded-full shrink-0">
          🔒 Riêng tư 100%
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="w-full border-2 border-dashed border-brand-coral hover:border-brand-terracotta bg-[#FFF9F5] hover:bg-[#FFF2EB] rounded-2xl p-4 sm:p-5 text-center transition space-y-1.5 disabled:opacity-60 cursor-pointer active:scale-[0.99]"
      >
        <div className="w-10 h-10 rounded-full bg-brand-peach/70 text-brand-terracotta mx-auto flex items-center justify-center text-lg">
          {isUploading ? (
            <span className="w-4 h-4 border-2 border-brand-terracotta border-t-transparent rounded-full animate-spin" />
          ) : (
            "➕"
          )}
        </div>
        <p className="font-bold text-xs sm:text-sm text-paper-ink">
          {isUploading ? "Đang tối ưu & tải ảnh lên..." : "Chạm để thêm ảnh kỷ niệm mới"}
        </p>
        <p className="text-[11px] text-paper-muted">Tự động nén ảnh WebP & ghép ngay vào thước phim</p>
      </button>

      {/* Dung lượng lưu trữ Quota Bar */}
      <div className="bg-[#FAF4E8] border border-[#E2D5C1] rounded-xl p-3 space-y-1.5">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-paper-muted">Bộ nhớ Album phòng:</span>
          <span className="text-paper-ink font-bold">
            {formatBytes(storageUsedBytes)} / {formatBytes(storageQuotaBytes)}
          </span>
        </div>
        <div className="w-full bg-[#E5D8C5] h-2 rounded-full overflow-hidden">
          <div className="bg-brand-terracotta h-full transition-all duration-300" style={{ width: `${quotaPct}%` }} />
        </div>
        <div className="flex justify-between text-[11px] text-paper-muted">
          <span>
            Đã lưu: <strong className="text-paper-ink">{photoCount} / {maxPhotos} bức ảnh</strong>
          </span>
          <span>Tự động ẩn EXIF vị trí</span>
        </div>
      </div>

      {/* Cam kết Nghị định 13 */}
      <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FAF4E8] border border-[#E2D5C1] cursor-pointer text-xs">
        <input
          type="checkbox"
          checked={hasConsent}
          onChange={(e) => handleToggleConsent(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-brand-terracotta shrink-0"
        />
        <span className="text-[11px] text-paper-muted leading-relaxed">
          Tôi đồng ý lưu ảnh kỷ niệm riêng tư trong phòng đôi (tự động xóa vĩnh viễn sau 14 ngày nếu giải tán phòng, bảo vệ dữ liệu cá nhân theo NĐ 13/2023).
        </span>
      </label>

      {/* Danh sách ảnh đã tải lên */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-paper-muted">
            {uploadedPhotos.length > 0 ? "Ảnh trong album (Chạm để xem phóng to):" : "Chưa có ảnh nào trong album."}
          </p>
          {uploadedPhotos.length > 0 && (
            <span className="text-[10px] font-mono text-paper-muted">{uploadedPhotos.length} ảnh</span>
          )}
        </div>

        {uploadedPhotos.length === 0 ? (
          <div className="bg-[#FAF4E8] border border-dashed border-[#D8C7B0] rounded-xl p-6 text-center space-y-1">
            <span className="text-2xl">📸</span>
            <p className="text-xs font-bold text-paper-ink">Album đang trống</p>
            <p className="text-[11px] text-paper-muted">Thêm vài tấm ảnh để bắt đầu làm đầy cuốn phim của hai đứa nhé!</p>
          </div>
        ) : (
          <div className={`grid ${isMobileView ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-4"} gap-2`}>
            {uploadedPhotos.map((photo) => (
              <div
                key={photo.id}
                className="relative group aspect-square rounded-xl overflow-hidden border border-[#E2D6C5] bg-black/5 shadow-2xs"
              >
                <a href={photo.url} target="_blank" rel="noopener noreferrer" title={photo.fileName}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={photo.fileName} className="w-full h-full object-cover" />
                </a>
                <button
                  type="button"
                  onClick={() => handleDeleteUpload(photo.id)}
                  className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/65 hover:bg-brand-terracotta text-white text-xs flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition cursor-pointer"
                  title="Xóa ảnh"
                  aria-label={`Xóa ảnh ${photo.fileName}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-10 pb-12 animate-in fade-in duration-300">
      {/* Tiêu đề trang & Couple Status */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-brand-terracotta">
              📸 Lưu giữ khoảnh khắc của hai đứa
            </span>
            <h1 className="font-serif font-black text-xl sm:text-2xl text-paper-ink mt-0.5">
              Sổ Tay Kỷ Niệm & Thước Phim Hẹn Hò
            </h1>
          </div>
          {roomData && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-terracotta bg-[#FFF2EB] border border-[#FADCD2] px-3 py-1 rounded-full shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-brand-terracotta animate-pulse" />
              Phòng đôi ({roomData.memberCount}/2)
            </span>
          )}
        </div>
        <p className="text-xs text-paper-muted max-w-2xl">
          Tải ảnh chụp chung để DateMate tự động dựng thước phim lồng nhạc Lo-fi và ghim những tấm thiệp kỷ niệm ngọt ngào.
        </p>
      </section>

      {/* ==============================================================
          MOBILE / TABLET VIEW (< 1024px): iOS Segmented Tab Switcher
          ============================================================== */}
      <div className="lg:hidden space-y-4">
        {/* iOS-Style Segmented Pill Bar */}
        <div className="flex p-1 bg-[#EFE5D4] rounded-2xl border border-[#D8C7B0] max-w-md mx-auto shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab("corkboard")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "corkboard"
                ? "bg-brand-terracotta text-white shadow-sm"
                : "text-paper-muted hover:text-paper-ink"
            }`}
          >
            <span>📌 Bảng Ghim</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cinema")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "cinema"
                ? "bg-brand-terracotta text-white shadow-sm"
                : "text-paper-muted hover:text-paper-ink"
            }`}
          >
            <span>🎞️ Thước Phim</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("album")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "album"
                ? "bg-brand-terracotta text-white shadow-sm"
                : "text-paper-muted hover:text-paper-ink"
            }`}
          >
            <span>📷 Cuộn Ảnh</span>
            {uploadedPhotos.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === "album" ? "bg-white/25 text-white" : "bg-[#DFCDB9] text-paper-ink"
                }`}
              >
                {uploadedPhotos.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: 📌 Bảng Ghim Corkboard */}
        {activeTab === "corkboard" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            <MemoryCorkboard />
          </div>
        )}

        {/* Tab 2: 🎞️ Thước Phim Ken Burns Canvas */}
        {activeTab === "cinema" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <VirtualVideoCanvas
              memoryId="room-photos"
              initialTrackId="hanoi-autumn-lofi"
              onToast={addToast}
              refreshTrigger={videoRefreshTrigger}
            />
            <div className="p-3 bg-[#FAF4E8] border border-[#E2D5C1] rounded-xl flex items-center justify-between text-xs">
              <span className="text-paper-muted text-[11px]">
                {uploadedPhotos.length === 0
                  ? "Chưa có ảnh nào để phát trong phim."
                  : `Đang phát ${uploadedPhotos.length} ảnh từ Album phòng.`}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab("album")}
                className="font-bold text-brand-terracotta hover:underline shrink-0 text-xs"
              >
                + Thêm ảnh vào phim →
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: 📷 Cuộn Ảnh & Tải Ảnh */}
        {activeTab === "album" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            {renderPhotoAlbumSection(true)}
          </div>
        )}
      </div>

      {/* ==============================================================
          DESKTOP VIEW (>= 1024px): 2 Cột Song Song + Bảng Ghim Đầy Đủ
          ============================================================== */}
      <div className="hidden lg:block space-y-12">
        <section className="grid grid-cols-12 gap-6 items-start">
          <div className="col-span-7 min-w-0">
            <VirtualVideoCanvas
              memoryId="room-photos"
              initialTrackId="hanoi-autumn-lofi"
              onToast={addToast}
              refreshTrigger={videoRefreshTrigger}
            />
          </div>
          <div className="col-span-5 min-w-0">
            {renderPhotoAlbumSection(false)}
          </div>
        </section>

        <MemoryCorkboard />
      </div>
    </div>
  );
}
