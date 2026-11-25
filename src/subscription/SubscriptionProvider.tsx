import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { LimitValue, SubscriptionConfig } from './define';
import type { PaymentsLike, PurchaseResult, RenewalInfo, ServerInfo, StoreOffer, StorePlan, WatchState } from './payments';
import { sameWatchState } from './payments';
import { isPlan } from './pricing';
import { subscriptionTerms } from './status';
import { allowed, atLeast, canUse, limitFor, rank, tierFor } from './rules';
import { DEFAULT_PLAN_MODE, setPlanMode, type PlanMode, type PlanModeSource } from './planMode';
import { useBookedSwitch, type PendingSwitch, type SubscriptionStorage } from './pendingSwitch';

export type { PendingSwitch, SubscriptionStorage } from './pendingSwitch';



export interface SubscriptionState {
  config: SubscriptionConfig;
  /**
   * 9.0.0: `'free'` (the default) while nothing is on sale: the store is not asked, and no crown, Premium pill or paywall
   * shows. 10.0.0: the account counts as free (`canUse`, `isAtLeast`, `limit` and `allowed` answer as the free tier) and every
   * Premium feature is hidden, so nothing is offered. `'subscription'` is the setup with plans on sale.
   */
  planMode: PlanMode;
  /** 9.0.0: true while a plan is on sale (`planMode` is `'subscription'`). 10.0.0: while false, hide every Premium feature. */
  selling: boolean;
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
  /** The store's manage screen. `onClosed` runs as soon as it closes (with app-payments-kit 2.5.0+), before the store is asked again. */
  openManage(onClosed?: () => void): Promise<void>;
  /** Asks the store again for this account's subscription (the Premium page does when Apple hadn't confirmed a change yet). */
  refresh(): Promise<void>;
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
  /**
   * The signed-in account, or null once signed out. Purchases are booked to it. Pass `undefined` while the app is still
   * restoring the session: nothing is asked of the store and `loading` stays true until the account is known, so the store is
   * never set up on an anonymous id that then needs a network call to move to the real account.
   */
  userId: string | null | undefined;
  /** The app's own grown-ups check (kids' apps). Resolve true to go on. */
  grownUpCheck?: () => Promise<boolean>;
  /** Keeps a booked plan switch, and (11.1.0) the last plan mode of each account, between launches (AsyncStorage). */
  storage?: SubscriptionStorage;
  /**
   * 9.0.0: whether a plan is on sale. Leave out, or pass `'free'`, and nothing is sold: no crown, tag or paywall shows, and
   * (10.0.0) every Premium feature is hidden. Pass `firestorePlanMode(db)` from `app-subscriptions-kit/firestore` so the owner chooses it with
   * `planMode` (and `subscriptionTesters`) in the Firestore document `config/app`, with no new build. 11.1.0: until the
   * answer arrives `loading` stays true; when it cannot be read, the last answer kept in `storage` is used, else free.
   */
  planMode?: PlanModeSource;
  children: ReactNode;
}

/** Anything other than `'subscription'` is `'free'`. */
const fixedMode = (m: string): PlanMode => (m === 'subscription' ? 'subscription' : 'free');

