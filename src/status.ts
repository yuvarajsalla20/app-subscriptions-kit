import { isPlan } from './pricing';
import type { PlanConfig } from './define';
import type { RenewalInfo, ServerInfo, WatchState } from './payments';
import type { SubscriptionStrings } from './theme';

/** The lines of the status card, worked out from what the store or a server row says. Empty strings are left out. */
export interface StatusLines {
  title: string;
  plan: string;
  when: string;
  /** Auto-renew is off: the date line uses the premium color, not the accent. */
  ending: boolean;
  note: string;
}

/** "Thu, Nov 12, 2026, 11:35 PM" in the phone's language. */
const dateTime = (d: Date): string => {
  try {
    return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }
};

/** Whether the plan renews, until when, and whether a payment failed: what every screen shows about the subscription. */
export interface SubscriptionTerms {
  /** Auto-renew is off: the plan ends at `until`. */
  ending: boolean;
  /** When it renews or ends (ISO), only while that is still ahead; null otherwise. */
  until: string | null;
  /** The store couldn't take the renewal payment (or the server row says grace): ask the person to update it. */
  billingIssue: boolean;
}

const ahead = (iso: string | null | undefined, now: number): boolean => {
  const t = iso ? Date.parse(iso) : NaN;
  return !Number.isNaN(t) && t > now;
};

/**
 * One answer for the status card, the Premium page and the Settings row. The server row counts only while it gives the tier
 * (`source` 'account', or its end date is still ahead): an expired, refunded or not-yet-updated row never overrides the store.
 * When both count, the one that runs later wins, and on the same date the store does, because it is asked live while the row
 * waits for a webhook (a cancel in Apple's sheet shows in the store first). A date already past is left out.
 */
export function subscriptionTerms(input: { server: ServerInfo | null; renewal: RenewalInfo | null | undefined; source?: WatchState['source']; now?: Date }): SubscriptionTerms {
  const { server, renewal } = input;
  const now = (input.now ?? new Date()).getTime();
  const rowCounts = !!server && (input.source === 'account' || ahead(server.activeUntil, now));
  const store = renewal ?? null;
  // null is no end date (lifetime), which runs longest.
  const runsLonger = (a: string | null, b: string | null) => (a === null ? b !== null : b !== null && Date.parse(a) > Date.parse(b));
  const useRow = rowCounts && (!store || runsLonger(server!.activeUntil, store.until));
  const ending = useRow ? server!.willRenew === false : store ? store.willRenew === false : false;
  const iso = useRow ? server!.activeUntil : store?.until ?? null;
  return {
    ending,
    until: ahead(iso, now) ? iso : null,
    billingIssue: !!store?.billingIssue || (rowCounts && server!.status === 'grace'),
  };
}

/**
 * What the card says, from `subscriptionTerms` (the same rule as the Premium page and SubscriptionRow). The plan is the one
 * whose id ends the store product id (hringnring_yearly is the "yearly" plan). A date already past is left out.
 */
export function statusLines(input: {
  tierLabel: string;
  server: ServerInfo | null;
  renewal: RenewalInfo | null;
  plans: readonly PlanConfig[];
  strings: SubscriptionStrings;
  now: Date;
  format?: (d: Date) => string;
  /** Where the tier comes from (`useSubscription().source`), so a server row that doesn't give it is not read. */
  source?: WatchState['source'];
}): StatusLines {
  const { tierLabel, server, renewal, plans, strings: s, now, format = dateTime } = input;
  const t = subscriptionTerms({ server, renewal, source: input.source, now });
  const product = renewal?.productId?.toLowerCase() ?? '';
  const plan = product ? plans.find((p) => isPlan(product, p.id))?.label ?? '' : '';
  return {
    title: s.youHave(tierLabel),
    plan: plan ? s.planName(plan) : '',
    when: t.until ? `${t.ending ? s.ends : s.renews} ${format(new Date(t.until))}` : '',
    ending: t.ending,
    note: t.billingIssue ? s.graceNote : t.ending ? s.endsNote : '',
  };
}

/** "Dec 12, 2026" in the phone's language: always with the year, so a date is never ambiguous. */
export const shortDay = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
  } catch {
    return iso.slice(0, 10);
  }
};
