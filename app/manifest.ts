import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DateMate - Lên lịch đi chơi cho cặp đôi",
    short_name: "DateMate",
    description: "Khám phá địa điểm hẹn hò, giờ chụp ảnh đẹp và lên kế hoạch tại Hà Nội.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF7F3",
    theme_color: "#FFF7F3",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
