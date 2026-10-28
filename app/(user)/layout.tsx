import React from "react";
import { AppProvider } from "@/context/AppContext";
import { BottomNav } from "@/components/user/BottomNav";
import { DesktopSidebar } from "@/components/user/DesktopSidebar";
import { DesktopHeader } from "@/components/user/DesktopHeader";
import { MobileHeader } from "@/components/user/MobileHeader";
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
      <div className="min-h-screen bg-cream text-brown flex flex-col font-sans selection:bg-peach selection:text-white">
        {/* Desktop Wrapper (>= 1024px) */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-screen w-full">
          {/* Desktop Left Sidebar */}
          <div className="hidden lg:block shrink-0">
            <DesktopSidebar />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-cream">
            {/* Desktop Header */}
            <DesktopHeader />

            {/* Mobile Header (< lg) */}
            <MobileHeader />

            {/* Main scrollable body */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-28 lg:pb-10">
              {children}
            </main>

            {/* Mobile Bottom Navigation (< lg) */}
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
