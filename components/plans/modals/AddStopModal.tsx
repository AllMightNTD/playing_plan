"use client";

import React, { useMemo, useState } from "react";
import { X, Plus, Sparkles, Search, CheckCircle2 } from "lucide-react";
import {
  getModalBackdropClasses,
  getModalShellClasses,
  getModalHeaderClasses,
  getModalBodyClasses,
  getModalFooterClasses,
} from "@/lib/modal-layout";
import { normalizeVietnamese, scoreSearchMatch } from "@/lib/search";
import { getPlaceCategoryMeta, matchCatalogPlaceByName } from "@/lib/plan-enrichment";
import type { HanoiPlace } from "@/lib/types/catalog";

export const HANOI_QUICK_SPOTS = [
  {
    name: "Là Việt Coffee",
    category: "cafe",
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
    category: "cafe",
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
    category: "photo",
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
    category: "cafe",
    icon: "☕",
    isIndoor: true,
    district: "Hoàn Kiếm",
    lat: 21.0268,
    lng: 105.8492,
    defaultDuration: 60,
    defaultNote: "Quán tone cam ấm áp, góc ban công ngắm phố Chân Cầm lúc lên đèn.",
  },
] as const;

export interface AddStopPayload {
  placeId: string | null;
  name: string;
  category: string;
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
  places?: HanoiPlace[];
  isSubmitting?: boolean;
}

export function AddStopModal({
  isOpen,
  onClose,
  onAddStop,
  places = [],
  isSubmitting = false,
}: AddStopModalProps) {
  const [form, setForm] = useState<AddStopPayload>({
    placeId: null,
    name: "",
    category: "cafe",
    duration: 60,
    address: "Hà Nội",
    note: "",
    isIndoor: true,
  });

  const catalogMatches = useMemo(() => {
    const queryNorm = normalizeVietnamese(form.name);
    if (!queryNorm || queryNorm.length < 2) return places.slice(0, 6);

    return places
      .map((place) => ({
        place,
        score: scoreSearchMatch(
          queryNorm,
          normalizeVietnamese(place.name),
          normalizeVietnamese(`${place.area} ${place.address || ""}`)
        ),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((entry) => entry.place);
  }, [form.name, places]);

  if (!isOpen) return null;

  const handleSelectCatalogPlace = (place: HanoiPlace) => {
    const meta = getPlaceCategoryMeta(place.category);
    setForm((prev) => ({
      ...prev,
      placeId: place.id,
      name: place.name,
      category: meta.category,
      address: place.address || place.area || "Hà Nội",
      isIndoor: place.indoor,
      lat: place.lat,
      lng: place.lng,
    }));
  };

  const handleSelectQuickSpot = (spot: (typeof HANOI_QUICK_SPOTS)[number]) => {
    const matched = matchCatalogPlaceByName(spot.name, places);
    setForm({
      placeId: matched?.id ?? null,
      name: matched?.name ?? spot.name,
      category: matched?.category ?? spot.category,
      duration: spot.defaultDuration,
      address: matched?.address || `${spot.district}, Hà Nội`,
      note: spot.defaultNote,
      isIndoor: matched?.indoor ?? spot.isIndoor,
      lat: matched?.lat ?? spot.lat,
      lng: matched?.lng ?? spot.lng,
    });
  };

  const handleNameChange = (value: string) => {
    const exactMatch = matchCatalogPlaceByName(value, places);
    setForm((prev) => ({
      ...prev,
      placeId: exactMatch && normalizeVietnamese(exactMatch.name) === normalizeVietnamese(value) ? exactMatch.id : null,
      name: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || isSubmitting) return;
    await onAddStop(form);
    setForm({
      placeId: null,
      name: "",
      category: "cafe",
      duration: 60,
      address: "Hà Nội",
      note: "",
      isIndoor: true,
    });
    onClose();
  };

  return (
    <div className={getModalBackdropClasses()}>
      <div className={getModalShellClasses("md")}>
        <div className={getModalHeaderClasses()}>
          <h3 className="text-base font-extrabold text-[#231915] flex items-center gap-2">
            <span>📍</span> Thêm chặng mới vào lịch hẹn
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7d6856] hover:bg-[#f3ede2] hover:text-[#231915] transition cursor-pointer"
            aria-label="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={getModalBodyClasses()}>
          {places.length > 0 ? (
            <div>
              <p className="text-xs font-bold text-[#6e5645] mb-2 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#c84b31]" />
                Chọn từ Cẩm nang Địa điểm (tự động tính km & giờ vàng):
              </p>
              <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto p-1.5 bg-[#f9f5ee] rounded-xl border border-[#e4d8c5]">
                {catalogMatches.map((place) => {
                  const meta = getPlaceCategoryMeta(place.category);
                  const isSelected = form.placeId === place.id;
                  return (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => handleSelectCatalogPlace(place)}
                      className={`text-left px-3 py-2 rounded-xl text-xs transition border flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? "bg-[#c84b31] text-white border-[#c84b31] shadow-xs"
                          : "bg-white hover:bg-[#fdf3dc] text-[#2d221c] border-[#e6dac8]"
                      }`}
                    >
                      <span className="truncate font-bold">
                        {meta.icon} {place.name}
                        <span className={`ml-1.5 font-normal ${isSelected ? "text-white/85" : "text-[#7d6856]"}`}>
                          • {place.area}
                        </span>
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs font-bold text-[#6e5645] mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#c84b31]" />
                Gợi ý nhanh địa điểm hẹn hò tại Hà Nội:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-[#f9f5ee] rounded-xl border border-[#e4d8c5]">
                {HANOI_QUICK_SPOTS.map((spot) => (
                  <button
                    key={spot.name}
                    type="button"
                    onClick={() => handleSelectQuickSpot(spot)}
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold transition border cursor-pointer ${
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
          )}

          <form id="add-stop-form" onSubmit={handleSubmit} className="space-y-3 mt-1">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="stop-name-input"
                  className="block text-xs font-semibold text-[#6e5645]"
                >
                  Tên địa điểm (gõ tìm hoặc nhập quán tự chọn) *
                </label>
                {form.placeId && (
                  <span className="text-[10px] font-extrabold text-[#2b6e44] bg-[#e8f4ec] px-2 py-0.5 rounded-full">
                    ✓ Đã gắn Cẩm nang
                  </span>
                )}
              </div>
              <input
                id="stop-name-input"
                type="text"
                required
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="VD: Là Việt Coffee, Hồ Tây, Phố Sách..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#d5c5b0] bg-white text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
              />
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
                  htmlFor="stop-category-select"
                  className="block text-xs font-semibold text-[#6e5645] mb-1"
                >
                  Loại hình
                </label>
                <select
                  id="stop-category-select"
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full px-2.5 py-2 text-xs rounded-lg border border-[#d5c5b0] bg-white text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                >
                  <option value="cafe">☕ Cà phê</option>
                  <option value="food">🍜 Ăn uống</option>
                  <option value="photo">📸 Chụp ảnh / Check-in</option>
                  <option value="walk">🚶 Dạo phố</option>
                  <option value="fun">🎡 Vui chơi</option>
                  <option value="indoor">🏛️ Trong nhà</option>
                  <option value="nature">🌿 Thiên nhiên</option>
                </select>
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

        <div className={getModalFooterClasses()}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-[#6e5645] hover:bg-[#eee5d7] transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="add-stop-form"
            disabled={isSubmitting || !form.name.trim()}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-[#c84b31] text-white hover:bg-[#ad3b23] disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {isSubmitting ? "Đang thêm..." : "Thêm vào lịch trình"}
          </button>
        </div>
      </div>
    </div>
  );
}
