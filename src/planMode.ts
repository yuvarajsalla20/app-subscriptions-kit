import { useSyncExternalStore } from 'react';

/**
 * 9.0.0: whether a plan is on sale in this app. `'free'` (the default) sells nothing: every feature is open to everyone, and
 * no Premium tag, padlock, crown or paywall shows. `'subscription'` shows today's Subscription page, Plans and locks.
 *
 * The owner chooses it per app with `planMode` in the Firestore document `config/app`; `SubscriptionProvider` reads it and
 * sets it here. app-account-kit keeps an identical store under the same global key, so every kit (its Premium tag, and
 * app-settings-kit's Plan row) reads one value without depending on this kit.
 */
export type PlanMode = 'free' | 'subscription';

/** What every published app runs until the owner sets `planMode: "subscription"`. */
export const DEFAULT_PLAN_MODE: PlanMode = 'free';

interface PlanModeStore {
  mode: PlanMode;
  listeners: Set<() => void>;
}

const KEY = Symbol.for('app-kits/plan-mode');

const store = (): PlanModeStore => {
  const g = globalThis as unknown as Record<symbol, PlanModeStore | undefined>;
  return (g[KEY] ??= { mode: DEFAULT_PLAN_MODE, listeners: new Set() });
};

/** The plan mode now. */
export const getPlanMode = (): PlanMode => store().mode;

/** Sets the plan mode for every kit. Anything other than `'subscription'` is `'free'`. */
export function setPlanMode(mode: PlanMode): void {
  const s = store();
  const next: PlanMode = mode === 'subscription' ? 'subscription' : 'free';
  if (s.mode === next) return;
  s.mode = next;
  s.listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  const s = store();
  s.listeners.add(l);
  return () => {
    s.listeners.delete(l);
  };
};

/** The plan mode, kept in step. */
export function usePlanMode(): PlanMode {
  return useSyncExternalStore(subscribe, getPlanMode, getPlanMode);
}

/**
 * Works out the plan mode from the `config/app` document for the signed-in account. Only `planMode: "subscription"` turns
 * selling on. While `subscriptionTesters` lists account ids, only those accounts see it, so a test never reaches customers;
 * an empty or missing list means every account. Anything else, or no document, is `'free'`.
 */
export function planModeFrom(data: unknown, userId: string | null | undefined): PlanMode {
  const d = data && typeof data === 'object' ? (data as { planMode?: unknown; subscriptionTesters?: unknown }) : {};
  if (d.planMode !== 'subscription') return 'free';
  const testers = Array.isArray(d.subscriptionTesters) ? d.subscriptionTesters.filter((t): t is string => typeof t === 'string' && t.length > 0) : [];
  if (testers.length === 0) return 'subscription';
  return userId && testers.includes(userId) ? 'subscription' : 'free';
}

/** Where `SubscriptionProvider` gets the plan mode: a fixed mode, or a lookup per account (e.g., `firestorePlanMode(db)`). */
export type PlanModeSource = PlanMode | ((userId: string | null) => Promise<PlanMode>);
