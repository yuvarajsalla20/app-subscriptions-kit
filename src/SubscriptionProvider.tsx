import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LimitValue, SubscriptionConfig } from './define';
import type { PaymentsLike, PurchaseResult, RenewalInfo, ServerInfo, StorePlan, WatchState } from './payments';
import { allowed, atLeast, canUse, limitFor, rank, tierFor } from './rules';

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
  children: ReactNode;
}

export function SubscriptionProvider({ config, payments, userId, grownUpCheck, children }: SubscriptionProviderProps) {
  const [state, setState] = useState<WatchState>({ tier: 'free', source: 'free', server: null });
  const [loading, setLoading] = useState(true);
  const [testerTier, setTesterTierState] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
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
      buy: async (plan) => ((await grownUp()) ? settle(await payments.buy(plan)) : CANCELLED),
      restore: async () => ((await grownUp()) ? settle(await payments.restore()) : CANCELLED),
      redeemCode: async (code) => { if (await grownUp()) await payments.redeemCode?.(code); },
      // Before purchases open, the box stays so the screen can say "not open yet"; once open, only where the provider takes codes.
      canRedeemCode: !payments.ready || payments.canRedeemCode !== false,
      openManage: async () => { if (await grownUp()) await payments.openManage?.(); },
      grownUp,
      tester: {
        available: !!payments.testerAvailable,
        tier: testerTier,
        set: async (t) => { await payments.setTesterTier?.(t); setTesterTierState(t && t !== 'free' ? t : null); },
      },
    };
  }, [config, state, loading, payments, grownUp, settle, testerTier]);

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
