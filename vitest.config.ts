import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    // Test service chạy trên repository in-memory, không bao giờ chạm DB thật dù shell có DATABASE_URL.
    env: { DATABASE_URL: "" },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
