"use client";

import React, { useState, useEffect, useRef } from "react";
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

export default function MemoriesPage() {
  const { addToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // States
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhotoItem[]>([]);
  const [hasConsent, setHasConsent] = useState(false);
  const [storageUsedBytes, setStorageUsedBytes] = useState(0);
  const [storageQuotaBytes, setStorageQuotaBytes] = useState(DEFAULT_STORAGE_QUOTA_BYTES);
  const [photoCount, setPhotoCount] = useState(0);
  const [maxPhotos, setMaxPhotos] = useState(DEFAULT_MAX_PHOTOS);
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
            setStorageQuotaBytes(roomJson.data.room.storageQuotaBytes || DEFAULT_STORAGE_QUOTA_BYTES);
            setPhotoCount(roomJson.data.room.photoCount || 0);
            setMaxPhotos(roomJson.data.room.maxPhotos || DEFAULT_MAX_PHOTOS);
            setHasConsent(Boolean(roomJson.data.room.consentVersion));
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

  const quotaPct = Math.min(100, Math.max(storageUsedBytes > 0 ? 2 : 0, (storageUsedBytes / storageQuotaBytes) * 100));

  return (
    <div className="space-y-12 pb-12 animate-in fade-in duration-300">
      <section className="space-y-5">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-brand-terracotta">📸 Lưu giữ khoảnh khắc của hai đứa</span>
          <h2 className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink">Sổ Tay Kỷ Niệm & Thước Phim Hẹn Hò Tự Động</h2>
          <p className="text-xs text-paper-muted mt-0.5">
            Tải lên những bức ảnh chụp cùng nhau để DateMate tự động dựng thành thước phim lồng nhạc lãng mạn
          </p>
        </div>

        <div className="responsive-2col grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <VirtualVideoCanvas memoryId="room-photos" initialTrackId="hanoi-autumn-lofi" onToast={addToast} refreshTrigger={videoRefreshTrigger} />
          </div>

          <div className="lg:col-span-5 bg-[#FFFDF9] border-2 border-[#D8C7B0] rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-extrabold text-base text-paper-ink">📷 Thêm ảnh vào Album chung</h3>
                <span className="text-[11px] font-bold text-brand-olive bg-brand-olive/10 px-2.5 py-0.5 rounded-full">🔒 Riêng tư 100%</span>
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
                className="w-full border-2 border-dashed border-brand-coral hover:border-brand-terracotta bg-[#FFF9F5] hover:bg-[#FFF2EB] rounded-2xl p-5 text-center transition space-y-1.5 disabled:opacity-60"
              >
                <div className="w-10 h-10 rounded-full bg-brand-peach/70 text-brand-terracotta mx-auto flex items-center justify-center text-lg">
                  {isUploading ? <span className="w-4 h-4 border-2 border-brand-terracotta border-t-transparent rounded-full animate-spin" /> : "➕"}
                </div>
                <p className="font-bold text-xs sm:text-sm text-paper-ink">
                  {isUploading ? "Đang tối ưu & tải ảnh lên..." : "Bấm để thêm ảnh kỷ niệm mới"}
                </p>
                <p className="text-[11px] text-paper-muted">Tự động tối ưu dung lượng & ghép vào thước phim bên cạnh</p>
              </button>

              <div className="bg-[#FAF4E8] border border-[#E2D5C1] rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-paper-muted">Bộ nhớ Album phòng đôi:</span>
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
                  <span>Tự động xóa thông tin vị trí (EXIF)</span>
                </div>
              </div>

              <label className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FAF4E8] border border-[#E2D5C1] cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={hasConsent}
                  onChange={(e) => handleToggleConsent(e.target.checked)}
                  className="mt-0.5 accent-brand-terracotta"
                />
                <span className="text-[11px] text-paper-muted leading-relaxed">
                  Tôi đồng ý lưu trữ ảnh bảo mật trong phòng đôi và tự động xóa vĩnh viễn sau 14 ngày nếu giải tán phòng (Nghị định
                  13/2023/NĐ-CP).
                </span>
              </label>
            </div>

            <div>
              <p className="text-xs font-bold text-paper-muted mb-2">
                {uploadedPhotos.length > 0 ? "Ảnh trong cuốn phim của hai bạn (Chạm để xem):" : "Chưa có ảnh nào trong album."}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {uploadedPhotos.map((photo) => (
                  <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden border border-[#E2D6C5] bg-black/5">
                    <a href={photo.url} target="_blank" rel="noopener noreferrer" title={photo.fileName}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={photo.fileName} className="w-full h-full object-cover" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteUpload(photo.id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                      title="Xóa ảnh"
                      aria-label={`Xóa ảnh ${photo.fileName}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <MemoryCorkboard />
    </div>
  );
}
