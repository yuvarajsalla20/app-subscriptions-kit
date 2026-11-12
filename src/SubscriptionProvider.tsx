import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { LimitValue, SubscriptionConfig } from './define';
import type { PaymentsLike, PurchaseResult, RenewalInfo, ServerInfo, StoreOffer, StorePlan, WatchState } from './payments';
import { isPlan } from './pricing';
import { allowed, atLeast, canUse, limitFor, rank, tierFor } from './rules';

/** A plan change the store applies at the next renewal (a longer plan of the same level on the App Store). */
export interface PendingSwitch {
  /** The plan that comes next (a `config.plans` id). */
  planId: string;
  /** When it starts: the current plan's renewal date, if known. */
  startsAt: string | null;
}

/** Where a booked switch is kept between launches. AsyncStorage fits as it is. */
export interface SubscriptionStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface SubscriptionState {
  config: SubscriptionConfig;
  /** The account's tier now: 'free', 'premium', 'pro' … */
  tier: string;
  tierLabel: string;
  /** True for any paid tier. */
  paid: boolean;
  source: WatchState['source'];
  server: ServerInfo | null;
  /** The store's end or renewal date for the paid tier, when the tier comes from the store. */
  renewal: RenewalInfo | null;
  /** True until the first answer arrives. */
  loading: boolean;
  /** False where purchases can't happen (no key, Expo Go without a store). */
  ready: boolean;
  isAtLeast(tier: string): boolean;
  canUse(feature: string): boolean;
  limit(name: string): LimitValue;
  allowed(name: string, value: number): boolean;
  /** The lowest tier that unlocks a feature. */
  tierFor(feature: string): string;
  loadPlans(): Promise<StorePlan[]>;
  /** Asks the grown-ups check first in a kids' app. */
  buy(plan: StorePlan): Promise<PurchaseResult>;
  restore(): Promise<PurchaseResult>;
  redeemCode(code?: string): Promise<void>;
  /** Whether to offer "Have a code?". False on the website, where store codes can't be used. */
  canRedeemCode: boolean;
  openManage(): Promise<void>;
  /** A subscriber discount by its store id; null when there is none (or the payments object can't sell one). */
  loadOffer(offerId: string): Promise<StoreOffer | null>;
  buyOffer(offer: StoreOffer): Promise<PurchaseResult>;
  /**
   * Moves a subscriber to another plan of the same tier. When the store starts it at the next renewal (Apple does for a
   * longer plan of the same level), the switch is remembered as `pendingSwitch` until the store shows the new plan.
   */
  switchPlan(plan: StorePlan): Promise<PurchaseResult>;
  /** A switch booked on this phone that the store hasn't applied yet; null otherwise. */
  pendingSwitch: PendingSwitch | null;
  /** True from a successful purchase on this phone until dismissWelcome(): the Premium page shows its welcome card. */
  justSubscribed: boolean;
  dismissWelcome(): void;
  /** Runs the grown-ups check in a kids' app; true right away otherwise. */
  grownUp(): Promise<boolean>;
  tester: { available: boolean; tier: string | null; set(tier: string | null): Promise<void> };
}

const Ctx = createContext<SubscriptionState | null>(null);
const CANCELLED: PurchaseResult = { ok: false, cancelled: true, message: '' };

export interface SubscriptionProviderProps {
  config: SubscriptionConfig;
  payments: PaymentsLike;
  /** The signed-in account, or null. Purchases are booked to it. */
  userId: string | null;
  /** The app's own grown-ups check (kids' apps). Resolve true to go on. */
  grownUpCheck?: () => Promise<boolean>;
  /** Keeps a booked plan switch between launches (AsyncStorage). Without it the switch shows until the app closes. */
  storage?: SubscriptionStorage;
  children: ReactNode;
}

