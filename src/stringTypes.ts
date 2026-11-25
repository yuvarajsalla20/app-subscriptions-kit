import type { StorePlatform } from './theme';

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
  /** @deprecated 5.0.0: no longer shown. The Premium page lists what is included; settings live in Preferences. */
  premiumSettings: (tierLabel: string) => string;
  /** 5.0.0: the heading over everything a subscriber's plan includes: "Included With Premium". */
  includedWith: (tierLabel: string) => string;
  /** 8.0.0: the label at the top of the Your Plan card, the first card on the Subscription page. */
  yourPlan: string;
  /** 8.0.0: the heading over Change Plan and Restore Purchases once the account pays (was "Your Plan" before 8.0.0). */
  manageHeading: string;
  /** 11.0.0: the Your Plan card's title for a free account: "Free Plan". */
  freePlanTitle: (freeLabel: string) => string;
  /** 11.0.0: the colored line for a free account, or a paid plan with no end date. */
  yourCurrentPlan: string;
  /** 11.0.0: the quieter line for a free account. */
  freeIncluded: string;
  /** The badge on the Your Plan card. */
  planActive: string;
  planTrial: string;
  planEnding: string;
  /** 11.0.0: the colored line: "Renews Dec 23, 2026", "Free Trial Ends Nov 30, 2026", "Ends Dec 23, 2026". */
  renewsOnDate: (date: string) => string;
  trialEndsOn: (date: string) => string;
  endsOn: (date: string) => string;
  /** 11.0.0: the quieter line once auto-renew is off: "Auto-renew is off. Premium stays until then." */
  endingDetail: (tierLabel: string) => string;
  /** 11.0.0: after a free trial: "Then $29.99/year." */
  thenPriceShort: (priceWithPer: string) => string;
  /** 11.0.0: "Billed through the App Store." or "Billed through Google Play." */
  billedThroughStore: (platform: StorePlatform) => string;
  /** A paid plan with no end date: "Every Premium feature is included." */
  allIncludedLine: (tierLabel: string) => string;
  /** 5.0.0: the line under the included list naming the features whose settings live in Preferences. */
  setInPreferences: (labels: readonly string[]) => string;
  /** The floating crown, for screen readers (4.0.0): "Premium" for a free account, "Premium Member" once paid. */
  /** The crown's name for screen readers. 6.0.0: only a free account sees the crown, so `member` is always false. */
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
