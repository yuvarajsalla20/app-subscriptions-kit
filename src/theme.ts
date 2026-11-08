import type { ComponentProps, ComponentType } from 'react';
import type { Text as RNText } from 'react-native';

/** Colors the screens use. Pass only what differs. The default is the gold Premium look. */
export interface SubscriptionTheme {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  /** Links and the selected plan. */
  accent: string;
  /** Text on the accent color. */
  onAccent: string;
  /** The Premium pill, lock badges and highlighted rows. */
  premium: string;
  onPremium: string;
  premiumSoft: string;
  /** Messages: success and problem backgrounds. */
  good: string;
  warn: string;
  radius: number;
}

export const DEFAULT_THEME: SubscriptionTheme = {
  bg: '#F5F7FB',
  surface: '#FFFFFF',
  border: '#E1E6F0',
  text: '#14213D',
  muted: '#5B6687',
  accent: '#14213D',
  onAccent: '#FFFFFF',
  premium: '#FFC23D',
  onPremium: '#3A2700',
  premiumSoft: '#FFF6DD',
  good: '#E9F7EF',
  warn: '#FFF1E6',
  radius: 14,
};

/** The app's own Text component, so the screens use its fonts. Plain React Native Text is the default. */
export interface SubscriptionComponents {
  Text: ComponentType<ComponentProps<typeof RNText>>;
}

/** Every word on the screens, so an app can reword or translate it. */
export interface SubscriptionStrings {
  title: string;
  choosePlan: string;
  startTrial: (days: number) => string;
  upgrade: (tierLabel: string) => string;
  switchTo: (tierLabel: string) => string;
  /** Button when a subscriber picks another length of the same tier. */
  switchPlan: (planLabel: string) => string;
  /** Badge on the plan the account is on now. */
  currentPlan: string;
  youHave: (tierLabel: string) => string;
  thenPrice: (price: string, every: string, trialDays: number | null) => string;
  every: (unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR', count: number) => string;
  perMonth: (price: string) => string;
  save: (pct: number) => string;
  restore: string;
  restoring: string;
  haveCode: string;
  enterCode: string;
  apply: string;
  manage: string;
  terms: string;
  privacy: string;
  legal: (trial: boolean) => string;
  loadingPrices: string;
  pricesFailed: string;
  tryAgain: string;
  notOpenYet: string;
  welcome: (tierLabel: string) => string;
  restored: (tierLabel: string) => string;
  nothingToRestore: string;
  boughtNotActive: string;
  locked: (feature: string, tierLabel: string) => string;
  lockedBody: string;
  unlock: string;
  askGrownUp: string;
  close: string;
  subscription: string;
  plan: string;
  renews: string;
  ends: string;
  pretend: string;
  pretendNote: string;
  developerOnly: string;
  free: string;
  graceNote: string;
}

const UNIT = { DAY: 'day', WEEK: 'week', MONTH: 'month', YEAR: 'year' } as const;

export const DEFAULT_STRINGS: SubscriptionStrings = {
  title: 'Upgrade',
  choosePlan: 'Choose a plan',
  startTrial: (d) => `Start ${d}-day free trial`,
  upgrade: (t) => `Upgrade to ${t}`,
  switchTo: (t) => `Switch to ${t}`,
  switchPlan: (p) => `Switch to ${p}`,
  currentPlan: 'Current plan',
  youHave: (t) => `You have ${t}`,
  thenPrice: (p, every, trial) => `${trial ? `Free for ${trial} days, then ` : ''}${p} ${every}. Cancel any time.`,
  every: (u, n) => (n === 1 ? `a ${UNIT[u]}` : `every ${n} ${UNIT[u]}s`),
  perMonth: (p) => `${p} a month`,
  save: (n) => `save ${n}%`,
  restore: 'Restore purchases',
  restoring: 'Checking…',
  haveCode: 'Have a code?',
  enterCode: 'Enter code',
  apply: 'Apply',
  manage: 'Manage or cancel subscription',
  terms: 'Terms of use',
  privacy: 'Privacy policy',
  legal: (trial) =>
    `Payment is charged to your store account. The subscription renews automatically unless turned off at least 24 hours before the end of the period, in your store account settings. ${trial ? 'The free trial becomes a paid subscription at its end unless cancelled. ' : ''}`,
  loadingPrices: 'Getting prices from the store…',
  pricesFailed: 'Could not reach the store. Check the connection.',
  tryAgain: 'Try again',
  notOpenYet: 'Purchases open when the app is in the store.',
  welcome: (t) => `Welcome to ${t}! Everything is unlocked.`,
  restored: (t) => `${t} is back on this device.`,
  nothingToRestore: 'No purchase was found for this store account.',
  boughtNotActive: 'The purchase went through, but it is not active yet. Tap Restore purchases in a minute.',
  locked: (f, t) => `${f} is in ${t}`,
  lockedBody: 'Upgrade to unlock it.',
  unlock: 'See plans',
  askGrownUp: 'Ask a grown-up',
  close: 'Close',
  subscription: 'Subscription',
  plan: 'Plan',
  renews: 'Renews',
  ends: 'Ends',
  pretend: 'Pretend to have',
  pretendNote: 'Development builds only. Changes this phone, never the server.',
  developerOnly: 'Developer only',
  free: 'Free',
  graceNote: 'There is a problem with your payment. Update it in your store account to keep your plan.',
};
