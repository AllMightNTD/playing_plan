import { revalidatePath } from "next/cache";

/**
 * On-demand Server-side Cache Invalidation (Next.js ISR).
 * Gọi khi có địa điểm được thăng hạng, cập nhật thông tin hoặc thu hồi batch.
 * Đảm bảo khách mở web nhận ngay trang mới với tốc độ 0.1s mà không cần client polling.
 */
export async function revalidatePlaceCatalog(slug?: string): Promise<{ revalidated: boolean; paths: string[] }> {
  const paths = ["/places", "/", "/explore"];
  if (slug) {
    paths.push(`/places/${slug}`);
  }

  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch (err) {
      // Khi chạy trong môi trường test/CLI ngoài Next.js request context, revalidatePath có thể báo warning
      console.warn(`[REVALIDATE] Bỏ qua revalidatePath("${path}") ngoài Next.js server context.`);
    }
  }

  return { revalidated: true, paths };
}
