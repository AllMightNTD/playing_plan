"use client";

import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from "react";
import type { HanoiPlace } from "@/lib/types/catalog";
import { normalizeVietnamese } from "@/lib/search";
import { isTrainStreetQuery, normalizeSearchQuery } from "@/lib/catalog-filter";
import type { HomePublicDto, HomeSummaryDto } from "@/lib/types/home";
import type { PlanDetailDto } from "@/server/services/user/plan.mapper";
import type { RoomProfileDto } from "@/server/services/user/room.service";
import { districtName, nearestDistrictKey } from "@/lib/districts";
import { calculateHanoiTravelMinutes } from "@/lib/travel-time";

/** Hệ số uốn lượn đường phố Hà Nội, cùng hệ số lib/travel-time dùng khi tính phút. */
const ROAD_FACTOR = 1.35;
const LOCATION_CACHE_KEY = "datemate:user-location";

export interface UserLocation {
  lat: number;
  lng: number;
  districtKey: string;
  districtName: string;
  /** ip: ước tính theo mạng (sai số vài km); gps: vị trí thiết bị */
  source: "ip" | "gps";
}

export interface PlaceDistance {
  km: number;
  minutes: number;
}

/** API places giới hạn 24 bản ghi/trang (placeListQuerySchema). */
const PLACES_PAGE_SIZE = 24;

