import type { PlanDetailDto, PlanSummaryDto } from "@/server/services/user/plan.mapper";

export async function fetchPlansList(): Promise<PlanSummaryDto[]> {
  const res = await fetch("/api/v1/user/plans");
  const json = await res.json().catch(() => null);
  return res.ok && Array.isArray(json?.data) ? json.data : [];
}

export async function fetchPlanDetail(planId: string | null): Promise<PlanDetailDto | null> {
  if (!planId) return null;
  const res = await fetch(`/api/v1/user/plans/${encodeURIComponent(planId)}`);
  const json = await res.json().catch(() => null);
  return res.ok && json?.data ? json.data : null;
}
