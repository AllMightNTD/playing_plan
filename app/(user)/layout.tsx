"use client";

import React, { useState, useRef } from "react";
import { AppProvider } from "@/context/AppContext";
import { DeviceSwitcherBar, ViewportMode } from "@/components/user/DeviceSwitcherBar";
import { ScrapbookNavbar } from "@/components/user/ScrapbookNavbar";
import { BottomNav } from "@/components/user/BottomNav";
import { ToastContainer } from "@/components/user/Toast";
import { PlaceDetailModal } from "@/components/user/PlaceDetailModal";
import { WizardModal } from "@/components/user/WizardModal";
import { LuckyWheelModal } from "@/components/user/LuckyWheelModal";
import { RoomModal } from "@/components/user/RoomModal";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [viewportMode, setViewportMode] = useState<ViewportMode>("auto");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const modeClass =
    viewportMode === "tablet"
      ? "mode-tablet"
      : viewportMode === "mobile"
      ? "mode-mobile"
      : "";

  return (
    <AppProvider>
      <div className="min-h-screen bg-[#26201D] text-paper-ink flex flex-col font-sans selection:bg-brand-terracotta selection:text-white">
        {/* TOP FLOATING DEVICE SWITCHER BAR */}
        <DeviceSwitcherBar currentMode={viewportMode} onModeChange={setViewportMode} />

        {/* VIEWPORT CONTAINER */}
        <div id="viewportWrapper" className={`viewport-wrapper ${modeClass}`}>
          <div
            id="appScrollFrame"
            ref={scrollContainerRef}
            className="app-frame scrapbook-canvas min-h-screen flex flex-col relative"
          >
            {/* 1. STICKY SCRAPBOOK TOP NAVBAR */}
            <ScrapbookNavbar scrollContainerRef={scrollContainerRef} />

            {/* 2. MAIN SCRAPBOOK CONTENT AREA */}
            <main className="main-content-area flex-1 p-5 sm:p-7 lg:p-9 overflow-x-hidden">
              <div className="max-w-[1140px] mx-auto">
                {children}
              </div>
            </main>

            {/* 3. MOBILE FLOATING BOTTOM NAVIGATION BAR */}
            <BottomNav />
          </div>
        </div>

        {/* Global Floating Toasts */}
        <ToastContainer />

        {/* Global Modals */}
        <PlaceDetailModal />
        <WizardModal />
        <LuckyWheelModal />
        <RoomModal />
      </div>
    </AppProvider>
  );
}

