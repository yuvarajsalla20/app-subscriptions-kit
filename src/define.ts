/** A plan on the Plans screen. Prices come from the store; this is order and wording only. */
export interface PlanConfig {
  /** The same id the payments kit uses, such as 'yearly'. */
  id: string;
  tier: string;
  label: string;
  /** A short tag on the card, such as "Most popular". */
  badge?: string;
  /** Picked when the screen opens. Default: the first plan of the tier. */
  selected?: boolean;
}

/** A row of the Free vs paid table: one value per tier. */
export interface CompareRow {
  label: string;
  /** One value per tier: '✓', '–', a number or a short word. */
  values: Record<string, string>;
  /** A small icon before the label, such as the app's icon tile for that feature. */
  icon?: import('react').ReactNode;
}

export type LimitValue = number | readonly number[];

export interface SubscriptionConfigInput {
  /** Lowest first, starting with 'free'. Default ['free', 'premium']. */
  tiers?: readonly string[];
  /** Display names, such as { premium: 'Premium' }. Default: the tier name with a capital letter. */
  tierLabels?: Record<string, string>;
  /** The lowest tier that unlocks each feature. Features not listed are free. */
  features?: Record<string, string>;
  /** A number (a count) or a list of allowed values, per tier. A tier not listed gets the value of the nearest tier below it. */
  limits?: Record<string, Record<string, LimitValue>>;
  plans?: PlanConfig[];
  compare?: CompareRow[];
  /** Kids' app: every buy, restore and manage link asks the app's grown-ups check first. */
  kids?: boolean;
}

export interface SubscriptionConfig {
  tiers: string[];
  tierLabels: Record<string, string>;
  features: Record<string, string>;
  limits: Record<string, Record<string, LimitValue>>;
  plans: PlanConfig[];
  compare: CompareRow[];
  kids: boolean;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Checks the app's config once, at start, so a typo fails loudly in development instead of unlocking something. */
export function defineSubscription(input: SubscriptionConfigInput): SubscriptionConfig {
  const tiers = [...new Set(['free', ...(input.tiers ?? ['free', 'premium']).filter((t) => t !== 'free')])];
  if (tiers.length < 2) throw new Error('app-subscriptions-kit: name at least one paid tier, such as ["free", "premium"].');
  const known = (t: string, where: string) => {
    if (!tiers.includes(t)) throw new Error(`app-subscriptions-kit: unknown tier "${t}" in ${where}. Tiers are ${tiers.join(', ')}.`);
  };
  const features = { ...input.features };
  for (const [f, t] of Object.entries(features)) known(t, `features.${f}`);
  const limits = { ...input.limits };
  for (const [name, per] of Object.entries(limits)) {
    if (per.free === undefined) throw new Error(`app-subscriptions-kit: limits.${name} needs a value for "free".`);
    for (const t of Object.keys(per)) known(t, `limits.${name}`);
  }
  const plans = [...(input.plans ?? [])];
  for (const p of plans) known(p.tier, `plans.${p.id}`);
  const tierLabels = Object.fromEntries(tiers.map((t) => [t, input.tierLabels?.[t] ?? cap(t)]));
  return { tiers, tierLabels, features, limits, plans, compare: [...(input.compare ?? [])], kids: !!input.kids };
}
