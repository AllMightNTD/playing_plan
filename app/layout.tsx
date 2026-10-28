import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DateMate - Web app lên lịch đi chơi cho cặp đôi",
  description: "Khám phá địa điểm hẹn hò, giờ chụp ảnh đẹp, gợi ý trang phục và lên lịch đi chơi tại Hà Nội.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FFF7F3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
