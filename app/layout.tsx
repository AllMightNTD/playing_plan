import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Fraunces, Caveat, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-hand",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-mono",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://datemate.vn";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DateMate 💖 - Web App Lên Lịch Hẹn Hò & Quẹt Thẻ Cho Cặp Đôi",
    template: "%s | DateMate",
  },
  description:
    "Khám phá quán đẹp Hà Nội, quẹt thẻ tìm điểm hẹn chung, tính giờ vàng hoàng hôn SunCalc và lập kế hoạch hẹn hò lãng mạn cho cặp đôi.",
  applicationName: "DateMate",
  authors: [{ name: "DateMate Team", url: siteUrl }],
  creator: "DateMate",
  publisher: "DateMate",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: "/logo.svg",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: siteUrl,
    title: "DateMate 💖 - Lên Lịch Đi Chơi & Hẹn Hò Cho Cặp Đôi",
    description:
      "Quẹt thẻ tìm quán chung, tính giờ vàng hoàng hôn SunCalc, và lưu giữ kỷ niệm hẹn hò ngọt ngào.",
    siteName: "DateMate",
    images: [
      {
        url: "/logo.svg",
        width: 512,
        height: 512,
        alt: "DateMate Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DateMate 💖 - Lên Lịch Đi Chơi Cho Cặp Đôi",
    description:
      "Khám phá quán đẹp Hà Nội, quẹt thẻ tìm điểm hẹn chung và tính giờ vàng hoàng hôn.",
    images: ["/logo.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F7F1E5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${fraunces.variable} ${caveat.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased min-h-dvh flex flex-col font-sans">{children}</body>
    </html>
  );
}
