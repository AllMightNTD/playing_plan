import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "thumb.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "p16-va.tiktokcdn.com",
      },
      {
        protocol: "https",
        hostname: "v16-webapp-prime.tiktok.com",
      },
    ],
  },
  async rewrites() {
    return [
      { source: "/api/home/:path*", destination: "/api/v1/user/home/:path*" },
      { source: "/api/plans/:id/ics", destination: "/api/v1/user/plans/:id/export.ics" },
      { source: "/api/plans/:path*", destination: "/api/v1/user/plans/:path*" },
      { source: "/api/places/:path*", destination: "/api/v1/user/places/:path*" },
      { source: "/api/saved/:path*", destination: "/api/v1/user/saved/:path*" },
      { source: "/api/rooms/recovery", destination: "/api/v1/user/rooms/recovery-key" },
      { source: "/api/rooms/:path*", destination: "/api/v1/user/rooms/:path*" },
      { source: "/api/matches/:path*", destination: "/api/v1/user/matches/:path*" },
      { source: "/api/recommend", destination: "/api/v1/user/recommend" },
    ];
  },
};

export default nextConfig;
