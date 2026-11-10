"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { PlaceSuggestion } from "@/lib/catalog-filter";
import { cn } from "@/lib/utils";

interface ExploreSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onSearch: (val: string) => void;
  onSelectSuggestion?: (suggestion: PlaceSuggestion) => void;
  onOpenWheel?: () => void;
  placeholder?: string;
  className?: string;
}

export function ExploreSearchBar({
  value,
  onChange,
  onSearch,
  onSelectSuggestion,
  onOpenWheel,
  placeholder = "Tìm nhanh không dấu: hồ tây, cầu long biên, cà phê, bảo tàng...",
  className,
}: ExploreSearchBarProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced fetch suggestions
  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    let active = true;
    setIsLoadingSuggestions(true);

    const timer = setTimeout(async () => {
      try {
        const query = new URLSearchParams({
          q: trimmed,
          limit: "5",
        });
        const res = await fetch(`/api/v1/user/places/suggestions?${query}`);
        if (!res.ok) throw new Error("Failed to fetch suggestions");
        const json = await res.json();
        if (active) {
          const items: PlaceSuggestion[] = json?.data ?? [];
          setSuggestions(items);
          setIsOpenDropdown(items.length > 0);
        }
      } catch {
        if (active) setSuggestions([]);
      } finally {
        if (active) setIsLoadingSuggestions(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpenDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsOpenDropdown(false);
      onSearch(value);
    } else if (e.key === "Escape") {
      setIsOpenDropdown(false);
    }
  };

  const handleClear = useCallback(() => {
    onChange("");
    onSearch("");
    setSuggestions([]);
    setIsOpenDropdown(false);
  }, [onChange, onSearch]);

  const handleSelect = (item: PlaceSuggestion) => {
    setIsOpenDropdown(false);
    if (onSelectSuggestion) {
      onSelectSuggestion(item);
    } else {
      onChange(item.name);
      onSearch(item.name);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative flex-1", className)}>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-terracotta select-none text-sm">
          🔍
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpenDropdown && e.target.value.trim().length >= 2) {
              setIsOpenDropdown(true);
            }
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpenDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Tìm kiếm địa điểm"
          className="w-full pl-10 pr-24 py-2.5 bg-[#FAF4E8] border border-[#CBB292] focus:border-brand-terracotta rounded-xl text-xs sm:text-sm font-medium text-paper-ink focus:outline-none transition shadow-2xs"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="px-2 py-1 rounded-lg bg-[#E5D1B8] text-[11px] font-bold text-paper-ink hover:bg-[#D8C0A4] transition"
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}

          {onOpenWheel && (
            <button
              type="button"
              onClick={onOpenWheel}
              className="px-2.5 py-1 rounded-lg bg-[#F9EFC7] border border-[#D5BE7E] text-[11px] font-bold text-paper-ink hover:bg-[#F3E5A5] transition flex items-center gap-1"
              title="Quay ngẫu nhiên địa điểm"
            >
              <span>🎲</span>
              <span className="hidden sm:inline">Gợi ý</span>
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpenDropdown && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#FFFDF9] border-2 border-[#D8C7B0] rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 bg-[#FAF4E8] border-b border-[#E8DAC6] flex items-center justify-between text-[11px] font-bold text-paper-muted">
            <span>✨ Gợi ý nhanh</span>
            {isLoadingSuggestions && <span className="animate-pulse">Đang tìm...</span>}
          </div>
          <ul className="divide-y divide-[#F2E8D8] max-h-64 overflow-y-auto">
            {suggestions.map((item) => (
              <li key={item.slug}>
                <button
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-[#F8EFE2] transition flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-paper-ink truncate">{item.name}</p>
                    <p className="text-[11px] text-paper-muted flex items-center gap-1">
                      <span>📍 {item.area}</span>
                      {item.categoryLabel && (
                        <>
                          <span>•</span>
                          <span>{item.categoryLabel}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className="text-[11px] text-brand-terracotta font-semibold shrink-0">
                    Xem ➔
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
