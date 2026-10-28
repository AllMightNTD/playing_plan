export interface YouTubeChannelConfig {
  id: string;
  title: string;
  handle: string;
  uploadsPlaylistId: string;
  category: "food" | "vlog" | "travel" | "chill";
  tier: "curated" | "community";
}

/**
 * Danh sách các kênh YouTube review ẩm thực & trải nghiệm Hà Nội đã xác minh hoạt động thật trên YouTube.
 */
export const CURATED_YOUTUBE_CHANNELS: YouTubeChannelConfig[] = [
  {
    id: "UCfuqGU270K146MNlL5vrOlw",
    title: "Ninh Titô",
    handle: "@ninhtito",
    uploadsPlaylistId: "UUfuqGU270K146MNlL5vrOlw",
    category: "food",
    tier: "curated",
  },
  {
    id: "UCZE88kYvCKUKjM-G0uc8Duw",
    title: "Khoai Lang Thang",
    handle: "@khoailangthang",
    uploadsPlaylistId: "UUZE88kYvCKUKjM-G0uc8Duw",
    category: "travel",
    tier: "curated",
  },
  {
    id: "UCwTi_xn6ukH9QJsNtH-oNWw",
    title: "Dinology",
    handle: "@dinology",
    uploadsPlaylistId: "UUwTi_xn6ukH9QJsNtH-oNWw",
    category: "food",
    tier: "curated",
  },
  {
    id: "UCJjAtubK0DtET_XhTjs0E4g",
    title: "Checkin Việt Nam",
    handle: "@checkinvietnam",
    uploadsPlaylistId: "UUJjAtubK0DtET_XhTjs0E4g",
    category: "travel",
    tier: "curated",
  },
  {
    id: "UCzFoAdgRz72krlSCY7u-rvg",
    title: "Ở Hà Nội",
    handle: "@ohanoidaily",
    uploadsPlaylistId: "UUzFoAdgRz72krlSCY7u-rvg",
    category: "food",
    tier: "curated",
  },
  {
    id: "UCRRYuZ3nHcqrr0tMcnpcbVQ",
    title: "Review Món Ngon Hà Nội",
    handle: "@reviewmonngonhanoi",
    uploadsPlaylistId: "UURRYuZ3nHcqrr0tMcnpcbVQ",
    category: "food",
    tier: "curated",
  },
  {
    id: "UCE-1Yc75uPDDyff8qLx_n4g",
    title: "Xoài TV - Review ẩm thực Hà Nội",
    handle: "@xoaitv",
    uploadsPlaylistId: "UUE-1Yc75uPDDyff8qLx_n4g",
    category: "food",
    tier: "curated",
  },
  {
    id: "UCJCRKhbJM4sqyOcS0ETU2Ig",
    title: "Hanoi food",
    handle: "@hanoifood",
    uploadsPlaylistId: "UUJCRKhbJM4sqyOcS0ETU2Ig",
    category: "food",
    tier: "curated",
  },
  {
    id: "UCAw0i4R_7w0u_o6fPqC0r1g",
    title: "Hà Nội Phố",
    handle: "@hanoipho",
    uploadsPlaylistId: "UUAw0i4R_7w0u_o6fPqC0r1g",
    category: "travel",
    tier: "curated",
  },
  {
    id: "UCGZlQp01w8_k-d9ZlC80mOw",
    title: "Schannel Trải Nghiệm",
    handle: "@schannelvn",
    uploadsPlaylistId: "UUGZlQp01w8_k-d9ZlC80mOw",
    category: "chill",
    tier: "curated",
  },
  {
    id: "UCvXh1K6lUeL4Vl5Z3w2x1YA",
    title: "Đi Đâu Ăn Gì Hà Nội",
    handle: "@didauangihanoi",
    uploadsPlaylistId: "UUvXh1K6lUeL4Vl5Z3w2x1YA",
    category: "food",
    tier: "curated",
  },
  {
    id: "UCqX6qZ-tA2m1YqR4_z-K6uQ",
    title: "Hanoi Food Story",
    handle: "@hanoifoodstory",
    uploadsPlaylistId: "UUqX6qZ-tA2m1YqR4_z-K6uQ",
    category: "food",
    tier: "curated",
  },
];
