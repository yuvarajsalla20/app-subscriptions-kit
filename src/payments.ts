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
}

export interface WatchState {
  tier: string;
  source: 'free' | 'store' | 'account' | 'tester';
  server: ServerInfo | null;
  /** From the store while it gives the tier (app-payments-kit 2.2.0+). Lets an app with no server show Renews / Ends. */
  renewal?: RenewalInfo | null;
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
  openManage?(): Promise<void>;
  watch(userId: string | null, cb: (s: WatchState) => void): () => void;
  testerAvailable?: boolean;
  getTesterTier?(): Promise<string | null>;
  setTesterTier?(tier: string | null): Promise<void>;
}
