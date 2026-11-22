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
  /** The main button (defaults to the accent). */
  button?: string;
  onButton?: string;
  /** A CSS box-shadow for cards. Set it and cards drop their outline and float instead (a flat outline when empty). */
  shadow?: string;
  /** The Cancel Subscription button and Continue to Cancel. */
  danger?: string;
  onDanger?: string;
  /** The default Premium mark, a king and a queen crown: outline and fill of each. */
  king?: string;
  kingFill?: string;
  queen?: string;
  queenFill?: string;
  /** The words on the plan pill (Settings' Premium row). Default: the premium color. */
  premiumText?: string;
  /** The dark box shown while a subscription change is confirmed, and the words on it. */
  hud?: string;
  onHud?: string;
  /** The ring and dots on that box. Default: the premium color. */
  hudAccent?: string;
  /** The confetti colors when a change is confirmed. */
  confetti?: readonly string[];
  /** Good news on the Premium page (Restore found it, the Save tag): the words, the soft row behind them, and text on a solid tag. */
  success?: string;
  successSoft?: string;
  onTag?: string;
  /** Neutral news (Restore found nothing): the words, the soft row, and the round badge. */
  info?: string;
  infoSoft?: string;
  infoBadge?: string;
  /** A problem (Restore could not reach the store): the soft row and the round badge, with the danger color. */
  dangerSoft?: string;
  dangerBadge?: string;
  /** The floating crown's gold, light to deep (4.0.0). Default: the gold of the Premium tag. */
  crown?: readonly [string, string, string];
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
  danger: '#B42318',
  onDanger: '#FFFFFF',
  king: '#B45309',
  kingFill: '#FCD34D',
  queen: '#BE185D',
  queenFill: '#FBCFE8',
  hud: '#14213D',
  onHud: '#FFFFFF',
  hudAccent: '#FFC23D',
  confetti: ['#4FD1C0', '#FB923C', '#A78BFA', '#FBBF24', '#F472B6'],
  success: '#15803D',
  successSoft: '#F0FDF4',
  onTag: '#FFFFFF',
  info: '#0369A1',
  infoSoft: '#F0F9FF',
  infoBadge: '#E0F2FE',
  dangerSoft: '#FEF3F2',
  dangerBadge: '#FDE7E5',
};

/** Where the person's purchases live, for the Restore and Updating words. */
export type StorePlatform = 'ios' | 'android' | 'web';

/** The app's own Text component, so the screens use its fonts. Plain React Native Text is the default. */
export interface SubscriptionComponents {
  Text: ComponentType<ComponentProps<typeof RNText>>;
}

