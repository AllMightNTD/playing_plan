import React from "react";
import type { Metadata } from "next";
import { getPublicPlanByShareToken } from "@/server/services/user/plan-rsvp.service";
import { PublicPosterClient } from "./PublicPosterClient";

interface PageProps {
  params: Promise<{ shareToken: string }>;
}

export const metadata: Metadata = {
  title: "Thiệp Mời Hẹn Hò • DateMate",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PublicPosterPage({ params }: PageProps) {
  const { shareToken } = await params;

  let posterData = null;
  try {
    posterData = await getPublicPlanByShareToken(shareToken);
  } catch {
    posterData = null;
  }

  return (
    <div className="min-h-screen bg-[#F7F1E5] flex flex-col items-center justify-center p-4">
      {posterData ? (
        <PublicPosterClient shareToken={shareToken} initialPlan={posterData} />
      ) : (
        <div className="max-w-md w-full bg-[#FFFDF9] border border-[#E6D3B8] rounded-3xl p-8 text-center shadow-lg font-sans">
          <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-2xl">
            💌
          </div>
          <h2 className="text-xl font-serif font-bold text-[#362721] mb-2">
            Thiệp mời không còn khả dụng
          </h2>
          <p className="text-sm text-[#362721]/70">
            Lời mời này đã hết hạn (sau 72 giờ) hoặc người tạo đã thu hồi link chia sẻ rồi bạn nhé.
          </p>
        </div>
      )}
    </div>
  );
}
