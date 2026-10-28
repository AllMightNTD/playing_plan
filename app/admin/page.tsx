import Link from "next/link";
import { MapPin, Users, Sparkles, CheckCircle2 } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Tổng quan hệ thống</h2>
        <p className="text-sm text-slate-500">
          Theo dõi dữ liệu địa điểm cẩm nang và tình trạng các dịch vụ 100% Free
        </p>
      </div>

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Địa điểm khởi đầu</span>
            <MapPin className="w-4 h-4 text-peach-700" />
          </div>
          <p className="text-2xl font-bold text-slate-800">36</p>
          <p className="text-xs text-green-600 font-medium">Hà Nội (Mục 14 Spec)</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">AI Hỗ trợ nhập</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">Gemini Flash</p>
          <p className="text-xs text-green-600 font-medium">100% Free Tier Sẵn sàng</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Mô hình ghép đôi</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">Atomic Join</p>
          <p className="text-xs text-slate-500 font-medium">Không tài khoản / 2 thiết bị</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Cơ sở dữ liệu</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">TiDB Cloud</p>
          <p className="text-xs text-emerald-600 font-medium">Serverless Driver HTTP</p>
        </div>
      </div>

      {/* Hành động nhanh */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-800">Hành động nhanh</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/places/new"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <span>+ Thêm địa điểm & cẩm nang</span>
          </Link>
          <Link
            href="/admin/places"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-lg transition-colors"
          >
            Xem danh sách 36 địa điểm
          </Link>
          <Link
            href="/admin/media"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-lg transition-colors"
          >
            Quản lý kho ảnh & bản quyền
          </Link>
        </div>
      </div>
    </div>
  );
}
