import type { LimitValue, SubscriptionConfig } from './define';

/** Position of a tier; an unknown tier counts as free, so a typo never unlocks anything. */
export const rank = (c: SubscriptionConfig, tier: string | null | undefined): number => Math.max(0, c.tiers.indexOf(tier ?? 'free'));

/** True when `tier` is `wanted` or higher. */
export const atLeast = (c: SubscriptionConfig, tier: string, wanted: string): boolean => c.tiers.includes(wanted) && rank(c, tier) >= rank(c, wanted);

/** The lowest tier that unlocks a feature ('free' when the config doesn't list it). */
export const tierFor = (c: SubscriptionConfig, feature: string): string => c.features[feature] ?? 'free';

export const canUse = (c: SubscriptionConfig, tier: string, feature: string): boolean => atLeast(c, tier, tierFor(c, feature));

/** The limit for this tier: its own value, or the nearest tier below that has one. */
export function limitFor(c: SubscriptionConfig, tier: string, name: string): LimitValue {
  const per = c.limits[name];
  if (!per) throw new Error(`app-subscriptions-kit: no limit called "${name}".`);
  for (let i = rank(c, tier); i >= 0; i--) {
    const v = per[c.tiers[i]!];
    if (v !== undefined) return v;
  }
  return per.free!;
}

/** For a count: value ≤ the limit. For a list: the value is in it. */
export function allowed(c: SubscriptionConfig, tier: string, name: string, value: number): boolean {
  const l = limitFor(c, tier, name);
  return typeof l === 'number' ? value <= l : l.includes(value);
}

/** The lowest tier where this value is allowed, for "Unlock with Pro" wording; null when no tier allows it. */
export function tierAllowing(c: SubscriptionConfig, name: string, value: number): string | null {
  return c.tiers.find((t) => allowed(c, t, name, value)) ?? null;
}
