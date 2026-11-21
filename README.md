# app-subscriptions-kit

The subscription pattern for React Native and Expo apps (iOS, Android and web): one config for tiers, features and limits; checks such as `canUse()` and `limit()`; a `useSubscription()` hook; and themeable screens that follow the App Store and Google Play rules: the Plans screen, the Free vs paid table, a complete Premium page for Settings, lock badges and plan pills.

**Current version: 1.23.0** (tag `v1.23.0`)

It never talks to a store. Give it [app-payments-kit](https://github.com/yuvarajsalla20/app-payments-kit), or any object with the same few functions (`PaymentsLike` in `src/payments.ts`). For the full App Store Connect, RevenueCat and EAS setup, follow the Subscriptions and Payments Playbook in the app's `runbooks/` folder.

Part of the shared kits:
[app-core-kit](https://github.com/yuvarajsalla20/app-core-kit) ·
[app-auth-kit](https://github.com/yuvarajsalla20/app-auth-kit) ·
[app-account-kit](https://github.com/yuvarajsalla20/app-account-kit) ·
[app-settings-kit](https://github.com/yuvarajsalla20/app-settings-kit) ·
**app-subscriptions-kit** ·
[app-payments-kit](https://github.com/yuvarajsalla20/app-payments-kit) ·
[app-export-kit](https://github.com/yuvarajsalla20/app-export-kit) ·
[app-guard-kit](https://github.com/yuvarajsalla20/app-guard-kit) ·
[app-theme-kit](https://github.com/yuvarajsalla20/app-theme-kit) ·
[app-invite-kit](https://github.com/yuvarajsalla20/app-invite-kit) ·
[app-goldrates-api-kit](https://github.com/yuvarajsalla20/app-goldrates-api-kit)

Tools that work alongside them: [code-review-kit](https://github.com/yuvarajsalla20/code-review-kit) (reviews) and app-insights-kit (store numbers, private).

## Install

```jsonc
// package.json
"dependencies": {
  "app-subscriptions-kit": "git+https://github.com/yuvarajsalla20/app-subscriptions-kit.git#<full SHA of v1.23.0>",
  "app-payments-kit": "git+https://github.com/yuvarajsalla20/app-payments-kit.git#<full SHA of v2.7.0>"
},
"kitVersions": {
  "app-subscriptions-kit": "v1.23.0",
  "app-payments-kit": "v2.7.0"
}
```

Pin the full commit SHA of a release tag, and write the tag in `kitVersions`. Find a SHA with `git ls-remote https://github.com/yuvarajsalla20/app-subscriptions-kit refs/tags/v1.23.0`.

**Peer dependencies:** `react` ≥ 18, `react-native` ≥ 0.74, `react-native-svg` ≥ 13 (Expo apps install it with `npx expo install react-native-svg`).

1.23.0 works best with app-payments-kit **2.7.0** or later (payment problems from the store, trial lengths in months, the last known tier offline). Older payments kits still work; those parts then simply don't show.

## What you get

| Piece | What it does |
|---|---|
| `defineSubscription({ tiers, features, limits, plans, compare, kids })` | The app's rules in one place. Checked at start, so a typo fails loudly instead of unlocking something |
| `<SubscriptionProvider>` | Follows the account's tier (store, server row, tester switch) and shares it with every screen |
| `useSubscription()` | The full state and actions (see below) |
| `usePremium()`, `useTier()` | Shortcuts: `{ premium, loading, source }` for one-tier apps, or the tier name |
| `<PremiumPage>` | A complete Premium page for Settings: Get Premium, the features with locks or switches, Cancel with a Before You Go sheet, Renew, Change Plan, Restore, the welcome card and the updating box |
| `<PlansScreen>` | Store prices, per-month price and savings, trial wording only when the store offers one, a tab per paid tier, Restore, codes, Manage, auto-renew wording, terms and privacy links |
| `<CompareTable>` | Free vs paid tiers, one column per tier |
| `<SubscriptionStatusCard>`, `statusLines()` | "You have Premium", the plan, and Renews or Ends |
| `<SubscriptionRow>` | A compact Settings row: tier, renew or end date, Manage, code, Restore, and the developer tester switch |
| `<PremiumGate>`, `<PremiumPill>`, `<LockBadge>`, `<PlanBadge>` | A locked card in place of a feature, the crowned tier pill, the lock badge, and a pill with the account's plan ("Monthly", "Yearly" or "Free") |
| `planLabel()`, `usePlanLabel()` | The same plan word as text |
| `<Crowns>`, `<Diamond>`, `<Swing>`, `<UpdatingBox>` | The art pieces, for an app's own layouts |
| `canUse`, `limitFor`, `allowed`, `atLeast`, `rank`, `tierFor`, `tierAllowing` | The rules as pure functions |
| `money`, `perMonth`, `savings`, `months`, `isPlan`, `shortDay` | Price and date helpers |

## Quick start

```ts
// subscription.ts (one per app)
import { defineSubscription } from 'app-subscriptions-kit';

export const plan = defineSubscription({
  tiers: ['free', 'premium'],                    // or ['free', 'plus', 'pro']
  features: { exportPdf: 'premium', themes: 'premium' },   // not listed = free
  limits: {
    projects: { free: 3, premium: 50 },          // a count
    sizes: { free: [5], premium: [5, 10, 20] },  // or a list of allowed values
  },
  plans: [                                       // order and wording; prices come from the store
    { id: 'yearly', tier: 'premium', label: 'Yearly', badge: 'Best Value' },
    { id: 'monthly', tier: 'premium', label: 'Monthly' },
  ],
  compare: [
    { label: 'PDF Export', values: { free: '–', premium: '✓' } },
    { label: 'Projects', values: { free: 'Up to 3', premium: 'Up to 50' } },
  ],
  kids: false,                                   // true: buy, restore and manage ask a grown-up check first
});
```

```tsx
// App root
import AsyncStorage from '@react-native-async-storage/async-storage';

<SubscriptionProvider config={plan} payments={payments} userId={auth.loading ? undefined : user?.uid ?? null} storage={AsyncStorage}>
  <App />
</SubscriptionProvider>

// Any screen
const { canUse, limit } = useSubscription();
if (!canUse('exportPdf')) return <PremiumGate feature="exportPdf" name="PDF Export" onUnlock={openPlans} />;

// Plans screen
<PlansScreen header={<Logo />} onClose={goBack} onOpenTerms={openTerms} onOpenPrivacy={openPrivacy} />

// Premium page inside Settings (app-settings-kit's `plan.content`)
<PremiumPage
  features={[
    { key: 'themes', label: 'Themes', icon: <ThemeIcon />, toggle: { value: themesOn, onChange: setThemesOn } },
    { key: 'exportPdf', label: 'PDF Export', onPress: openDataExport },
  ]}
  loseList={['PDF Export', 'Themes']}
  stayOfferId="monthly_stay50"
  onOpenPlans={openPlans}
  onError={reportError}
/>
```

## `SubscriptionProvider` props

| Prop | Notes |
|---|---|
| `config` | The result of `defineSubscription` |
| `payments` | app-payments-kit, or any `PaymentsLike` |
| `userId` | The signed-in account, or `null` once signed out. `undefined` while the app still restores the session: the store is not asked and `loading` stays true. A change clears the last account's tier at once |
| `storage` | Optional, such as AsyncStorage. Keeps a booked plan switch and the welcome card between launches |
| `grownUpCheck` | Optional. Your own check (a sum, a PIN). Resolve `true` to go on. Used when `kids: true` |

## `useSubscription()`

| Field | What it is |
|---|---|
| `tier`, `tierLabel`, `paid`, `loading`, `ready`, `source` | The account's level and where it came from |
| `server`, `renewal` | The server row, and the store's `{ until, willRenew, productId }` |
| `canUse(feature)`, `limit(name)`, `allowed(name, value)`, `isAtLeast(tier)`, `tierFor(feature)` | Checks |
| `loadPlans()`, `buy(plan)`, `restore()`, `switchPlan(plan)` | Store actions |
| `redeemCode(code?)`, `canRedeemCode` | Offer codes (hidden on the web) |
| `openManage(onClosed?)` | The store's manage sheet. `onClosed` runs when it closes |
| `loadOffer(id)`, `buyOffer(offer)` | Promotional offers, such as a stay discount |
| `pendingSwitch` | A booked switch to a longer plan: `{ planId, startsAt }` |
| `justSubscribed`, `dismissWelcome()` | The Welcome to Premium card |
| `grownUp()` | Runs the grown-up check |
| `tester` | `{ available, tier, set(tier) }`: the development tester switch |

## Tiers, plans and limits

- **Tiers** are levels of access, lowest first, starting with `free`. A higher tier includes everything below it.
- **Plans** are ways to pay for a tier, any number per tier. Their ids match the payments kit's plan ids, and a store product id ending in the plan id (`myapp_yearly`) is read as that plan.
- **Limits** take a value per tier. A tier with no value gets the value of the nearest tier below it.

Keep the limits that matter on the server too (app-payments-kit's `has_tier()` in a database trigger). The phone's answer is for showing locks.

## `PremiumPage`

| Prop | Notes |
|---|---|
| `features` | `{ key, label, detail?, icon?, toggle?, children?, onPress? }[]`. With `toggle`, a paid account gets a switch. With `onPress`, an unlocked row opens the page where the feature lives |
| `onOpenPlans` | Opens the Plans screen |
| `onError` | Store failures, for crash reporting |
| `icon` | The mark on the cards. Default `<Crowns>` |
| `loseList` | What a person loses on cancel, shown in Before You Go and after a cancel |
| `featuresOpen` | `{ free?, paid? }`: whether the features list starts open |
| `stayOfferId` | A promotional offer id. Before You Go offers it to people on that plan |
| `beforeCancel` | `false` skips the Before You Go sheet |
| `updatingArt` | The art in the "Updating Your Subscription…" box. Wrap your own in `<Swing>` |
| `quietAfterStore` | `true`: after Apple's or Google's subscription screen closes, no loader and no "hasn't confirmed" line. A change the store shows later is still confirmed. Default `false` |

What it shows:

- **Free:** a Get Premium card with store prices ("From $3.99/month", "Or $29.99/year"), See Plans, Restore Subscription and Have a Code?, then the features with a lock on each.
- **Renewing:** the status card, the features, **Cancel Subscription** ("You keep Premium until …"), Change Plan (to a longer plan only, with its saving) and Restore Subscription.
- **Before You Go:** what is lost, the stay offer when there is one, a switch to the longer plan, Keep Premium, and Continue to Cancel.
- **After a cancel:** Ends and "Auto-renew is off", then **Renew Subscription** ("Keep Premium Monthly beyond Dec 12, 2026").
- **After the store's sheet closes:** "Updating Your Subscription…" until the change shows, then "You're All Set!" or "Subscription Updated".
- **Right after a first purchase:** a Welcome to Premium card.

## `PlansScreen`

| Prop | Notes |
|---|---|
| `onOpenTerms`, `onOpenPrivacy` | **Required.** The legal links Apple asks for |
| `header`, `onClose` | The app's logo and Close, in one row |
| `currentPlanId` | Marks the plan the account pays for as **Current Plan**, and puts **CURRENT** over its tier in the table |
| `onSwitch(plan)` | Lets a subscriber switch plans. The app decides what that does |
| `canSwitchTo(from, to)` | Narrows the switches, such as longer plans only: `(a, b) => months(b)! > months(a)!` |
| `switchBlocked` | A sentence for a plan bought somewhere this device cannot change |
| `currentMark` | An element drawn next to the current plan's name |
| `onManage` | Your own sheet before the store's manage page |
| `initialTier`, `onUnlocked(tier)` | The tab to open on, and a callback once a tier is bought |
| `compareFirst`, `hideCompare` | Put the table on top, or leave it out |
| `previewPlans` | Plans to show without a store, for design previews |

Layout: logo and Close, the plans, the Free vs paid table, the main button, then Restore, Have a Code? and Manage on one line, then the legal line.

## On the website

With app-payments-kit's RevenueCat web provider (`revenueCatWeb`), the same Plans screen sells on the website with card checkout. The website has no store codes, so Have a Code? is hidden (`payments.canRedeemCode` is false). Restore and Manage work the same, and the Premium page uses the web store's words, not "App Store".

## Theming and words

Every screen takes three optional props. Pass only what differs:

- `theme`: `Partial<SubscriptionTheme>`. Colors and radius. The default (`DEFAULT_THEME`) is the gold Premium look. Notable values: `accent`, `button` and `onButton` (the main button), `premium`, `premiumSoft` and `premiumText` (current plan and pills), `king`, `kingFill`, `queen`, `queenFill` (the crowns), `success`, `info`, `danger` and their soft fills, `hud`, `onHud`, `hudAccent`, `confetti` (the updating box), and `shadow` (a CSS box-shadow that makes cards float with no outline).
- `strings`: `Partial<SubscriptionStrings>`. Every word, for rewording or translation (`DEFAULT_STRINGS`). Store names come from `storeName`, `storeAccount` and `storeCompany(platform)`, so Android says Google Play.
- `components`: `{ Text }`, for your fonts.

Motion stops when the phone asks for less motion (`useReduceMotion`).

## Testing

`npm test` runs the rules, pricing and screen tests with a fake payments object. In an app, the payments kit's tester switch shows in `SubscriptionRow` and at the bottom of `PremiumPage` in development builds, so every locked and unlocked screen can be tried in Expo Go and on the web.

```bash
npm install
npm run typecheck
npm test
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## Writing rule

Every word this kit shows, and every line of its documentation, follows the shared [Writing rule](https://github.com/yuvarajsalla20/app-settings-kit#writing-rule-every-word-is-professional): Title Case for titles, rows and buttons; calm, complete sentences for captions and messages; "e.g.," for examples; no chatty fragments, slang or exclamation marks. Apps do not override these words; a change is made in the kit so that every app receives it.

## License

MIT
