"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { CalendarCheck, Gift, CheckSquare, Plus, Trash2, Compass, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { InteractiveTimeline } from "@/components/scrapbook/InteractiveTimeline";
import { PosterShareModal } from "@/components/scrapbook/modals/PosterShareModal";
import type { PlanDetailDto, PlanSummaryDto } from "@/server/services/user/plan.mapper";

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function formatPlanDate(planDate: string): string {
  const [y, m, d] = planDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return planDate;
  return `${WEEKDAYS[date.getDay()]} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function formatDateTime(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}

function nextSaturday(): string {
  const date = new Date();
  date.setDate(date.getDate() + (((6 - date.getDay()) % 7) || 7));
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

async function readError(res: Response, fallback: string): Promise<string> {
  const json = await res.json().catch(() => null);
  return json?.error?.message || fallback;
}

export default function PlansPage() {
  const { places, homeSummary, homePublic, isLoadingHome, refetchHomeSummary, roomProfile, setActiveDetailSlug, addToast } = useApp();

  const [plans, setPlans] = useState<PlanSummaryDto[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [newChecklistText, setNewChecklistText] = useState("");

  // Form tạo kế hoạch khi phòng chưa có buổi hẹn nào
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDate, setDraftDate] = useState(nextSaturday);
  const [draftTime, setDraftTime] = useState("16:30");
  const [draftBudget, setDraftBudget] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const upcomingPlanId = homeSummary?.upcomingPlan?.id ?? null;

  const loadPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/user/plans", { cache: "no-store" });
      const json = await res.json();
      const items: PlanSummaryDto[] = res.ok && Array.isArray(json?.data) ? json.data : [];
      setPlans(items);
      setSelectedPlanId((current) =>
        current && items.some((p) => p.id === current)
          ? current
          : (upcomingPlanId && items.some((p) => p.id === upcomingPlanId) ? upcomingPlanId : items[0]?.id ?? null)
      );
    } catch (err) {
      console.warn("Không thể tải danh sách kế hoạch:", err);
    } finally {
      setIsLoading(false);
    }
  }, [upcomingPlanId]);

  const loadPlan = useCallback(async (planId: string | null) => {
    if (!planId) {
      setPlan(null);
      return;
    }
    try {
      const res = await fetch(`/api/v1/user/plans/${encodeURIComponent(planId)}`, { cache: "no-store" });
      const json = await res.json();
      setPlan(res.ok ? json.data : null);
    } catch (err) {
      console.warn("Không thể tải chi tiết kế hoạch:", err);
    }
  }, []);

  useEffect(() => {
    if (!isLoadingHome) loadPlans();
  }, [isLoadingHome, loadPlans]);

  useEffect(() => {
    loadPlan(selectedPlanId);
  }, [selectedPlanId, loadPlan]);

  // Sau mỗi thay đổi: tải lại kế hoạch đang xem và đồng bộ trang chủ
  const refreshPlan = useCallback(async () => {
    await Promise.all([loadPlan(selectedPlanId), loadPlans(), refetchHomeSummary()]);
  }, [loadPlan, loadPlans, refetchHomeSummary, selectedPlanId]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = draftTitle.trim();
    if (!title || isCreating) return;
    const budget = Number(draftBudget.replace(/\D/g, ""));
    setIsCreating(true);
    try {
      const res = await fetch("/api/v1/user/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          planDate: draftDate,
          startTime: draftTime,
          ...(budget > 0 ? { budget } : {}),
        }),
      });
      if (!res.ok) {
        addToast(await readError(res, "Chưa tạo được kế hoạch, thử lại nhé."), "error");
        return;
      }
      const json = await res.json();
      setSelectedPlanId(json.data.id);
      setDraftTitle("");
      addToast(`📅 Đã tạo kế hoạch "${title}"!`, "success");
      await Promise.all([loadPlans(), refetchHomeSummary()]);
    } catch (err) {
      console.warn("Lỗi tạo kế hoạch:", err);
      addToast("Mất kết nối, chưa tạo được kế hoạch.", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const checklistUrl = (itemId?: string) =>
    `/api/v1/user/plans/${encodeURIComponent(plan?.id ?? "")}/checklist${itemId ? `/${encodeURIComponent(itemId)}` : ""}`;

  const patchChecklistItem = async (itemId: string, patch: { isDone?: boolean; assignedTo?: string | null }) => {
    if (!plan) return;
    const previous = plan.checklist;
    // Cập nhật lạc quan, lỗi thì trả lại trạng thái cũ
    setPlan({ ...plan, checklist: plan.checklist.map((c) => (c.id === itemId ? { ...c, ...patch } : c)) });
    try {
      const res = await fetch(checklistUrl(itemId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`checklist API ${res.status}`);
      refetchHomeSummary();
    } catch (err) {
      console.warn("Lỗi cập nhật checklist:", err);
      setPlan((current) => current && { ...current, checklist: previous });
      addToast("Chưa lưu được checklist, thử lại nhé.", "error");
    }
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newChecklistText.trim();
    if (!content || !plan) return;
    try {
      const res = await fetch(checklistUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        addToast(await readError(res, "Chưa thêm được mục chuẩn bị."), "error");
        return;
      }
      setNewChecklistText("");
      await refreshPlan();
    } catch (err) {
      console.warn("Lỗi thêm checklist:", err);
      addToast("Mất kết nối, chưa thêm được mục chuẩn bị.", "error");
    }
  };

  const handleDeleteChecklist = async (itemId: string) => {
    try {
      const res = await fetch(checklistUrl(itemId), { method: "DELETE" });
      if (!res.ok) throw new Error(`checklist API ${res.status}`);
      await refreshPlan();
    } catch (err) {
      console.warn("Lỗi xóa checklist:", err);
      addToast("Chưa xóa được mục chuẩn bị, thử lại nhé.", "error");
    }
  };

  const members = roomProfile?.members ?? [];
  const memberName = (memberId: string | null) =>
    (memberId && members.find((m) => m.id === memberId)?.nickname) || "Cả hai";

  if (isLoading || isLoadingHome) {
    return (
      <div className="p-10 text-center text-sm text-paper-muted animate-pulse">Đang tải kế hoạch của hai bạn...</div>
    );
  }

  // Chưa có kế hoạch nào: form tạo mới thay vì lịch trình mẫu
  if (plans.length === 0) {
    return (
      <div className="max-w-xl mx-auto bg-[#FFFDF9] rounded-3xl p-6 sm:p-8 border border-[#E6D7C3] shadow-xs space-y-5 relative animate-in fade-in duration-300">
        <div className="washi-tape washi-terracotta -top-3.5 left-10" />
        <div className="text-center space-y-1.5">
          <div className="text-4xl">🗓️</div>
          <h3 className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink">Chưa có buổi hẹn nào</h3>
          <p className="text-xs sm:text-sm text-paper-muted">
            Tạo kế hoạch rồi thêm điểm dừng từ trang Khám phá hoặc các địa điểm hai bạn đã Match.
          </p>
        </div>

        <form onSubmit={handleCreatePlan} className="space-y-3">
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            maxLength={150}
            required
            placeholder="Tên buổi hẹn (vd: Ngắm hoàng hôn Hồ Tây)"
            className="w-full px-3 py-2.5 rounded-xl bg-[#FAF4E8] border border-[#E6D7C3] text-sm focus:outline-none focus:border-brand-terracotta text-paper-ink"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              required
              className="px-3 py-2.5 rounded-xl bg-[#FAF4E8] border border-[#E6D7C3] text-sm focus:outline-none focus:border-brand-terracotta text-paper-ink"
            />
            <input
              type="time"
              value={draftTime}
              onChange={(e) => setDraftTime(e.target.value)}
              required
              className="px-3 py-2.5 rounded-xl bg-[#FAF4E8] border border-[#E6D7C3] text-sm focus:outline-none focus:border-brand-terracotta text-paper-ink"
            />
          </div>
          <input
            inputMode="numeric"
            value={draftBudget}
            onChange={(e) => setDraftBudget(e.target.value)}
            placeholder="Ngân sách dự kiến (VND, không bắt buộc)"
            className="w-full px-3 py-2.5 rounded-xl bg-[#FAF4E8] border border-[#E6D7C3] text-sm focus:outline-none focus:border-brand-terracotta text-paper-ink"
          />
          <button
            type="submit"
            disabled={isCreating || !draftTitle.trim()}
            className="w-full py-3 rounded-2xl bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold text-sm shadow-xs transition disabled:opacity-50"
          >
            {isCreating ? "Đang tạo..." : "📅 Tạo kế hoạch"}
          </button>
        </form>

        <div className="flex justify-center gap-3 text-xs font-bold">
          <Link href="/explore" className="text-brand-terracotta hover:underline flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> Khám phá địa điểm
          </Link>
          <Link href="/match" className="text-brand-terracotta hover:underline flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> Quẹt thẻ cùng người ấy
          </Link>
        </div>
      </div>
    );
  }

  const completedCount = plan?.checklist.filter((c) => c.isDone).length ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Chọn kế hoạch khi phòng có nhiều buổi hẹn */}
      {plans.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlanId(p.id)}
              className={cn(
                "px-3.5 py-2 rounded-2xl text-xs font-bold border whitespace-nowrap transition",
                p.id === selectedPlanId
                  ? "bg-brand-terracotta text-white border-brand-terracotta"
                  : "bg-[#FFFDF9] text-paper-ink border-[#E6D7C3] hover:bg-brand-peach/40"
              )}
            >
              {p.isSecretLocked ? "🎁 " : ""}
              {p.title} • {formatPlanDate(p.planDate)}
            </button>
          ))}
        </div>
      )}

      {!plan ? (
        <div className="p-10 text-center text-sm text-paper-muted animate-pulse">Đang tải lịch trình...</div>
      ) : (
        <>
          {/* Header kế hoạch & hành động */}
          <div className="bg-[#FFFDF9] rounded-3xl p-5 sm:p-6 border border-[#E6D7C3] shadow-xs flex flex-wrap items-center justify-between gap-4 relative">
            <div className="washi-tape washi-terracotta -top-3.5 left-10" />

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-brand-olive/15 text-brand-olive text-xs font-bold border border-brand-olive/20">
                  {formatPlanDate(plan.planDate)} • {plan.startTime}
                </span>
                {plan.budget !== null && (
                  <span className="text-xs text-paper-muted">
                    Ngân sách dự kiến: ~{plan.budget.toLocaleString("vi-VN")}đ
                  </span>
                )}
                {plan.isSecret && !plan.isSecretLocked && (
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-peach text-brand-terracottaDark text-xs font-bold flex items-center gap-1">
                    <Gift className="w-3 h-3" /> Hẹn bất ngờ
                    {plan.revealAt ? ` • người ấy thấy lúc ${formatDateTime(plan.revealAt)}` : ""}
                  </span>
                )}
              </div>
              <h3 className="font-serif font-extrabold text-xl sm:text-2xl text-paper-ink mt-1.5">{plan.title}</h3>
              {plan.note && <p className="text-xs text-paper-muted mt-1">{plan.note}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
            {!plan.isSecretLocked && (
              <button
                type="button"
                onClick={() => setIsShareOpen(true)}
                className="px-4 py-2 rounded-2xl bg-[#FFFDF9] border-2 border-brand-terracotta text-brand-terracottaDark text-xs font-bold transition hover:bg-[#FFF5F0]"
              >
                🖼️ Tạo ảnh Story chia sẻ
              </button>
            )}
            <a
              href={`/api/v1/user/plans/${encodeURIComponent(plan.id)}/export.ics`}
              download
              onClick={() => addToast("📅 Đang tải file lịch .ics để thêm vào Apple / Google Calendar!", "success")}
              className="px-4 py-2 rounded-2xl bg-brand-terracotta hover:bg-brand-terracottaDark text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Đồng bộ Lịch ĐT (.ics)</span>
            </a>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Lộ trình điểm dừng (7 cột) */}
            <div className="lg:col-span-7 space-y-4">
              {plan.isSecretLocked ? (
                /* F19: người ấy chỉ thấy ngày giờ, địa điểm mở khóa lúc revealAt */
                <div className="p-6 sm:p-8 rounded-3xl bg-[#362721] text-white text-center space-y-4 border-2 border-dashed border-[#E6D7C3] shadow-md">
                  <div className="text-5xl">🎁🔒</div>
                  <h4 className="font-serif font-extrabold text-xl sm:text-2xl text-brand-peach">
                    Người ấy đã chuẩn bị một buổi hẹn bất ngờ cho bạn!
                  </h4>
                  <p className="text-xs sm:text-sm text-white/85 max-w-md mx-auto leading-relaxed">
                    Hẹn bạn {formatPlanDate(plan.planDate)} lúc <strong className="text-brand-peach">{plan.startTime}</strong>.
                    {plan.revealAt && (
                      <>
                        {" "}Địa điểm sẽ tự mở khóa lúc{" "}
                        <strong className="text-brand-peach">{formatDateTime(plan.revealAt)}</strong>.
                      </>
                    )}
                  </p>
                </div>
              ) : plan.stops.length === 0 ? (
                <div className="bg-[#FFFDF9] rounded-3xl p-8 border border-[#E6D7C3] text-center space-y-3">
                  <div className="text-3xl">📍</div>
                  <p className="text-sm text-paper-muted">Kế hoạch chưa có điểm dừng nào.</p>
                  <div className="flex justify-center gap-3 text-xs font-bold">
                    <Link href="/explore" className="text-brand-terracotta hover:underline">+ Thêm từ Khám phá</Link>
                    <Link href="/match" className="text-brand-terracotta hover:underline">+ Từ địa điểm đã Match</Link>
                  </div>
                </div>
              ) : (
                <InteractiveTimeline
                  plan={plan}
                  places={places}
                  onRefresh={refreshPlan}
                  onOpenDetail={setActiveDetailSlug}
                  onError={(message) => addToast(message, "error")}
                  goldenHourStart={homePublic?.sun.goldenHour.start}
                  allowEditStops
                />
              )}
            </div>

            {/* Checklist chuẩn bị (5 cột) */}
            <div className="lg:col-span-5 bg-[#FFFDF9] rounded-3xl p-5 sm:p-6 border border-[#E6D7C3] shadow-xs space-y-4 relative">
              <div className="washi-tape washi-terracotta -top-3.5 right-8" />

              <div className="flex items-center justify-between">
                <h4 className="font-serif font-extrabold text-base text-paper-ink flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-brand-terracotta" />
                  <span>Checklist chuẩn bị</span>
                </h4>
                <span className="px-2.5 py-1 rounded-full bg-brand-peach text-brand-terracottaDark font-bold text-xs">
                  {completedCount}/{plan.checklist.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {plan.checklist.length === 0 && (
                  <p className="text-xs text-paper-muted text-center py-4">Chưa có món nào. Thêm đồ cần mang bên dưới nhé!</p>
                )}
                {plan.checklist.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-3 rounded-2xl border flex items-center justify-between gap-2 transition",
                      item.isDone ? "bg-brand-olive/10 border-brand-olive/30" : "bg-[#FAF4E8] border-[#E6D7C3]"
                    )}
                  >
                    <label className="flex items-center gap-2.5 min-w-0 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={item.isDone}
                        onChange={() => patchChecklistItem(item.id, { isDone: !item.isDone })}
                        className="w-4 h-4 accent-[#C84B31] rounded shrink-0"
                      />
                      <span
                        className={cn(
                          "text-xs font-medium leading-relaxed",
                          item.isDone ? "line-through text-paper-muted" : "text-paper-ink"
                        )}
                      >
                        {item.content}
                      </span>
                    </label>
                    <div className="flex items-center gap-1 shrink-0">
                      {members.length > 1 ? (
                        <select
                          value={item.assignedTo ?? ""}
                          onChange={(e) => patchChecklistItem(item.id, { assignedTo: e.target.value || null })}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FFFDF9] border border-[#E6D7C3] text-paper-ink"
                          title="Ai phụ trách"
                        >
                          <option value="">Cả hai</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nickname || "Thành viên"}
                              {m.isMe ? " (bạn)" : ""}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFFDF9] border border-[#E6D7C3] text-paper-ink">
                          {memberName(item.assignedTo)}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteChecklist(item.id)}
                        className="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-600 transition"
                        title="Xóa mục"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddChecklist} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  maxLength={200}
                  placeholder="Thêm đồ cần mang (vd: Máy ảnh film)..."
                  className="flex-1 px-3 py-2 rounded-xl bg-[#FAF4E8] border border-[#E6D7C3] text-xs focus:outline-none focus:border-brand-terracotta text-paper-ink placeholder:text-paper-muted"
                />
                <button
                  type="submit"
                  disabled={!newChecklistText.trim()}
                  className="px-3.5 py-2 rounded-xl bg-brand-terracotta hover:bg-brand-terracottaDark text-white text-xs font-bold shrink-0 transition flex items-center gap-1 shadow-2xs disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm</span>
                </button>
              </form>
            </div>
          </div>

          <PosterShareModal
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
            plan={plan}
            places={places}
            onRefresh={refreshPlan}
          />
        </>
      )}
    </div>
  );
}