/** Every word on the screens, so an app can reword or translate it. */
export interface SubscriptionStrings {
  title: string;
  choosePlan: string;
  startTrial: (days: number) => string;
  /** The button for a trial of months or years (1.23.0): "Start 1-Month Free Trial". Day and week trials use `startTrial`. */
  startTrialPeriod: (unit: 'MONTH' | 'YEAR', count: number) => string;
  upgrade: (tierLabel: string) => string;
  switchTo: (tierLabel: string) => string;
  /** Button when a subscriber picks another length of the same tier. */
  switchPlan: (planLabel: string) => string;
  /** Badge on the plan the account is on now. */
  currentPlan: string;
  /** Shown above the main button when a subscriber taps a plan that can't be picked (for example Monthly while on Yearly). `current` is null when the store hasn't named the plan yet. */
  planNotOffered: (planLabel: string, current: string | null, tierLabel: string) => string;
  /** Badge over the account's own column in the Free vs paid table. */
  current: string;
  /** The compare table's first column heading. */
  feature: string;
  /** Not shown since 1.5.0 (the box is gone: Restore and Have a code? are one line). Kept so existing `strings` still type-check. */
  alreadySubscribed: string;
  /** Heading over the Free vs paid table. */
  compareTitle: string;
  youHave: (tierLabel: string) => string;
  thenPrice: (price: string, every: string, trialDays: number | null) => string;
  /** Under the button for a trial of months or years (1.23.0): "Free for 1 month, then $39.99 a year. Cancel any time." */
  thenPriceAfterPeriod: (price: string, every: string, unit: 'MONTH' | 'YEAR', count: number) => string;
  every: (unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR', count: number) => string;
  perMonth: (price: string) => string;
  /** Beside a plan's price, on the same line: "/year", "/month", "/3 months". */
  per: (unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR', count: number) => string;
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
  /** The plan line on the status card: "Monthly Plan". */
  planName: (planLabel: string) => string;
  /** Under the Ends date on the status card. */
  endsNote: string;
  /** Premium page: beside an unlocked feature with no switch. */
  included: string;
  /** What VoiceOver adds on an unlocked feature row that opens its own page (`PremiumFeature.onPress`). */
  opensPage: string;
  /** Premium page: under a locked feature with no line of its own. */
  lockedHint: string;
  /** Premium page: read out for a locked feature. */
  lockedLabel: string;
  /** Premium page: Manage, after a cancel. Not shown since 1.9.0 (Renew Subscription took its place). */
  autoRenewOn: string;
  /** Premium page (1.9.0): the top card for a free account. */
  getPremium: (tierLabel: string) => string;
  /** "From $3.99/month". */
  fromPrice: (price: string) => string;
  /** "Or $29.99/year. Cancel any time." */
  orPrice: (price: string) => string;
  /** Under Get Premium when prices can't be shown. */
  getPremiumNote: string;
  /** "$3.99/month or $29.99/year" under See Plans. */
  priceChoice: (a: string, b: string) => string;
  cancelSubscription: string;
  /** Under Cancel Subscription: "You keep Premium Monthly until Dec 12, 2026.". `tierLabel` includes the plan when known. */
  keepUntil: (tierLabel: string, date: string) => string;
  renewSubscription: string;
  /** Under Renew Subscription, short enough for one line: "Keep Premium Monthly Beyond Dec 12, 2026". `tierLabel` includes the plan when known. The date never breaks. */
  continuesAfter: (tierLabel: string, date: string) => string;
  changePlan: string;
  /** Under Change Plan: "Yearly · $29.99/year". */
  planLine: (planLabel: string, priceWithPer: string) => string;
  restoreSubscription: string;
  /** Under Restore Subscription on a free account. */
  restoreHint: string;
  /** Under Restore Purchases once paid: "Restore Premium purchased on another device." */
  restoreHintPaid: (tierLabel: string) => string;
  /** While the store is checked. `store` is "App Store" or "Google Play". */
  /** Under the top card from the moment the store's manage screen closes until the change shows (up to 20 seconds). */
  updatingSubscription: string;
  /** Under it in the box. `company` is "Apple" or "Google". */
  updatingBody: (company: string) => string;
  /** The store, the account it is tied to and its company, per platform: "App Store", "Apple ID", "Apple". */
  storeName: (platform: StorePlatform) => string;
  storeAccount: (platform: StorePlatform) => string;
  storeCompany: (platform: StorePlatform) => string;
  /** The box once a change shows: the title when the plan now renews, and otherwise. */
  allSet: string;
  subscriptionUpdated: string;
  /** Calm line on the Premium page when the store hasn't confirmed a change after "Updating…" (it stays until the change shows). */
  notConfirmedYet: (company: string) => string;
  /** Its line once the plan renews: "Premium Monthly renews on Dec 12, 2026". */
  renewsOn: (planName: string, date: string) => string;
  restoreChecking: (store: string) => string;
  /** After a restore that found what this account already has. `account` is "Apple ID" or "Google Account". */
  restoreAllSet: (tierLabel: string, account: string) => string;
  /** After a restore that brought the paid tier back. */
  restoreDone: (tierLabel: string) => string;
  /** After a restore that found nothing. */
  restoreNone: (account: string) => string;
  /** After a restore that failed; tapping again retries. */
  restoreFailed: (store: string) => string;
  /** Under the plan on the status card after a switch that starts at renewal. `date` is empty when unknown. */
  switchingTo: (planLabel: string, date: string) => string;
  /** Change Plan's line and the Plans button while a switch waits for renewal. */
  planStarts: (planLabel: string, date: string) => string;
  /** The tag on the plan that comes next. */
  nextPlan: string;
  /** Under the current plan while a switch waits: "Until Dec 12". */
  untilDay: (date: string) => string;
  /** On Plans while a switch waits for renewal. */
  switchBooked: (nextLabel: string, currentLabel: string, date: string) => string;
  /** The green tag: "Save 37%". */
  saveTag: (pct: number) => string;
  /** The features header and its count. */
  premiumFeatures: (tierLabel: string) => string;
  /** 3.0.0: the heading over the features a subscriber can switch or edit on the Premium page. */
  premiumSettings: (tierLabel: string) => string;
  /** The floating crown, for screen readers (4.0.0): "Premium" for a free account, "Premium Member" once paid. */
  crownLabel: (member: boolean) => string;
  crownHint: string;
  featureCount: (n: number) => string;
  tapToSee: string;
  /** The list of what stops working, after a cancel and in Before You Go. */
  whatYouLose: (date: string) => string;
  beforeYouGo: string;
  keepEitherWay: (tierLabel: string, date: string) => string;
  insteadYouCould: string;
  /** "Stay for 50% Off". */
  stayOffer: (pct: number) => string;
  /** "$1.99/month for 3 months". */
  offerLine: (priceWithPer: string, cycles: number, unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR') => string;
  offerTag: string;
  /** "Switch to Yearly". */
  switchToPlan: (planLabel: string) => string;
  /** "$29.99 a year, about $2.49 a month." (2.0.0: the price comes with `every`, not "/year"). */
  aboutPerMonth: (priceWithPer: string, monthly: string) => string;
  keepPremium: (tierLabel: string) => string;
  continueToCancel: string;
  /** The card right after a purchase. */
  welcomeTitle: (tierLabel: string) => string;
  welcomeBody: string;
  startExploring: string;
}

const UNIT = { DAY: 'day', WEEK: 'week', MONTH: 'month', YEAR: 'year' } as const;
const TITLE_UNIT = { DAY: 'Day', WEEK: 'Week', MONTH: 'Month', YEAR: 'Year' } as const;

export const DEFAULT_STRINGS: SubscriptionStrings = {
  title: 'Upgrade',
  choosePlan: 'Choose a Plan',
  startTrial: (d) => `Start ${d}-Day Free Trial`,
  startTrialPeriod: (u, n) => `Start ${n}-${TITLE_UNIT[u]} Free Trial`,
  upgrade: (t) => `Upgrade to ${t}`,
  switchTo: (t) => `Switch to ${t}`,
  switchPlan: (p) => `Switch to ${p}`,
  currentPlan: 'Current Plan',
  planNotOffered: (p, cur, t) => (cur ? `You are on ${t} ${cur}. ${p} is not available while this plan is active.` : `You already have ${t}.`),
  current: 'Current',
  feature: 'Feature',
  alreadySubscribed: 'Already Subscribed?',
  compareTitle: 'Compare Plans',
  youHave: (t) => `You Have ${t}`,
  thenPrice: (p, every, trial) => `${trial ? `Free for ${trial} days, then ` : ''}${p} ${every}. Cancel any time.`,
  thenPriceAfterPeriod: (p, every, u, n) => `Free for ${n} ${UNIT[u]}${n === 1 ? '' : 's'}, then ${p} ${every}. Cancel any time.`,
  every: (u, n) => (n === 1 ? `a ${UNIT[u]}` : `every ${n} ${UNIT[u]}s`),
  perMonth: (p) => `${p}/month`,
  per: (u, n) => (n === 1 ? `/${UNIT[u]}` : `/${n} ${UNIT[u]}s`),
  save: (n) => `Save ${n}%`,
  restore: 'Restore Purchases',
  restoring: 'Checking Your Purchases…',
  haveCode: 'Redeem a Code',
  enterCode: 'Enter Code',
  apply: 'Apply',
  manage: 'Manage or Cancel Subscription',
  terms: 'Terms of Use',
  privacy: 'Privacy Policy',
  legal: (trial) =>
    `Payment is charged to your store account. The subscription renews automatically unless turned off at least 24 hours before the end of the period, in your store account settings. ${trial ? 'The free trial becomes a paid subscription at its end unless cancelled. ' : ''}`,
  loadingPrices: 'Getting prices from the store…',
  pricesFailed: 'Could not reach the store. Check your connection and try again.',
  tryAgain: 'Try Again',
  notOpenYet: 'Purchases open when the app is in the store.',
  welcome: (t) => `Welcome to ${t}. Every feature is now available.`,
  restored: (t) => `${t} is back on this device.`,
  nothingToRestore: 'No purchase was found for this store account.',
  boughtNotActive: 'The purchase went through, but it is not active yet. Tap Restore Purchases in a minute.',
  locked: (f, t) => `${f} is part of ${t}.`,
  lockedBody: 'Upgrade to Premium to use this feature.',
  unlock: 'See Plans',
  askGrownUp: 'Ask a Parent or Guardian',
  close: 'Close',
  subscription: 'Subscription',
  plan: 'Plan',
  renews: 'Renews',
  ends: 'Ends',
  pretend: 'Pretend to Have',
  pretendNote: 'Development builds only. Changes this phone, never the server.',
  developerOnly: 'Developer Only',
  free: 'Free',
  graceNote: 'There is a problem with your payment. Update it in your store account to keep your plan.',
  planName: (p) => `${p} Plan`,
  endsNote: 'Auto-renew is off.',
  included: 'Included',
  opensPage: 'Opens its page.',
  lockedHint: 'Upgrade to Premium',
  lockedLabel: 'locked. Opens the plans.',
  autoRenewOn: 'Turn Auto-Renew Back On',
  getPremium: (t) => `Get ${t}`,
  fromPrice: (p) => `From ${p}`,
  orPrice: (p) => `Or ${p}. Cancel any time.`,
  getPremiumNote: 'Includes every feature.',
  priceChoice: (a, b) => `${a} or ${b}`,
  cancelSubscription: 'Cancel Subscription',
  keepUntil: (t, d) => `You keep ${t} until ${d}.`,
  renewSubscription: 'Renew Subscription',
  continuesAfter: (t, d) => `Keep ${t} Beyond ${d}`,
  changePlan: 'Change Plan',
  planLine: (p, price) => `${p} · ${price}`,
  restoreSubscription: 'Restore Purchases',
  restoreHint: 'Restore a subscription purchased on another device.',
  restoreHintPaid: (tier) => `Restore ${tier} purchased on another device.`,
  updatingSubscription: 'Updating Your Subscription…',
  storeName: (p) => (p === 'ios' ? 'App Store' : p === 'android' ? 'Google Play' : 'Store'),
  storeAccount: (p) => (p === 'ios' ? 'Apple ID' : p === 'android' ? 'Google Account' : 'Account'),
  storeCompany: (p) => (p === 'ios' ? 'Apple' : p === 'android' ? 'Google' : 'The store'),
  updatingBody: (company) => `${company} is confirming your change. This page will update by itself.`,
  allSet: 'You Are All Set',
  subscriptionUpdated: 'Subscription Updated',
  notConfirmedYet: (company) => `${company} has not confirmed a change yet. This page will update the moment it does.`,
  renewsOn: (t, d) => `${t} renews on ${d}`,
  restoreChecking: (store) => `Checking with the ${store}…`,
  restoreAllSet: (tier, account) => `${tier} is active on this ${account}.`,
  restoreDone: (tier) => `${tier} was restored.`,
  restoreNone: (account) => `No purchases were found on this ${account}.`,
  restoreFailed: (store) => `Could not reach the ${store}. Tap to try again.`,
  switchingTo: (plan, date) => (date ? `Switching to ${plan} on ${date}` : `Switching to ${plan} at Renewal`),
  planStarts: (plan, date) => (date ? `${plan} Starts ${date}` : `${plan} Starts at Renewal`),
  nextPlan: 'Next',
  untilDay: (date) => `Until ${date}`,
  switchBooked: (next, current, date) =>
    `Your switch to ${next} is booked. ${current} stays${date ? ` until ${date}` : ' until it renews'}, then ${next} begins. Nothing is charged until then.`,
  saveTag: (n) => `Save ${n}%`,
  premiumFeatures: (t) => `${t} Features`,
  premiumSettings: (t) => `${t} Settings`,
  crownLabel: (member) => (member ? 'Premium Member' : 'Premium'),
  crownHint: 'Opens the plans. Drag to move it.',
  featureCount: (n) => (n === 1 ? '1 Feature' : `${n} Features`),
  tapToSee: 'Tap to View',
  whatYouLose: (d) => (d ? `What You Lose After ${d}` : 'What You Lose'),
  beforeYouGo: 'Before You Go',
  keepEitherWay: (t, d) => `You keep ${t} until ${d} either way.`,
  insteadYouCould: 'Other Options',
  stayOffer: (n) => `Stay for ${n}% Off`,
  offerLine: (p, n, u) => `${p} for ${n} ${UNIT[u]}${n === 1 ? '' : 's'}`,
  offerTag: 'Offer',
  switchToPlan: (p) => `Switch to ${p}`,
  aboutPerMonth: (p, m) => `${p}, about ${m} a month.`,
  keepPremium: (t) => `Keep ${t}`,
  continueToCancel: 'Continue to Cancel',
  welcomeTitle: (t) => `Welcome to ${t}`,
  welcomeBody: 'Every Premium feature is now available.',
  startExploring: 'Start Exploring',
};
