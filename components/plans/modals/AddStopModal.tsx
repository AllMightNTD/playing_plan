"use client";

import React, { useState } from "react";
import { X, Plus, Sparkles } from "lucide-react";
import {
  getModalBackdropClasses,
  getModalShellClasses,
  getModalHeaderClasses,
  getModalBodyClasses,
  getModalFooterClasses,
} from "@/lib/modal-layout";

export const HANOI_QUICK_SPOTS = [
  {
    name: "Là Việt Coffee",
    category: "coffee",
    icon: "☕",
    isIndoor: true,
    district: "Đống Đa",
    lat: 21.0125,
    lng: 105.8265,
    defaultDuration: 60,
    defaultNote: "Không gian mùi cà phê rang thơm dịu, ngồi tầng 2 yên tĩnh trò chuyện.",
  },
  {
    name: "420 Lab",
    category: "coffee",
    icon: "☕",
    isIndoor: true,
    district: "Ba Đình",
    lat: 21.0312,
    lng: 105.8395,
    defaultDuration: 60,
    defaultNote: "Điểm hẹn mở đầu hành trình, thử dòng Coldbrew đặc trưng.",
  },
  {
    name: "Bảo Tàng Mỹ Thuật Việt Nam",
    category: "activity",
    icon: "📸",
    isIndoor: true,
    district: "Ba Đình",
    lat: 21.0305,
    lng: 105.8372,
    defaultDuration: 75,
    defaultNote: "Chụp ảnh cầu thang cổ điển tầng 2 và khuôn viên ngoài trời lúc nắng chiều.",
  },
  {
    name: "Hồ Tây - Đoạn Phố Từ Hoa",
    category: "sunset",
    icon: "🌅",
    isIndoor: false,
    district: "Tây Hồ",
    lat: 21.0585,
    lng: 105.8295,
    defaultDuration: 45,
    defaultNote: "Dạo bộ đón khung giờ vàng 16:23 - 17:23, nhớ mang máy ảnh film.",
  },
  {
    name: "Bún Chả Nem Phố Cổ",
    category: "food",
    icon: "🍜",
    isIndoor: true,
    district: "Hoàn Kiếm",
    lat: 21.0338,
    lng: 105.8482,
    defaultDuration: 60,
    defaultNote: "Thưởng thức bún chả nóng hổi và nem cua bể giòn tan.",
  },
  {
    name: "Cà Phê Blackbird",
    category: "coffee",
    icon: "☕",
    isIndoor: true,
    district: "Hoàn Kiếm",
    lat: 21.0268,
    lng: 105.8492,
    defaultDuration: 60,
    defaultNote: "Quán tone cam ấm áp, góc ban công ngắm phố Chân Cầm lúc lên đèn.",
  },
];

export interface AddStopPayload {
  name: string;
  category: "coffee" | "activity" | "sunset" | "food";
  duration: number;
  address: string;
  note: string;
  isIndoor: boolean;
  lat?: number;
  lng?: number;
}

