# app-subscriptions-kit

The subscription pattern for React Native / Expo apps (iOS, Android, web): one config for tiers, features and limits, checks such as `canUse()` and `limit()`, a `useSubscription()` hook, and themeable screens that follow the App Store and Google Play rules.

It never talks to a store. Give it [app-payments-kit](https://github.com/yuvarajsalla20/app-payments-kit), or any object with the same few functions (`PaymentsLike` in `src/payments.ts`).

## What you get

| Piece | What it does |
|---|---|
| `defineSubscription({ tiers, features, limits, plans, compare, kids })` | The app's rules in one place. Checks them at start, so a typo fails loudly instead of unlocking something |
| `<SubscriptionProvider config payments userId grownUpCheck>` | Follows the account's tier (store, server row, tester switch) and shares it with every screen |
| `useSubscription()` | `tier`, `paid`, `canUse(f)`, `limit(n)`, `allowed(n, v)`, `isAtLeast(t)`, `buy`, `restore`, `redeemCode`, `openManage`, `tester` |
| `usePremium()` / `useTier()` | Shortcuts: `{ premium }` for one-tier apps, or the tier name |
| `<PlansScreen>` | Store prices, per-month price and savings, trial wording only when the store offers it, a tab per paid tier, restore, codes, manage, auto-renew wording, terms and privacy links |
| `<CompareTable>` | Free vs paid tiers, one column per tier, extra rows highlighted |
| `<PremiumGate>`, `<PremiumPill>`, `<LockBadge>` | A locked card in place of a feature, the gold pill and the lock badge |
| `<SubscriptionRow>` | For a Settings screen (app-account-kit's App slot): tier, renew or end date, manage, code, restore, payment-problem note, developer tester switch |

## Use it

```ts
// subscription.ts  (one per app)
import { defineSubscription } from 'app-subscriptions-kit';

export const plan = defineSubscription({
  tiers: ['free', 'premium'],                  // or ['free', 'plus', 'pro']
  features: { practiceTest: 'premium', hardLevel: 'premium' },   // not listed = free
  limits: {
    children: { free: 2, premium: 4 },         // a count
    setSizes: { free: [5], premium: [5, 10, 20, 30] },   // or a list of allowed values
  },
  plans: [                                     // order and wording; prices come from the store
    { id: 'yearly', tier: 'premium', label: 'Yearly', badge: 'Most popular' },
    { id: 'monthly', tier: 'premium', label: 'Monthly' },
  ],
  compare: [
    { label: 'Full practice tests', values: { free: '–', premium: '✓' } },
    { label: 'Children', values: { free: 'Up to 2', premium: 'Up to 4' } },
  ],
  kids: true,                                  // buy, restore and manage ask the grown-ups check first
});
```

```tsx
// app/_layout.tsx
<SubscriptionProvider config={plan} payments={payments} userId={user?.id ?? null} grownUpCheck={askGrownUp}>
  <Stack />
</SubscriptionProvider>

// any screen
const { canUse, limit } = useSubscription();
if (!canUse('practiceTest')) return <PremiumGate feature="practiceTest" name="Practice tests" onUnlock={() => router.push('/plans')} />;

// app/plans.tsx
<PlansScreen header={<Logo />} onClose={router.back} onOpenTerms={openTerms} onOpenPrivacy={openPrivacy} theme={{ accent: '#5B4BD6' }} />

// settings
<SubscriptionRow onOpenPlans={() => router.push('/plans')} />
```

`grownUpCheck` is your own check (a times-table question, a PIN …): resolve `true` to go on.

## Tiers, plans and limits

- **Tiers** are levels of access, lowest first, starting with `free`. A higher tier includes everything below it.
- **Plans** are ways to pay for a tier. Any number per tier. Their ids match the payments kit's plan ids.
- **Limits** take a value per tier. A tier with no value gets the value of the nearest tier below it.

Keep the limits that matter on the server too (app-payments-kit's `has_tier()` in a database trigger): the phone's answer is for showing locks.

## Current plan and switching

Pass `currentPlanId` (the plan the account pays for) and the Plans screen marks it **Current plan**, and the Free vs paid table puts a **CURRENT** badge over the account's tier. With `onSwitch`, the current plan is greyed out and can't be picked, the best other length (its `badge`, then `selected`, then the first) is picked to start with, and the button says **Switch to …**; the app decides what that does (explain when the change applies, then open the store's or the checkout's own page). Without `onSwitch`, or with `switchBlocked` (a sentence for a plan bought somewhere this device can't change, such as another store), the current plan stays picked, the others are locked, and the line under the button shows the current price.

Pass `canSwitchTo(from, to)` to narrow which plans a subscriber may switch to, for example longer plans only (`(a, b) => months(b)! > months(a)!`), so a yearly member is never invited to move to a shorter plan. When no plan is allowed, no switch is offered: the current plan stays picked and the button says **You have …**. Pass `currentMark` (any element, such as the app's Premium icon) to draw it next to the current plan's name.

Pass `onManage` to show your own sheet before the store's manage page (for example a simple "cancel" sheet that says what happens), and change `strings.manage` to match (for example "Turn renewal back on" after a cancel).

## On the website

With app-payments-kit's RevenueCat web provider (`revenueCatWeb`), the same Plans screen sells on the website with card checkout. The website has no store codes, so "Have a code?" is hidden there (`payments.canRedeemCode` is false; any payments object can set it). Restore and Manage work the same.

## Look and words

Every screen takes `theme` (colors, radius), `strings` (every word, for rewording or translation) and `components` (`Text`, for your fonts). Pass only what differs. The default is the gold Premium look.

The Plans screen shows the plans first, then the Free vs paid table (`compareFirst` puts the table on top), then a box with restore, codes and manage. `theme.shadow` (a CSS box-shadow) makes cards float with no outline; `theme.button` / `theme.onButton` color the main button (the accent by default).

## Testing

`npm test` runs the rules, pricing and screen tests with a fake payments object. In an app, the payments kit's tester switch shows in `SubscriptionRow` in development builds, so every locked and unlocked screen can be tried on the web and in Expo Go.

## License

MIT
