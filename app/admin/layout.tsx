import Link from "next/link";
import { LayoutDashboard, MapPin, PlusCircle, Image, History, ArrowLeft } from "lucide-react";

const ADMIN_NAV = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Quản lý địa điểm", href: "/admin/places", icon: MapPin },
  { label: "Thêm địa điểm", href: "/admin/places/new", icon: PlusCircle },
  { label: "Kho Media & Bản quyền", href: "/admin/media", icon: Image },
  { label: "Nhật ký hệ thống", href: "/admin/audit-logs", icon: History },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg text-white">DateMate CMS</h1>
            <p className="text-xs text-slate-400">Trang quản trị nội dung</p>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Icon className="w-4 h-4 text-peach-400" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về giao diện người dùng</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0">
          <span className="text-sm font-semibold text-slate-700">Quản trị viên DateMate</span>
          <div className="flex items-center gap-2 text-xs bg-peach-50 text-peach-700 px-3 py-1 rounded-full border border-peach-100 font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Hệ thống hoạt động ổn định</span>
          </div>
        </header>

        <main className="p-6 flex-1 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
