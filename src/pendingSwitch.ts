import { useCallback, useEffect, useState } from 'react';
import type { WatchState } from './payments';
import { isPlan } from './pricing';

/** Where a booked switch and the last known plan mode are kept between launches. AsyncStorage fits as it is. */
export interface SubscriptionStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** A plan change the store applies at the next renewal (a longer plan of the same level on the App Store). */
export interface PendingSwitch {
  /** The plan that comes next (a `config.plans` id). */
  planId: string;
  /** When it starts: the current plan's renewal date, if known. */
  startsAt: string | null;
  /** When it was booked. Used to let it go if no start date was known. */
  bookedAt?: string;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** A saved switch, or null when what was saved isn't one (an older build, a broken write). */
const readPending = (raw: string | null): PendingSwitch | null => {
  try {
    const v = raw ? (JSON.parse(raw) as Partial<PendingSwitch>) : null;
    if (!v || typeof v.planId !== 'string' || !v.planId) return null;
    const startsAt = typeof v.startsAt === 'string' && !Number.isNaN(Date.parse(v.startsAt)) ? v.startsAt : null;
    const bookedAt = typeof v.bookedAt === 'string' && !Number.isNaN(Date.parse(v.bookedAt)) ? v.bookedAt : undefined;
    return { planId: v.planId, startsAt, ...(bookedAt ? { bookedAt } : {}) };
  } catch {
    return null;
  }
};

/**
 * The plan switch booked for this account: kept between launches in `storage`, and let go once the store shows it applied
 * or undone. Returns the booked switch and `keep`, which books one (or clears it with null).
 */
export function useBookedSwitch(storage: SubscriptionStorage | undefined, userId: string | null | undefined, loading: boolean, state: WatchState) {
  const pendingKey = `app-subscriptions-kit:pending-switch:${userId ?? 'signed-out'}`;
  // Kept with the account it belongs to, so a sign-in change never shows (or clears) the last person's switch.
  const [saved, setSaved] = useState<{ key: string; p: PendingSwitch | null }>({ key: pendingKey, p: null });
  const booked = saved.key === pendingKey ? saved.p : null;
  const keep = useCallback((p: PendingSwitch | null) => {
    setSaved({ key: pendingKey, p });
    void (p ? storage?.setItem(pendingKey, JSON.stringify(p)) : storage?.removeItem(pendingKey))?.catch(() => undefined);
  }, [storage, pendingKey]);
  useEffect(() => {
    let live = true;
    setSaved({ key: pendingKey, p: null });
    void storage?.getItem(pendingKey)
      .then((raw) => { if (live) setSaved({ key: pendingKey, p: readPending(raw) }); })
      .catch(() => undefined);
    return () => { live = false; };
  }, [storage, pendingKey]);
  // The booked switch goes once the store shows the new plan, says the subscription stops renewing, or has renewed past
  // the start date on the old plan (the switch was undone in the store). Failing all that, a few days after its date (or
  // 40 days after booking when no date was known). Only the store's own answer counts: a first "free" before the store
  // has answered must not wipe it.
  useEffect(() => {
    if (!booked || loading) return;
    const r = state.renewal;
    const now = Date.now();
    const starts = booked.startsAt ? Date.parse(booked.startsAt) : NaN;
    const late = !Number.isNaN(starts) ? now > starts + 3 * DAY : booked.bookedAt ? now > Date.parse(booked.bookedAt) + 40 * DAY : false;
    const renewedPast = !Number.isNaN(starts) && !!r?.until && Date.parse(r.until) > starts + HOUR;
    const storeSays = state.source === 'store' && !!r && (r.willRenew === false || isPlan(r.productId, booked.planId) || renewedPast);
    if (storeSays || late) keep(null);
  }, [booked, loading, state, keep]);
  return { booked, keep };
}
