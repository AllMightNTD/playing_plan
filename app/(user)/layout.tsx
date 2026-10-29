"use client";

import React from "react";
import { AppProvider } from "@/context/AppContext";
import { ScrapbookNavbar } from "@/components/user/ScrapbookNavbar";
import { RoomDeletionBanner } from "@/components/user/RoomDeletionBanner";
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
  return (
    <AppProvider>
      <div className="viewport-wrapper flex-1">
        <div className="scrapbook-paper min-h-screen flex flex-col relative shadow-2xl text-paper-ink">
          <ScrapbookNavbar />
          <RoomDeletionBanner />

          <main className="main-content-area flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-[1140px] mx-auto">{children}</div>
          </main>

          <BottomNav />
        </div>
      </div>

      {/* Toast & modal dùng chung */}
      <ToastContainer />
      <PlaceDetailModal />
      <WizardModal />
      <LuckyWheelModal />
      <RoomModal />
    </AppProvider>
  );
}