export function SubscriptionProvider({ config, payments, userId, grownUpCheck, storage, planMode: modeSource = DEFAULT_PLAN_MODE, children }: SubscriptionProviderProps) {
  // 9.0.0: free until the owner's switch says otherwise, for this account. 11.1.0: while a lookup is still answering,
  // `loading` stays true, so a subscriber never sees the free app for a moment at launch; when the lookup fails (offline),
  // the last answer for this account kept in `storage` is used, and with none the default.
  const [mode, setMode] = useState<PlanMode>(typeof modeSource === 'string' ? fixedMode(modeSource) : DEFAULT_PLAN_MODE);
  const [modeFor, setModeFor] = useState<string | null | undefined>(typeof modeSource === 'string' ? userId : undefined);
  const modeKnown = typeof modeSource === 'string' || (userId !== undefined && modeFor === userId);
  useEffect(() => {
    let live = true;
    if (typeof modeSource === 'string') {
      setMode(fixedMode(modeSource));
      setModeFor(userId);
      return;
    }
    setMode(DEFAULT_PLAN_MODE);
    setModeFor(undefined);
    if (userId === undefined) return; // still signing in: stay free until the account is known
    const savedKey = `app-subscriptions-kit:plan-mode:${userId ?? 'signed-out'}`;
    modeSource(userId)
      .then((m) => {
        const next = fixedMode(m);
        void storage?.setItem(savedKey, next).catch(() => undefined);
        return next;
      })
      .catch(async () => fixedMode((await storage?.getItem(savedKey).catch(() => null)) ?? DEFAULT_PLAN_MODE))
      .then((m) => {
        if (!live) return;
        setMode(m);
        setModeFor(userId);
      });
    return () => {
      live = false;
    };
  }, [modeSource, userId, storage]);
  // Shared with app-account-kit and app-settings-kit (their Premium tag and Plan row).
  useEffect(() => setPlanMode(mode), [mode]);
  const selling = mode === 'subscription';
  const [state, setState] = useState<WatchState>({ tier: 'free', source: 'free', server: null });
  const [loading, setLoading] = useState(true);
  const [testerTier, setTesterTierState] = useState<string | null>(null);
  const [justSubscribed, setJustSubscribed] = useState(false);
  const { booked, keep } = useBookedSwitch(storage, userId, loading, state);
  // Shown only while it can still happen: a paid account of the plan's tier that is still renewing.
  const tierOk = config.tiers.includes(state.tier) ? state.tier : 'free';
  const bookedPlan = booked ? config.plans.find((p) => p.id === booked.planId) : undefined;
  const stopping = subscriptionTerms({ server: state.server, renewal: state.renewal, source: state.source }).ending;
  const pendingSwitch = booked && bookedPlan && bookedPlan.tier === tierOk && tierOk !== 'free' && !stopping ? booked : null;
  const tierNow = useRef('free');
  tierNow.current = state.tier;

  useEffect(() => {
    setLoading(true);
    // Another person signed in: nothing of the last one's subscription may show (their tier, dates or welcome) until the new answer.
    setState({ tier: 'free', source: 'free', server: null });
    setJustSubscribed(false);
    if (userId === undefined || !modeKnown) return; // still signing in, or the plan mode is not known yet: wait
    // 9.0.0: with nothing on sale the store is never asked; the account counts as free.
    if (!selling) {
      setLoading(false);
      return;
    }
    const stop = payments.watch(userId, (s) => {
      // The same answer again (each return to the app asks twice or more) keeps the old object: no app-wide redraw.
      setState((prev) => (sameWatchState(prev, s) ? prev : s));
      setLoading(false);
    });
    return stop;
  }, [payments, userId, selling, modeKnown]);
  useEffect(() => {
    if (!selling) return;
    void payments.getTesterTier?.().then(setTesterTierState).catch(() => undefined);
  }, [payments, selling]);

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

  const buy = useCallback(async (plan: StorePlan) => ((await grownUp()) ? bought(await payments.buy(plan)) : CANCELLED), [grownUp, bought, payments]);

  const value = useMemo<SubscriptionState>(() => {
    const tier = config.tiers.includes(state.tier) ? state.tier : 'free';
    // 10.0.0: in free mode the store is not asked, so the account is on the free tier and every check answers as that tier.
    const open = tier;
    return {
      config,
      planMode: mode,
      selling,
      tier,
      tierLabel: config.tierLabels[tier] ?? tier,
      paid: tier !== 'free',
      source: state.source,
      server: state.server,
      renewal: state.renewal ?? null,
      loading,
      ready: payments.ready,
      isAtLeast: (t) => atLeast(config, open, t),
      canUse: (f) => canUse(config, open, f),
      limit: (n) => limitFor(config, open, n),
      allowed: (n, v) => allowed(config, open, n, v),
      tierFor: (f) => tierFor(config, f),
      loadPlans: () => payments.loadPlans(),
      buy,
      restore: async () => ((await grownUp()) ? settle(await payments.restore()) : CANCELLED),
      redeemCode: async (code) => { if (await grownUp()) await payments.redeemCode?.(code); },
      // Before purchases open, the box stays so the screen can say "not open yet"; once open, only where the provider takes codes.
      canRedeemCode: !payments.ready || payments.canRedeemCode !== false,
      openManage: async (onClosed) => { if (await grownUp()) await payments.openManage?.(onClosed); },
      refresh: async () => { if (payments.ready) await payments.refresh?.(); },
      loadOffer: async (id) => (payments.ready && payments.loadOffer && id ? payments.loadOffer(id).catch(() => null) : null),
      buyOffer: async (offer) => ((await grownUp()) && payments.buyOffer ? settle(await payments.buyOffer(offer)) : CANCELLED),
      switchPlan: async (plan) => {
        const before = state.renewal ?? null;
        const r = await buy(plan);
        if (r.ok && before?.productId && !isPlan(before.productId, plan.id)) keep({ planId: plan.id, startsAt: before.until ?? null, bookedAt: new Date().toISOString() });
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
  }, [config, state, loading, payments, grownUp, settle, bought, justSubscribed, testerTier, pendingSwitch, keep, buy, mode, selling]);

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

/**
 * For apps with one paid tier: { premium, loading, offered }. 10.0.0: while the plan mode is `'free'`, `premium` is false and
 * `offered` is false: the app hides its Premium features instead of showing them locked.
 */
export const usePremium = () => {
  const s = useSubscription();
  return { premium: s.paid, loading: s.loading, source: s.source, planMode: s.planMode, offered: s.selling };
};
