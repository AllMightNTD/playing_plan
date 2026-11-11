"use client";

import React from "react";
import dynamic from "next/dynamic";
import { QueryProvider } from "@/providers/QueryProvider";
import { AppProvider } from "@/context/AppContext";
import { ScrapbookNavbar } from "@/components/user/ScrapbookNavbar";
import { RoomDeletionBanner } from "@/components/user/RoomDeletionBanner";
import { BottomNav } from "@/components/user/BottomNav";
import { ToastContainer } from "@/components/user/Toast";

const PlaceDetailModal = dynamic(
  () => import("@/components/user/PlaceDetailModal").then((m) => m.PlaceDetailModal),
  { ssr: false }
);
const WizardModal = dynamic(
  () => import("@/components/user/WizardModal").then((m) => m.WizardModal),
  { ssr: false }
);
const LuckyWheelModal = dynamic(
  () => import("@/components/user/LuckyWheelModal").then((m) => m.LuckyWheelModal),
  { ssr: false }
);
const RoomModal = dynamic(
  () => import("@/components/user/RoomModal").then((m) => m.RoomModal),
  { ssr: false }
);

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <AppProvider>
      <div className="viewport-wrapper flex-1 min-w-0">
        <div className="scrapbook-paper min-h-screen flex flex-col relative shadow-2xl text-paper-ink min-w-0 w-full overflow-x-hidden">
          <ScrapbookNavbar />
          <RoomDeletionBanner />

          <main className="main-content-area flex-1 min-w-0 w-full p-3.5 sm:p-6 lg:p-8">
            <div className="max-w-[1140px] w-full min-w-0 mx-auto">{children}</div>
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
  </QueryProvider>
  );
}