async function fetchInitialPlaces(): Promise<{ items: HanoiPlace[]; nextCursor: string | null }> {
  const query = new URLSearchParams({ limit: String(PLACES_PAGE_SIZE) });
  const res = await fetch(`/api/v1/user/places?${query}`);
  if (!res.ok) throw new Error(`places API ${res.status}`);
  const payload = await res.json();
  return {
    items: payload?.data?.items ?? [],
    nextCursor: payload?.data?.nextCursor ?? null,
  };
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
  // Home dynamic APIs (F12, F13, F08, F01)
  homePublic: HomePublicDto | null;
  homeSummary: HomeSummaryDto | null;
  isLoadingHome: boolean;
  refetchHomeSummary: () => Promise<void>;
  upcomingPlan: PlanDetailDto | null;
  isPlaceInUpcomingPlan: (placeIdOrSlug: string) => boolean;
  toggleUpcomingChecklistItem: (itemId: string) => Promise<void>;
  quickAddPlaceToPlan: (placeOrId: HanoiPlace | string) => Promise<boolean>;
  recordPlaceView: (slug: string) => void;

  // Places & search
  places: HanoiPlace[];
  isLoadingPlaces: boolean;
  placesNextCursor: string | null;
  isLoadingMorePlaces: boolean;
  loadMorePlaces: () => Promise<boolean>;
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

  addUpcomingChecklistItem: (content: string) => Promise<boolean>;
  deleteUpcomingChecklistItem: (itemId: string) => Promise<boolean>;
  refreshUpcomingPlan: () => Promise<void>;

  // Phòng đôi: thành viên, biệt danh (chỉ tải khi đã có phòng)
  roomProfile: RoomProfileDto | null;
  refreshRoomProfile: () => Promise<void>;

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
  spinWheel: () => Promise<void>;

  isRoomModalOpen: boolean;
  setIsRoomModalOpen: (open: boolean) => void;

  // Vị trí hiện tại của người dùng (IP hoặc GPS), chỉ giữ trong trình duyệt
  userLocation: UserLocation | null;
  isLocating: boolean;
  locateWithGps: () => Promise<void>;
  distanceToPlace: (place: HanoiPlace) => PlaceDistance | null;

  // Ngăn kéo "Tìm sở thích" dưới navbar (mở từ navbar, trang chủ, thanh dưới mobile)
  isSearchDrawerOpen: boolean;
  setIsSearchDrawerOpen: (open: boolean) => void;

  // Toasts
  toasts: ToastItem[];
  addToast: (msg: string, type?: "info" | "success" | "error") => void;
  removeToast: (id: string) => void;

}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // 1. Places & Search (nạp trước trang đầu 24 quán, hỗ trợ cursor phân trang tải thêm)
  const [places, setPlaces] = useState<HanoiPlace[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(true);
  const [placesNextCursor, setPlacesNextCursor] = useState<string | null>(null);
  const [isLoadingMorePlaces, setIsLoadingMorePlaces] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const loadMorePlaces = useCallback(async (): Promise<boolean> => {
    if (!placesNextCursor || isLoadingMorePlaces) return false;
    setIsLoadingMorePlaces(true);
    try {
      const query = new URLSearchParams({
        limit: String(PLACES_PAGE_SIZE),
        cursor: placesNextCursor,
      });
      const res = await fetch(`/api/v1/user/places?${query}`);
      if (!res.ok) return false;
      const payload = await res.json();
      const newItems: HanoiPlace[] = payload?.data?.items ?? [];
      const newCursor: string | null = payload?.data?.nextCursor ?? null;

      setPlaces((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const uniqueNew = newItems.filter((p) => !existingIds.has(p.id));
        return [...prev, ...uniqueNew];
      });
      setPlacesNextCursor(newCursor);
      return true;
    } catch (err) {
      console.warn("Lỗi tải thêm địa điểm:", err);
      return false;
    } finally {
      setIsLoadingMorePlaces(false);
    }
  }, [placesNextCursor, isLoadingMorePlaces]);

  // Home Dynamic APIs (F12, F13, F08, F01)
  const [homePublic, setHomePublic] = useState<HomePublicDto | null>(null);
  const [homeSummary, setHomeSummary] = useState<HomeSummaryDto | null>(null);
  const [isLoadingHome, setIsLoadingHome] = useState(true);

  const refetchHomeSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/user/home/summary", { cache: "no-store" });
      const json = await res.json();
      if (json?.data) {
        setHomeSummary(json.data);
      }
    } catch (err) {
      console.warn("Không thể tải home summary:", err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchInitialPlaces()
      .then(({ items, nextCursor }) => {
        if (active) {
          setPlaces(items);
          setPlacesNextCursor(nextCursor);
        }
      })
      .catch((err) => {
        console.warn("Không thể tải danh sách địa điểm từ API:", err);
      })
      .finally(() => {
        if (active) setIsLoadingPlaces(false);
      });

    Promise.allSettled([
      fetch("/api/v1/user/home/public?city=hanoi").then((r) => r.json()),
      fetch("/api/v1/user/home/summary", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([pubRes, sumRes]) => {
      if (!active) return;
      if (pubRes.status === "fulfilled" && pubRes.value?.data) {
        setHomePublic(pubRes.value.data);
      }
      if (sumRes.status === "fulfilled" && sumRes.value?.data) {
        const sumData: HomeSummaryDto = sumRes.value.data;
        setHomeSummary(sumData);
        if (Array.isArray(sumData.badges?.savedPlaceIds) && sumData.badges.savedPlaceIds.length > 0) {
          setSavedPlaceSlugs((prev) => Array.from(new Set([...prev, ...sumData.badges.savedPlaceIds])));
        }
      }
      setIsLoadingHome(false);
    });

    return () => {
      active = false;
    };
  }, []);

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

  // Chi tiết buổi hẹn sắp tới (điểm dừng + checklist) — tải lại mỗi khi summary đổi
  const [upcomingPlan, setUpcomingPlan] = useState<PlanDetailDto | null>(null);
  const upcomingPlanId = homeSummary?.upcomingPlan?.id ?? null;

  const loadUpcomingPlan = useCallback(async (planId: string | null) => {
    if (!planId) {
      setUpcomingPlan(null);
      return;
    }
    try {
      const res = await fetch(`/api/v1/user/plans/${encodeURIComponent(planId)}`, { cache: "no-store" });
      const json = await res.json();
      setUpcomingPlan(res.ok ? json.data : null);
    } catch (err) {
      console.warn("Không thể tải chi tiết buổi hẹn:", err);
    }
  }, []);

  useEffect(() => {
    loadUpcomingPlan(upcomingPlanId);
  }, [upcomingPlanId, homeSummary, loadUpcomingPlan]);

  const refreshUpcomingPlan = useCallback(async () => {
    await loadUpcomingPlan(upcomingPlanId);
  }, [loadUpcomingPlan, upcomingPlanId]);

  // Hồ sơ phòng (thành viên, biệt danh). Chưa có phòng thì không gọi để tránh 401 vô ích.
  const [roomProfile, setRoomProfile] = useState<RoomProfileDto | null>(null);
  const hasRoom = Boolean(homeSummary?.room);

  const refreshRoomProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/user/rooms/me", { cache: "no-store" });
      const json = await res.json();
      setRoomProfile(res.ok ? json.data : null);
    } catch (err) {
      console.warn("Không thể tải thông tin phòng:", err);
    }
  }, []);

  useEffect(() => {
    if (hasRoom) refreshRoomProfile();
    else setRoomProfile(null);
  }, [hasRoom, refreshRoomProfile]);

  // 2. Saved (đồng bộ từ home summary, chưa có phiên thì rỗng)
  const [savedPlaceSlugs, setSavedPlaceSlugs] = useState<string[]>([]);

  const isPlaceSaved = (slugOrId: string) => {
    const target = places.find((p) => p.slug === slugOrId || p.id === slugOrId);
    const slug = target ? target.slug : slugOrId;
    const id = target ? target.id : slugOrId;
    return savedPlaceSlugs.includes(slug) || savedPlaceSlugs.includes(id);
  };

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

  const toggleSavePlace = async (slugOrId: string) => {
    const targetPlace = places.find((p) => p.slug === slugOrId || p.id === slugOrId);
    const slug = targetPlace ? targetPlace.slug : slugOrId;
    const placeId = targetPlace ? targetPlace.id : slugOrId;
    const isCurrentlySaved = savedPlaceSlugs.includes(slug) || savedPlaceSlugs.includes(placeId);

    if (isCurrentlySaved) {
      setSavedPlaceSlugs((prev) => prev.filter((s) => s !== slug && s !== placeId));
      addToast("Đã bỏ lưu khỏi danh sách yêu thích", "info");
      try {
        await fetch(`/api/v1/user/saved/${encodeURIComponent(placeId)}`, { method: "DELETE" });
        refetchHomeSummary();
      } catch (e) {
        console.warn("Lỗi bỏ lưu:", e);
      }
    } else {
      setSavedPlaceSlugs((prev) => [...prev, slug]);
      addToast("❤️ Đã lưu cho bạn (Đồng bộ phòng đôi)", "success");
      try {
        await fetch(`/api/v1/user/saved/${encodeURIComponent(placeId)}`, { method: "POST" });
        refetchHomeSummary();
      } catch (e) {
        console.warn("Lỗi lưu địa điểm:", e);
      }
    }
  };

  const recordPlaceView = (slug: string) => {
    if (!slug) return;
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(`/api/v1/user/places/${encodeURIComponent(slug)}/view`);
      } else {
        fetch(`/api/v1/user/places/${encodeURIComponent(slug)}/view`, {
          method: "POST",
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // ignore
    }
  };

  // 4. Kế hoạch sắp tới (điểm dừng + checklist lưu trên server)
  const quickAddPlaceToPlan = async (placeOrId: HanoiPlace | string): Promise<boolean> => {
    let place: HanoiPlace | undefined;
    if (typeof placeOrId === "string") {
      place = places.find((p) => p.id === placeOrId || p.slug === placeOrId);
    } else {
      place = placeOrId;
    }
    const targetId = place?.id || (typeof placeOrId === "string" ? placeOrId : "");
    const placeName = place?.name || "Địa điểm";

    try {
      const res = await fetch("/api/v1/user/plans/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: targetId }),
      });
      const json = await res.json();
      if (json?.data?.success) {
        addToast(`📅 Đã thêm "${placeName}" vào "${json.data.planTitle}"!`, "success");
        await refetchHomeSummary();
        return true;
      }
      addToast(json?.error?.message || "Chưa thêm được vào kế hoạch, thử lại nhé.", "error");
    } catch (e) {
      console.warn("Lỗi quick-add trạm:", e);
      addToast("Mất kết nối, chưa thêm được vào kế hoạch.", "error");
    }
    return false;
  };

  const isPlaceInUpcomingPlan = (placeIdOrSlug: string) => {
    if (!upcomingPlan) return false;
    const target = places.find((p) => p.slug === placeIdOrSlug || p.id === placeIdOrSlug);
    const placeId = target ? target.id : placeIdOrSlug;
    return upcomingPlan.stops.some((stop) => stop.placeId === placeId);
  };

  const toggleUpcomingChecklistItem = async (itemId: string) => {
    if (!upcomingPlan) return;
    const item = upcomingPlan.checklist.find((c) => c.id === itemId);
    if (!item) return;
    const isDone = !item.isDone;

    // Cập nhật lạc quan, lỗi thì trả lại trạng thái cũ
    const applyDone = (done: boolean) =>
      setUpcomingPlan((prev) =>
        prev && {
          ...prev,
          checklist: prev.checklist.map((c) => (c.id === itemId ? { ...c, isDone: done } : c)),
        }
      );
    applyDone(isDone);

    try {
      const res = await fetch(
        `/api/v1/user/plans/${encodeURIComponent(upcomingPlan.id)}/checklist/${encodeURIComponent(itemId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isDone }),
        }
      );
      if (!res.ok) throw new Error(`checklist API ${res.status}`);
    } catch (e) {
      console.warn("Lỗi cập nhật checklist:", e);
      applyDone(!isDone);
      addToast("Chưa lưu được checklist, thử lại nhé.", "error");
    }
  };

  const addUpcomingChecklistItem = async (content: string): Promise<boolean> => {
    const text = content.trim();
    if (!upcomingPlan || !text) return false;
    try {
      const res = await fetch(`/api/v1/user/plans/${encodeURIComponent(upcomingPlan.id)}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const json = await res.json();
      if (!res.ok) {
        addToast(json?.error?.message || "Chưa thêm được mục chuẩn bị.", "error");
        return false;
      }
      await refetchHomeSummary();
      return true;
    } catch (err) {
      console.warn("Lỗi thêm checklist:", err);
      addToast("Mất kết nối, chưa thêm được mục chuẩn bị.", "error");
      return false;
    }
  };

  const deleteUpcomingChecklistItem = async (itemId: string): Promise<boolean> => {
    if (!upcomingPlan) return false;
    try {
      const res = await fetch(
        `/api/v1/user/plans/${encodeURIComponent(upcomingPlan.id)}/checklist/${encodeURIComponent(itemId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(`checklist API ${res.status}`);
      await refetchHomeSummary();
      return true;
    } catch (err) {
      console.warn("Lỗi xóa checklist:", err);
      addToast("Chưa xóa được mục chuẩn bị, thử lại nhé.", "error");
      return false;
    }
  };

  // 5. Modals
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
  const [wheelResult, setWheelResult] = useState<HanoiPlace | null>(null);

  // Vòng quay: server bốc ngẫu nhiên trong catalog đã xuất bản, loại 5 kết quả gần nhất
  const spinWheel = async () => {
    setIsSpinning(true);
    try {
      const query = new URLSearchParams();
      if (recentWheelSlugs.length > 0) query.set("exclude", recentWheelSlugs.join(","));
      const [res] = await Promise.all([
        fetch(`/api/v1/user/places/random?${query}`, { cache: "no-store" }),
        new Promise((resolve) => setTimeout(resolve, 700)),
      ]);
      const json = await res.json();
      if (!res.ok || !json?.data) {
        addToast(json?.error?.message || "Chưa bốc được địa điểm, thử lại nhé.", "error");
        return;
      }
      const chosen: HanoiPlace = json.data;
      setWheelResult(chosen);
      setRecentWheelSlugs((prev) => [...prev, chosen.slug].slice(-5));
    } catch (err) {
      console.warn("Lỗi vòng quay:", err);
      addToast("Mất kết nối, chưa quay được.", "error");
    } finally {
      setIsSpinning(false);
    }
  };

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);

  // 6. Vị trí người dùng: mặc định ước tính theo IP (không hỏi quyền), có thể đổi sang GPS cho chính xác
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const saveLocation = (location: UserLocation) => {
    setUserLocation(location);
    try {
      sessionStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(location));
    } catch {
      // Trình duyệt chặn storage thì chỉ giữ trong bộ nhớ
    }
  };

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(LOCATION_CACHE_KEY);
      if (cached) {
        setUserLocation(JSON.parse(cached));
        return;
      }
    } catch {
      // Bỏ qua cache hỏng / bị chặn
    }
    let active = true;
    setIsLocating(true);
    fetch("/api/v1/user/geo/ip", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const loc = json?.data?.location;
        if (active && loc) {
          saveLocation({ lat: loc.lat, lng: loc.lng, districtKey: loc.districtKey, districtName: loc.districtName, source: "ip" });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLocating(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const locateWithGps = async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      addToast("Thiết bị không hỗ trợ định vị GPS.", "error");
      return;
    }
    setIsLocating(true);
    try {
      const { coords } = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      const point = { lat: coords.latitude, lng: coords.longitude };
      const key = nearestDistrictKey(point);
      saveLocation({ ...point, districtKey: key, districtName: districtName(key), source: "gps" });
      addToast("📍 Đã cập nhật vị trí chính xác theo GPS!", "success");
    } catch {
      addToast("Chưa lấy được vị trí GPS, hãy cho phép truy cập vị trí nhé.", "error");
    } finally {
      setIsLocating(false);
    }
  };

  const distanceToPlace = (place: HanoiPlace): PlaceDistance | null => {
    if (!userLocation || place.lat == null || place.lng == null) return null;
    const now = new Date();
    const travel = calculateHanoiTravelMinutes(userLocation, { lat: place.lat, lng: place.lng }, now.getHours() * 60 + now.getMinutes());
    return { km: travel.distanceKm * ROAD_FACTOR, minutes: travel.travelMinutes };
  };


  return (
    <AppContext.Provider
      value={{
        homePublic,
        homeSummary,
        isLoadingHome,
        refetchHomeSummary,
        upcomingPlan,
        isPlaceInUpcomingPlan,
        toggleUpcomingChecklistItem,
        quickAddPlaceToPlan,
        recordPlaceView,

        places,
        isLoadingPlaces,
        placesNextCursor,
        isLoadingMorePlaces,
        loadMorePlaces,
        filteredPlaces,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        isTrainStreetSearch,


        savedPlaceSlugs,
        isPlaceSaved,
        toggleSavePlace,

        addUpcomingChecklistItem,
        deleteUpcomingChecklistItem,
        refreshUpcomingPlan,

        roomProfile,
        refreshRoomProfile,

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
        isSearchDrawerOpen,
        setIsSearchDrawerOpen,
        userLocation,
        isLocating,
        locateWithGps,
        distanceToPlace,

        toasts,
        addToast,
        removeToast,
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
