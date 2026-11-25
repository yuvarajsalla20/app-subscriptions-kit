import type { StoreOffer, StorePlan } from './payments';

/** Months in a plan's period (a year = 12); null for a one-off purchase or a period shorter than a month. */
export function months(p: Pick<StorePlan, 'period'>): number | null {
  if (!p.period) return null;
  if (p.period.unit === 'YEAR') return 12 * p.period.count;
  if (p.period.unit === 'MONTH') return p.period.count;
  return null;
}

/** Rounds down to the cent without losing one to floating point (19.99 stays 19.99, never 19.98). */
const downToCent = (n: number): number => Math.floor(Math.round(n * 1e6) / 1e4) / 100;

/** A price in the store's own currency, rounded down to the cent. */
export function money(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(downToCent(n));
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

/** Price per month, rounded down, for plans of more than one month. */
export function perMonth(p: StorePlan): number | null {
  const m = months(p);
  return m && m > 1 ? downToCent(p.price / m) : null;
}

/**
 * Percent saved against paying monthly for the same tier, rounded down. 0 when there is no monthly plan in the
 * same currency to compare with, so no saving is ever made up.
 */
export function savings(p: StorePlan, all: readonly StorePlan[]): number {
  const m = months(p);
  const monthly = all.find((x) => x.tier === p.tier && months(x) === 1 && x.currency === p.currency);
  if (!m || m <= 1 || !monthly) return 0;
  return Math.max(0, Math.floor(100 - (100 * p.price) / (monthly.price * m)));
}

/**
 * Whether a store product id is this plan: "monthly", or "hringnring_monthly" / "com.app.monthly" (the plan id after a
 * "_", "." or "-"). "bimonthly" is not "monthly". On Google Play the id may carry the base plan after a ":".
 */
export function isPlan(productId: string | null | undefined, planId: string): boolean {
  const product = (productId ?? '').toLowerCase().split(':')[0]!;
  const id = planId.toLowerCase();
  if (!product || !id) return false;
  return product === id || ['_', '.', '-'].some((sep) => product.endsWith(sep + id));
}

/** Months in a store period, with days and weeks as parts of a month (a week is about 0.23). */
const monthsIn = (period: { unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'; count: number }): number =>
  period.unit === 'YEAR' ? 12 * period.count : period.unit === 'MONTH' ? period.count : ((period.unit === 'WEEK' ? 7 : 1) * period.count) / 30.4375;

/**
 * Percent a subscriber offer saves against the plan's own price, per month, rounded. The offer's price is for one offer period,
 * which can be several months paid up front ($5.99 for 3 months on a $3.99 monthly plan is 50% off, not -50%). 0 when it
 * saves nothing or can't be compared.
 */
export function offerSaving(offer: Pick<StoreOffer, 'price' | 'period'> & { plan: Pick<StorePlan, 'price' | 'period'> }): number {
  if (!offer.plan.period || offer.plan.price <= 0 || offer.period.count <= 0 || offer.plan.period.count <= 0) return 0;
  const offerMonthly = offer.price / monthsIn(offer.period);
  const planMonthly = offer.plan.price / monthsIn(offer.plan.period);
  return Math.max(0, Math.min(100, Math.round(100 - (100 * offerMonthly) / planMonthly)));
}
