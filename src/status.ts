import type { PlanConfig } from './define';
import type { RenewalInfo, ServerInfo } from './payments';
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

/** "Thu, Nov 12, 11:35 PM" in the phone's language. */
const dateTime = (d: Date): string => {
  try {
    return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }
};

/**
 * What the card says. A server row wins over the store (the same rule as SubscriptionRow). The plan is the one whose
 * id ends the store product id (hringnring_yearly is the "yearly" plan). A date already past is left out.
 */
export function statusLines(input: {
  tierLabel: string;
  server: ServerInfo | null;
  renewal: RenewalInfo | null;
  plans: readonly PlanConfig[];
  strings: SubscriptionStrings;
  now: Date;
  format?: (d: Date) => string;
}): StatusLines {
  const { tierLabel, server, renewal, plans, strings: s, now, format = dateTime } = input;
  const iso = server?.activeUntil ?? renewal?.until ?? null;
  const until = iso ? new Date(iso) : null;
  const shown = until && !Number.isNaN(until.getTime()) && until.getTime() > now.getTime() ? until : null;
  const ending = server ? server.willRenew === false : renewal?.willRenew === false;
  const product = renewal?.productId?.toLowerCase() ?? '';
  const plan = product ? plans.find((p) => product.endsWith(p.id.toLowerCase()))?.label ?? '' : '';
  return {
    title: s.youHave(tierLabel),
    plan: plan ? s.planName(plan) : '',
    when: shown ? `${ending ? s.ends : s.renews} ${format(shown)}` : '',
    ending,
    note: server?.status === 'grace' ? s.graceNote : ending ? s.endsNote : '',
  };
}
