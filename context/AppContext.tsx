"use client";

import React, { createContext, useContext, useState, useMemo } from "react";
import { HANOI_PLACES, HanoiPlace } from "@/lib/mock-data";
import { normalizeVietnamese } from "@/lib/search";
import { isTrainStreetQuery, normalizeSearchQuery } from "@/lib/catalog-filter";

export interface PlanStopItem {
  id: string;
  placeId: string;
  time: string;
  duration: number;
  note: string;
}

export interface ChecklistItemData {
  id: string;
  text: string;
  assignee: string;
  done: boolean;
}

export interface ToastItem {
  id: string;
  message: string;
  type?: "info" | "success" | "error";
}

export interface WizardAnswers {
  budget: number;
  moods: string[];
  slot: "morning" | "sunset" | "night";
  transport: "motorbike" | "car" | "walk";
}

interface AppContextType {
  // Places & search
  places: HanoiPlace[];
  filteredPlaces: HanoiPlace[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  isTrainStreetSearch: boolean;

  // Favorites / Saved
  savedPlaceSlugs: string[];
  isPlaceSaved: (slug: string) => boolean;
  toggleSavePlace: (slug: string) => void;

  // Match
  matchedSlugs: string[];
  partnerSecretLikedSlugs: string[];
  recordMatchVote: (slug: string, choice: "like" | "nope") => void;

  // Plan & Timeline
  planTitle: string;
  planDate: string;
  planStops: PlanStopItem[];
  addStopToPlan: (placeOrId: HanoiPlace | string) => void;
  removeStopFromPlan: (stopId: string) => void;
  moveStop: (idx: number, dir: number) => void;

  // Checklist
  checklist: ChecklistItemData[];
  toggleChecklistItem: (id: string) => void;
  addChecklistItem: (text: string) => void;

  // Secret Date (F19)
  secretModeEnabled: boolean;
  setSecretModeEnabled: (enabled: boolean) => void;

  // Modals
  activeDetailSlug: string | null;
  setActiveDetailSlug: (slug: string | null) => void;

  isWizardOpen: boolean;
  setIsWizardOpen: (open: boolean) => void;
  wizardStep: number;
  setWizardStep: (step: number) => void;
  wizardAnswers: WizardAnswers;
  setWizardAnswers: (ans: WizardAnswers) => void;

  isWheelOpen: boolean;
  setIsWheelOpen: (open: boolean) => void;
  isSpinning: boolean;
  wheelResult: HanoiPlace | null;
  spinWheel: () => void;

  isRoomModalOpen: boolean;
  setIsRoomModalOpen: (open: boolean) => void;

  // Toasts
  toasts: ToastItem[];
  addToast: (msg: string, type?: "info" | "success" | "error") => void;
  removeToast: (id: string) => void;

  // iCal export
  exportCalendarIcs: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // 1. Places & Search
  const places = HANOI_PLACES;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const isTrainStreetSearch = useMemo(() => isTrainStreetQuery(searchQuery), [searchQuery]);

  const filteredPlaces = useMemo(() => {
    const normQ = normalizeSearchQuery(searchQuery);

    return places.filter((p) => {
      // Category filter
      if (selectedCategory !== "all") {
        if (!p.moods.includes(selectedCategory) && p.category !== selectedCategory) {
          return false;
        }
      }

      // Query filter
      if (normQ) {
        const searchable = normalizeVietnamese(
          `${p.name} ${p.area} ${p.categoryLabel} ${p.summary} ${p.moodLabels?.join(" ")}`
        );
        const words = normQ.split(" ").filter(Boolean);
        return words.every((w) => searchable.includes(w));
      }

      return true;
    });
  }, [places, searchQuery, selectedCategory]);

  // 2. Saved
  const [savedPlaceSlugs, setSavedPlaceSlugs] = useState<string[]>([
    "cau-long-bien",
    "ho-tay-duong-thanh-nien",
    "ca-phe-view-cau-long-bien",
  ]);

  const isPlaceSaved = (slug: string) => savedPlaceSlugs.includes(slug);

  // 3. Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (message: string, type: "info" | "success" | "error" = "info") => {
    const id = "t-" + Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleSavePlace = (slugOrId: string) => {
    const targetPlace = places.find((p) => p.slug === slugOrId || p.id === slugOrId);
    const slug = targetPlace ? targetPlace.slug : slugOrId;

    setSavedPlaceSlugs((prev) => {
      if (prev.includes(slug)) {
        addToast("Đã bỏ lưu khỏi danh sách yêu thích", "info");
        return prev.filter((s) => s !== slug);
      } else {
        addToast("❤️ Đã lưu cho bạn (Đồng bộ phòng đôi)", "success");
        return [...prev, slug];
      }
    });
  };

  // 4. Match
  const [matchedSlugs, setMatchedSlugs] = useState<string[]>([
    "ca-phe-view-cau-long-bien",
    "ho-tay-duong-thanh-nien",
  ]);

  const partnerSecretLikedSlugs = [
    "cau-long-bien",
    "bai-da-song-hong",
    "thao-nguyen-hoa-long-bien",
    "ca-phe-view-cau-long-bien",
    "lotte-observation-deck-top-of-hanoi",
  ];

  const recordMatchVote = (slug: string, choice: "like" | "nope") => {
    const place = places.find((p) => p.slug === slug);
    if (!place) return;

    if (choice === "like") {
      if (
        partnerSecretLikedSlugs.includes(slug) &&
        !matchedSlugs.includes(slug)
      ) {
        setMatchedSlugs((prev) => [...prev, slug]);
        addToast(
          `🎉 Tâm đầu ý hợp! Cả bạn và Linh đều thích "${place.name}"!`,
          "success"
        );
      } else {
        addToast(`❤️ Đã thích "${place.name}" (Đang ẩn chờ Linh quẹt)`, "info");
      }
    }
  };

  // 5. Plans & Timeline
  const [planTitle] = useState("Ngắm hoàng hôn Hồ Tây & Cà phê Cầu Long Biên");
  const [planDate] = useState("2026-11-01");
  const [planStops, setPlanStops] = useState<PlanStopItem[]>([
    {
      id: "s1",
      placeId: "p8",
      time: "16:30",
      duration: 60,
      note: "Ngồi ban công tầng 4 uống cà phê trứng, canh tàu chạy qua lúc 17:15",
    },
    {
      id: "s2",
      placeId: "p1",
      time: "17:35",
      duration: 45,
      note: "Đi bộ lên Cầu Long Biên chụp ảnh giờ vàng và giờ xanh",
    },
    {
      id: "s3",
      placeId: "p3",
      time: "18:30",
      duration: 90,
      note: "Dạo đường Thanh Niên và ăn phở cuốn Trúc Bạch",
    },
  ]);

  const addStopToPlan = (placeOrId: HanoiPlace | string) => {
    let place: HanoiPlace | undefined;
    if (typeof placeOrId === "string") {
      place = places.find((p) => p.id === placeOrId || p.slug === placeOrId);
    } else {
      place = placeOrId;
    }
    if (!place) return;

    const newStop: PlanStopItem = {
      id: "s-" + Date.now(),
      placeId: place.id,
      time: "19:30",
      duration: 60,
      note: `Ghé ${place.name} (${place.bestTimeText})`,
    };

    setPlanStops((prev) => [...prev, newStop]);
    addToast(`📅 Đã thêm "${place.name}" vào Kế hoạch!`, "success");
  };

  const removeStopFromPlan = (stopId: string) => {
    setPlanStops((prev) => prev.filter((s) => s.id !== stopId));
    addToast("Đã xóa điểm dừng khỏi lịch trình", "info");
  };

  const moveStop = (idx: number, dir: number) => {
    const target = idx + dir;
    if (target < 0 || target >= planStops.length) return;
    setPlanStops((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  // 6. Checklist
  const [checklist, setChecklist] = useState<ChecklistItemData[]>([
    { id: "c1", text: "Sạc dự phòng đầy 100% + Cáp sạc", assignee: "Dũng", done: true },
    { id: "c2", text: "Phối đồ tông Trắng kem & Nâu vintage", assignee: "Cả hai", done: true },
    { id: "c3", text: "Kẹp tóc càng cua + Áo khoác cardigan mỏng", assignee: "Linh", done: false },
    { id: "c4", text: "Kiểm tra tiền mặt lẻ gửi xe gầm cầu", assignee: "Dũng", done: false },
  ]);

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const addChecklistItem = (text: string) => {
    if (!text.trim()) return;
    setChecklist((prev) => [
      ...prev,
      {
        id: "c-" + Date.now(),
        text: text.trim(),
        assignee: "Cả hai",
        done: false,
      },
    ]);
  };

  // 7. Secret Date (F19)
  const [secretModeEnabled, setSecretModeEnabled] = useState(false);

  // 8. Modals
  const [activeDetailSlug, setActiveDetailSlug] = useState<string | null>(null);

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardAnswers, setWizardAnswers] = useState<WizardAnswers>({
    budget: 1,
    moods: ["romantic", "photo"],
    slot: "sunset",
    transport: "motorbike",
  });

  const [isWheelOpen, setIsWheelOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [recentWheelSlugs, setRecentWheelSlugs] = useState<string[]>([]);
  const [wheelResult, setWheelResult] = useState<HanoiPlace | null>(HANOI_PLACES[0]);

  const spinWheel = () => {
    setIsSpinning(true);
    const candidates = places.filter((p) => !recentWheelSlugs.includes(p.slug));
    const pool = candidates.length > 0 ? candidates : places;
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    setTimeout(() => {
      setWheelResult(chosen);
      setRecentWheelSlugs((prev) => {
        const next = [...prev, chosen.slug];
        return next.length > 5 ? next.slice(next.length - 5) : next;
      });
      setIsSpinning(false);
    }, 700);
  };

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);

  // 9. Calendar .ics
  const exportCalendarIcs = () => {
    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//DateMate Hanoi v1.2//VN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:datemate-plan-20261101@datemate.vn",
      "DTSTAMP:20261027T080000Z",
      "DTSTART:20261101T093000Z",
      "DTEND:20261101T130000Z",
      `SUMMARY:💕 Hẹn hò DateMate: ${planTitle}`,
      "DESCRIPTION:Lộ trình chi tiết đã lưu trên DateMate (Hồng Đào). Nhắc hẹn tự động trước 1 ngày và 2 giờ.",
      "LOCATION:Cầu Long Biên & Hồ Tây, Hà Nội",
      "BEGIN:VALARM",
      "TRIGGER:-PT2H",
      "ACTION:DISPLAY",
      "DESCRIPTION:Còn 2 tiếng nữa đến giờ hẹn hò rồi nha!",
      "END:VALARM",
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      "DESCRIPTION:Ngày mai có lịch hẹn hò, nhớ chuẩn bị trang phục đôi nhé!",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsLines], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "DateMate-Lich-Hen-Ho-Ha-Noi.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(
      "📅 Đã tải file lịch .ics (Mở bằng Apple / Google Calendar để tự báo chuông trước 2 giờ!)",
      "success"
    );
  };

  return (
    <AppContext.Provider
      value={{
        places,
        filteredPlaces,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        isTrainStreetSearch,

        savedPlaceSlugs,
        isPlaceSaved,
        toggleSavePlace,

        matchedSlugs,
        partnerSecretLikedSlugs,
        recordMatchVote,

        planTitle,
        planDate,
        planStops,
        addStopToPlan,
        removeStopFromPlan,
        moveStop,

        checklist,
        toggleChecklistItem,
        addChecklistItem,

        secretModeEnabled,
        setSecretModeEnabled,

        activeDetailSlug,
        setActiveDetailSlug,

        isWizardOpen,
        setIsWizardOpen,
        wizardStep,
        setWizardStep,
        wizardAnswers,
        setWizardAnswers,

        isWheelOpen,
        setIsWheelOpen,
        isSpinning,
        wheelResult,
        spinWheel,

        isRoomModalOpen,
        setIsRoomModalOpen,

        toasts,
        addToast,
        removeToast,

        exportCalendarIcs,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
