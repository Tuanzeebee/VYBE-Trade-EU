export type BillingCycle = 'monthly' | 'annual';
export type Plan = 'Free' | 'Member' | 'Premium';

export function getPlanPrice(plan: Plan, cycle: BillingCycle): number {
  const monthly = { Free: 0, Member: 990_000, Premium: 2_990_000 }[plan];
  return monthly * (cycle === 'annual' ? 10 : 1);
}