export interface AddStopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStop: (payload: AddStopPayload) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function AddStopModal({
  isOpen,
  onClose,
  onAddStop,
  isSubmitting = false,
}: AddStopModalProps) {
  const [form, setForm] = useState<AddStopPayload>({
    name: "",
    category: "coffee",
    duration: 60,
    address: "Ba Đình, Hà Nội",
    note: "",
    isIndoor: true,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || isSubmitting) return;
    await onAddStop(form);
    onClose();
  };

  const handleSelectQuickSpot = (spot: (typeof HANOI_QUICK_SPOTS)[number]) => {
    setForm({
      name: spot.name,
      category: spot.category as AddStopPayload["category"],
      duration: spot.defaultDuration,
      address: `${spot.district}, Hà Nội`,
      note: spot.defaultNote,
      isIndoor: spot.isIndoor,
      lat: spot.lat,
      lng: spot.lng,
    });
  };

  return (
    <div className={getModalBackdropClasses()}>
      <div className={getModalShellClasses("md")}>
        {/* Header */}
        <div className={getModalHeaderClasses()}>
          <h3 className="text-base font-extrabold text-[#231915] flex items-center gap-2">
            <span>📍</span> Thêm chặng mới vào lịch hẹn
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7d6856] hover:bg-[#f3ede2] hover:text-[#231915] transition"
            aria-label="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className={getModalBodyClasses()}>
          {/* Quick pick section */}
          <div>
            <p className="text-xs font-bold text-[#6e5645] mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#c84b31]" />
              Chọn nhanh địa điểm hẹn hò nổi bật tại Hà Nội:
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-[#f9f5ee] rounded-xl border border-[#e4d8c5]">
              {HANOI_QUICK_SPOTS.map((spot) => (
                <button
                  key={spot.name}
                  type="button"
                  onClick={() => handleSelectQuickSpot(spot)}
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold transition border ${
                    form.name === spot.name
                      ? "bg-[#c84b31] text-white border-[#c84b31] shadow-xs"
                      : "bg-[#f3ede2] hover:bg-[#fdf3dc] text-[#3d2d24] border-[#d6c7b2]"
                  }`}
                >
                  {spot.icon} {spot.name}
                </button>
              ))}
            </div>
          </div>

          <form id="add-stop-form" onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label
                  htmlFor="stop-name-input"
                  className="block text-xs font-semibold text-[#6e5645] mb-1"
                >
                  Tên địa điểm *
                </label>
                <input
                  id="stop-name-input"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="VD: Là Việt Coffee, Hồ Tây, Phố Sách..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#d5c5b0] bg-white text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                />
              </div>
              <div>
                <label
                  htmlFor="stop-category-select"
                  className="block text-xs font-semibold text-[#6e5645] mb-1"
                >
                  Danh mục
                </label>
                <select
                  id="stop-category-select"
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      category: e.target.value as AddStopPayload["category"],
                    }))
                  }
                  className="w-full px-2.5 py-2 text-xs rounded-lg border border-[#d5c5b0] bg-white text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                >
                  <option value="coffee">☕ Cà phê</option>
                  <option value="activity">📸 Hoạt động / Bảo tàng</option>
                  <option value="sunset">🌅 Săn Hoàng hôn</option>
                  <option value="food">🍜 Ăn uống</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="stop-duration-input"
                  className="block text-xs font-semibold text-[#6e5645] mb-1"
                >
                  Thời gian dừng chân (phút)
                </label>
                <input
                  id="stop-duration-input"
                  type="number"
                  step="15"
                  min="15"
                  max="240"
                  value={form.duration}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, duration: Number(e.target.value) || 60 }))
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#d5c5b0] bg-white text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                />
              </div>
              <div>
                <label
                  htmlFor="stop-address-input"
                  className="block text-xs font-semibold text-[#6e5645] mb-1"
                >
                  Địa chỉ / Khu vực
                </label>
                <input
                  id="stop-address-input"
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="VD: Ba Đình, Hoàn Kiếm..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#d5c5b0] bg-white text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="stop-note-input"
                className="block text-xs font-semibold text-[#6e5645] mb-1"
              >
                Ghi chú cho chặng này
              </label>
              <textarea
                id="stop-note-input"
                rows={2}
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="VD: Đặt bàn trước, thử món bánh sừng bò, chụp ảnh ban công..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#d5c5b0] bg-white text-[#2d221c] focus:outline-none focus:border-[#c84b31] resize-none"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className={getModalFooterClasses()}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-[#6e5645] hover:bg-[#eee5d7] transition"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="add-stop-form"
            disabled={isSubmitting || !form.name.trim()}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-[#c84b31] text-white hover:bg-[#ad3b23] disabled:opacity-50 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {isSubmitting ? "Đang thêm..." : "+ Thêm vào lịch trình"}
          </button>
        </div>
      </div>
    </div>
  );
}
