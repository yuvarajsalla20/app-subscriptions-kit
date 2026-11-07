import type { StorePlan } from './payments';

/** Months in a plan's period (a year = 12); null for a one-off purchase or a period shorter than a month. */
export function months(p: Pick<StorePlan, 'period'>): number | null {
  if (!p.period) return null;
  if (p.period.unit === 'YEAR') return 12 * p.period.count;
  if (p.period.unit === 'MONTH') return p.period.count;
  return null;
}

/** A price in the store's own currency, rounded down to the cent. */
export function money(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Math.floor(n * 100) / 100);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

/** Price per month, rounded down, for plans of more than one month. */
export function perMonth(p: StorePlan): number | null {
  const m = months(p);
  return m && m > 1 ? Math.floor((p.price / m) * 100) / 100 : null;
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
