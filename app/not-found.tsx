import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center text-3xl mb-4 font-bold">
        404
      </div>
      <h1 className="text-xl font-bold text-slate-800 mb-2">
        Không tìm thấy trang
      </h1>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển. Hãy quay về trang chủ để tiếp tục lên lịch hẹn hò nhé!
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-rose-500 text-white font-medium text-sm shadow-md hover:bg-rose-600 transition-colors"
      >
        Về trang chủ
      </Link>
    </main>
  );
}
