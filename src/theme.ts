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
  /** The plan line on the status card: "Monthly plan". */
  planName: (planLabel: string) => string;
  /** Under the Ends date on the status card. */
  endsNote: string;
  /** Premium page: beside an unlocked feature with no switch. */
  included: string;
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
  /** "Or $29.99/year. Cancel anytime." */
  orPrice: (price: string) => string;
  /** Under Get Premium when prices can't be shown. */
  getPremiumNote: string;
  /** "$3.99/month or $29.99/year" under See Plans. */
  priceChoice: (a: string, b: string) => string;
  cancelSubscription: string;
  /** Under Cancel Subscription: "You keep Premium Monthly until Dec 12, 2026". `tierLabel` includes the plan when known. */
  keepUntil: (tierLabel: string, date: string) => string;
  renewSubscription: string;
  /** Under Renew Subscription: "Turn auto-renew back on to keep Premium Monthly after Dec 12, 2026". `tierLabel` includes the plan when known. */
  continuesAfter: (tierLabel: string, date: string) => string;
  changePlan: string;
  /** Under Change Plan: "Yearly · $29.99/year". */
  planLine: (planLabel: string, priceWithPer: string) => string;
  restoreSubscription: string;
  /** Under Restore Subscription on a free account. */
  restoreHint: string;
  /** Under Restore Subscription once paid: "Premium Missing on a Device? Tap to Check." */
  restoreHintPaid: (tierLabel: string) => string;
  /** While the store is checked. `store` is "App Store" or "Google Play". */
  /** Under the top card from the moment the store's manage screen closes until the change shows (up to 20 seconds). */
  updatingSubscription: string;
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
  /** "$29.99/year, about $2.49 a month". */
  aboutPerMonth: (priceWithPer: string, monthly: string) => string;
  keepPremium: (tierLabel: string) => string;
  continueToCancel: string;
  /** The card right after a purchase. */
  welcomeTitle: (tierLabel: string) => string;
  welcomeBody: string;
  startExploring: string;
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
  current: 'Current',
  feature: 'Feature',
  alreadySubscribed: 'Already subscribed?',
  compareTitle: 'Compare plans',
  youHave: (t) => `You have ${t}`,
  thenPrice: (p, every, trial) => `${trial ? `Free for ${trial} days, then ` : ''}${p} ${every}. Cancel any time.`,
  every: (u, n) => (n === 1 ? `a ${UNIT[u]}` : `every ${n} ${UNIT[u]}s`),
  perMonth: (p) => `${p}/month`,
  per: (u, n) => (n === 1 ? `/${UNIT[u]}` : `/${n} ${UNIT[u]}s`),
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
  planName: (p) => `${p} plan`,
  endsNote: 'Auto-renew is off',
  included: 'Included',
  lockedHint: 'Upgrade to unlock',
  lockedLabel: 'locked. Opens the plans',
  autoRenewOn: 'Turn auto-renew back on',
  getPremium: (t) => `Get ${t}`,
  fromPrice: (p) => `From ${p}`,
  orPrice: (p) => `Or ${p}. Cancel anytime.`,
  getPremiumNote: 'Unlock every feature.',
  priceChoice: (a, b) => `${a} or ${b}`,
  cancelSubscription: 'Cancel Subscription',
  keepUntil: (t, d) => `You keep ${t} until ${d}`,
  renewSubscription: 'Renew Subscription',
  continuesAfter: (t, d) => `Turn auto-renew back on to keep ${t} after ${d}`,
  changePlan: 'Change Plan',
  planLine: (p, price) => `${p} · ${price}`,
  restoreSubscription: 'Restore Subscription',
  restoreHint: 'Already paid on another device?',
  restoreHintPaid: (tier) => `${tier} Missing on a Device? Tap to Check.`,
  updatingSubscription: 'Updating Your Subscription…',
  restoreChecking: (store) => `Checking With the ${store}…`,
  restoreAllSet: (tier, account) => `You're All Set. ${tier} Is Active on This ${account}.`,
  restoreDone: (tier) => `${tier} Restored.`,
  restoreNone: (account) => `No Purchases Found on This ${account}.`,
  restoreFailed: (store) => `Couldn't Reach the ${store}. Tap to Try Again.`,
  switchingTo: (plan, date) => (date ? `Switching to ${plan} on ${date}` : `Switching to ${plan} at Renewal`),
  planStarts: (plan, date) => (date ? `${plan} Starts ${date}` : `${plan} Starts at Renewal`),
  nextPlan: 'NEXT',
  untilDay: (date) => `Until ${date}`,
  switchBooked: (next, current, date) =>
    `Your switch to ${next} is booked. ${current} stays${date ? ` until ${date}` : ' until it renews'}, then ${next} begins. Nothing is charged until then.`,
  saveTag: (n) => `Save ${n}%`,
  premiumFeatures: (t) => `${t} Features`,
  featureCount: (n) => (n === 1 ? '1 feature' : `${n} features`),
  tapToSee: 'Tap to see them',
  whatYouLose: (d) => (d ? `What You Lose After ${d}` : 'What You Lose'),
  beforeYouGo: 'Before You Go',
  keepEitherWay: (t, d) => `You keep ${t} until ${d} either way.`,
  insteadYouCould: 'Instead, You Could',
  stayOffer: (n) => `Stay for ${n}% Off`,
  offerLine: (p, n, u) => `${p} for ${n} ${UNIT[u]}${n === 1 ? '' : 's'}`,
  offerTag: 'Offer',
  switchToPlan: (p) => `Switch to ${p}`,
  aboutPerMonth: (p, m) => `${p}, about ${m} a month`,
  keepPremium: (t) => `Keep ${t}`,
  continueToCancel: 'Continue to Cancel',
  welcomeTitle: (t) => `Welcome to ${t}`,
  welcomeBody: 'Everything is unlocked.',
  startExploring: 'Start Exploring',
};
