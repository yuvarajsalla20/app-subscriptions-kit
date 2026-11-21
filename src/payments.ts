// The parts of a payments kit this kit uses. app-payments-kit fits as is; any object with these does too,
// so this kit never imports a payment vendor.

export interface StorePlan {
  id: string;
  tier: string;
  priceString: string;
  price: number;
  currency: string;
  period: { unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'; count: number } | null;
  trialDays: number | null;
  /** The free trial as the store sets it, such as MONTH × 1 (app-payments-kit 2.7.0+). Shown as "1-month free trial", not "30-day". */
  trial?: { unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'; count: number } | null;
  native?: unknown;
}

export type PurchaseResult = { ok: true; tier: string } | { ok: false; cancelled: boolean; pending?: boolean; message: string };

export interface ServerInfo {
  tier: string;
  activeUntil: string | null;
  status: string | null;
  willRenew: boolean | null;
}

/** The store's view of the paid tier: when it ends or renews (ISO, null for lifetime) and whether it renews. */
export interface RenewalInfo {
  until: string | null;
  willRenew: boolean;
  /** The store product that gives the tier, such as 'hringnring_monthly'. */
  productId?: string | null;
  /** True while the subscription is in its free trial (app-payments-kit 2.6.0+). Apps use it for trial-only limits. */
  trial?: boolean;
  /** The store couldn't take the renewal payment (app-payments-kit 2.7.0+): the screens ask the person to update it. */
  billingIssue?: boolean;
}

export interface WatchState {
  tier: string;
  source: 'free' | 'store' | 'account' | 'tester';
  server: ServerInfo | null;
  /** From the store while it gives the tier (app-payments-kit 2.2.0+). Lets an app with no server show Renews / Ends. */
  renewal?: RenewalInfo | null;
  /** The store couldn't be reached and this is the account's last known tier (app-payments-kit 2.7.0+). */
  remembered?: boolean;
}

const sameServer = (a: ServerInfo | null, b: ServerInfo | null) =>
  a === b || (!!a && !!b && a.tier === b.tier && a.activeUntil === b.activeUntil && a.status === b.status && a.willRenew === b.willRenew);
const sameRenewal = (a: RenewalInfo | null | undefined, b: RenewalInfo | null | undefined) =>
  (a ?? null) === (b ?? null) || (!!a && !!b && a.until === b.until && a.willRenew === b.willRenew && (a.productId ?? null) === (b.productId ?? null) && !!a.trial === !!b.trial && !!a.billingIssue === !!b.billingIssue);

/** True when two answers from the store say the same thing (the store repeats itself on every return to the app). */
export const sameWatchState = (a: WatchState, b: WatchState): boolean =>
  a.tier === b.tier && a.source === b.source && sameServer(a.server, b.server) && sameRenewal(a.renewal, b.renewal) && !!a.remembered === !!b.remembered;

/** A discount for people who already subscribe (app-payments-kit 2.3.0+), such as $1.99/month for 3 months. */
export interface StoreOffer {
  id: string;
  plan: StorePlan;
  priceString: string;
  price: number;
  period: { unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'; count: number };
  cycles: number;
  native?: unknown;
}

export interface PaymentsLike {
  /** False where purchases can't happen (no key, Expo Go without a store). */
  ready: boolean;
  loadPlans(): Promise<StorePlan[]>;
  buy(plan: StorePlan): Promise<PurchaseResult>;
  restore(): Promise<PurchaseResult>;
  redeemCode?(code?: string): Promise<void>;
  /** False where there is no code box (the website). Left out means codes are offered. */
  canRedeemCode?: boolean;
  /** `onClosed` (app-payments-kit 2.5.0+): called the moment the store's own manage screen closes, before the checks after it. */
  openManage?(onClosed?: () => void): Promise<void>;
  /** Asks the store again now, then a few more times (app-payments-kit `refresh`). Optional: left out, nothing is asked again. */
  refresh?(): Promise<void>;
  /** A subscriber discount by its store id; null when the store has none. */
  loadOffer?(offerId: string): Promise<StoreOffer | null>;
  buyOffer?(offer: StoreOffer): Promise<PurchaseResult>;
  /** `userId` is never undefined here: SubscriptionProvider waits instead of watching while sign-in is still loading. */
  watch(userId: string | null, cb: (s: WatchState) => void): () => void;
  testerAvailable?: boolean;
  getTesterTier?(): Promise<string | null>;
  setTesterTier?(tier: string | null): Promise<void>;
}
