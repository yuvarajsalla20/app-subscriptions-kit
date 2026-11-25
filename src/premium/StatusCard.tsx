import type { ReactNode } from 'react';
import type { LookProps } from '../look';
import { useSubscription } from '../subscription/SubscriptionProvider';
import { YourPlanCard } from './YourPlanCard';

/**
 * @deprecated 8.0.0: use `YourPlanCard`, which also names the plan for a free account. This now draws the Your Plan card
 * for a paid account and nothing for a free one, as before.
 */
export function SubscriptionStatusCard({ icon, ...look }: LookProps & { icon?: ReactNode }) {
  const sub = useSubscription();
  if (!sub.paid) return null;
  return <YourPlanCard icon={icon} {...look} />;
}
