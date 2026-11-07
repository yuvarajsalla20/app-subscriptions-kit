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

export interface WatchState {
  tier: string;
  source: 'free' | 'store' | 'account' | 'tester';
  server: ServerInfo | null;
}

export interface PaymentsLike {
  /** False where purchases can't happen (web, Expo Go without a store). */
  ready: boolean;
  loadPlans(): Promise<StorePlan[]>;
  buy(plan: StorePlan): Promise<PurchaseResult>;
  restore(): Promise<PurchaseResult>;
  redeemCode?(code?: string): Promise<void>;
  openManage?(): Promise<void>;
  watch(userId: string | null, cb: (s: WatchState) => void): () => void;
  testerAvailable?: boolean;
  getTesterTier?(): Promise<string | null>;
  setTesterTier?(tier: string | null): Promise<void>;
}