export function SubscriptionProvider({ config, payments, userId, grownUpCheck, storage, children }: SubscriptionProviderProps) {
  const [state, setState] = useState<WatchState>({ tier: 'free', source: 'free', server: null });
  const [loading, setLoading] = useState(true);
  const [testerTier, setTesterTierState] = useState<string | null>(null);
  const [justSubscribed, setJustSubscribed] = useState(false);
  const [pendingSwitch, setPending] = useState<PendingSwitch | null>(null);
  const pendingKey = `app-subscriptions-kit:pending-switch:${userId ?? 'signed-out'}`;
  const keep = useCallback((p: PendingSwitch | null) => {
    setPending(p);
    void (p ? storage?.setItem(pendingKey, JSON.stringify(p)) : storage?.removeItem(pendingKey))?.catch(() => undefined);
  }, [storage, pendingKey]);
  useEffect(() => {
    let live = true;
    setPending(null);
    void storage?.getItem(pendingKey)
      .then((raw) => { if (live && raw) setPending(JSON.parse(raw) as PendingSwitch); })
      .catch(() => undefined);
    return () => { live = false; };
  }, [storage, pendingKey]);
  // The booked switch goes once the store shows the new plan or says the subscription stops renewing, or well after its
  // date. Only the store's own answer counts: a first "free" before the store has answered must not wipe it. While the
  // account isn't paid nothing shows it anyway.
  useEffect(() => {
    if (!pendingSwitch || loading) return;
    const r = state.renewal;
    const late = pendingSwitch.startsAt ? Date.now() > Date.parse(pendingSwitch.startsAt) + 3 * 86_400_000 : false;
    const storeSays = state.source === 'store' && !!r && (r.willRenew === false || isPlan(r.productId, pendingSwitch.planId));
    if (storeSays || late) keep(null);
  }, [pendingSwitch, loading, state, keep]);
  const tierNow = useRef('free');
  tierNow.current = state.tier;

  useEffect(() => {
    setLoading(true);
    // Another person signed in: the welcome was for someone else.
    setJustSubscribed(false);
    const stop = payments.watch(userId, (s) => {
      setState(s);
      setLoading(false);
    });
    return stop;
  }, [payments, userId]);
  useEffect(() => {
    void payments.getTesterTier?.().then(setTesterTierState).catch(() => undefined);
  }, [payments]);

  const grownUp = useCallback(async () => (config.kids && grownUpCheck ? grownUpCheck() : true), [config.kids, grownUpCheck]);
  // After a purchase the store's own listener updates the tier too; this just avoids a moment of "locked".
  const settle = useCallback((r: PurchaseResult) => {
    if (r.ok && rank(config, r.tier) > 0) setState((s) => (rank(config, r.tier) > rank(config, s.tier) ? { ...s, tier: r.tier, source: 'store' } : s));
    return r;
  }, [config]);
  const bought = useCallback((r: PurchaseResult) => {
    // Only a first purchase: a subscriber switching plans gets no welcome.
    if (r.ok && rank(config, r.tier) > 0 && rank(config, tierNow.current) === 0) setJustSubscribed(true);
    return settle(r);
  }, [config, settle]);

  const value = useMemo<SubscriptionState>(() => {
    const tier = config.tiers.includes(state.tier) ? state.tier : 'free';
    return {
      config,
      tier,
      tierLabel: config.tierLabels[tier] ?? tier,
      paid: tier !== 'free',
      source: state.source,
      server: state.server,
      renewal: state.renewal ?? null,
      loading,
      ready: payments.ready,
      isAtLeast: (t) => atLeast(config, tier, t),
      canUse: (f) => canUse(config, tier, f),
      limit: (n) => limitFor(config, tier, n),
      allowed: (n, v) => allowed(config, tier, n, v),
      tierFor: (f) => tierFor(config, f),
      loadPlans: () => payments.loadPlans(),
      buy: async (plan) => ((await grownUp()) ? bought(await payments.buy(plan)) : CANCELLED),
      restore: async () => ((await grownUp()) ? settle(await payments.restore()) : CANCELLED),
      redeemCode: async (code) => { if (await grownUp()) await payments.redeemCode?.(code); },
      // Before purchases open, the box stays so the screen can say "not open yet"; once open, only where the provider takes codes.
      canRedeemCode: !payments.ready || payments.canRedeemCode !== false,
      openManage: async () => { if (await grownUp()) await payments.openManage?.(); },
      loadOffer: async (id) => (payments.ready && payments.loadOffer && id ? payments.loadOffer(id).catch(() => null) : null),
      buyOffer: async (offer) => ((await grownUp()) && payments.buyOffer ? settle(await payments.buyOffer(offer)) : CANCELLED),
      switchPlan: async (plan) => {
        const before = state.renewal ?? null;
        const r = (await grownUp()) ? bought(await payments.buy(plan)) : CANCELLED;
        if (r.ok && before?.productId && !isPlan(before.productId, plan.id)) keep({ planId: plan.id, startsAt: before.until ?? null });
        return r;
      },
      pendingSwitch,
      justSubscribed,
      dismissWelcome: () => setJustSubscribed(false),
      grownUp,
      tester: {
        available: !!payments.testerAvailable,
        tier: testerTier,
        set: async (t) => { await payments.setTesterTier?.(t); setTesterTierState(t && t !== 'free' ? t : null); },
      },
    };
  }, [config, state, loading, payments, grownUp, settle, bought, justSubscribed, testerTier, pendingSwitch, keep]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Everything about the account's subscription. Must be inside <SubscriptionProvider>. */
export function useSubscription(): SubscriptionState {
  const v = useContext(Ctx);
  if (!v) throw new Error('app-subscriptions-kit: wrap the app in <SubscriptionProvider>.');
  return v;
}

/** The current tier name. */
export const useTier = (): string => useSubscription().tier;

/** For apps with one paid tier: { premium, loading }. */
export const usePremium = () => {
  const s = useSubscription();
  return { premium: s.paid, loading: s.loading, source: s.source };
};
