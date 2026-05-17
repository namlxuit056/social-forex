export type VipPlanKey = "monthly" | "quarterly";

export type VipPlan = {
  key: VipPlanKey;
  months: number;
  days: number;
  price: string;
  pricePerMonth: string;
};

export const VIP_PLANS: Record<VipPlanKey, VipPlan> = {
  monthly: {
    key: "monthly",
    months: 1,
    days: 30,
    price: "5.00",
    pricePerMonth: "5.00",
  },
  quarterly: {
    key: "quarterly",
    months: 3,
    days: 90,
    price: "12.00",
    pricePerMonth: "4.00",
  },
};

export function getVipPlan(planKey: unknown): VipPlan | null {
  if (planKey === "monthly" || planKey === "quarterly") {
    return VIP_PLANS[planKey];
  }
  return null;
}
