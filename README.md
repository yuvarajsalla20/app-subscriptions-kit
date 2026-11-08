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

Pass `currentPlanId` (the plan the account pays for) and the Plans screen marks it **Current plan**, picks it by default and prices the line under the button by it. With `onSwitch`, a subscriber can pick another plan of the same tier and press **Switch to …**; the app decides what that does (explain when the change applies, then open the store's or the checkout's own page). Pass `switchBlocked` with a sentence when the plan was bought somewhere this device can't change it (another store): other plans stay locked and the sentence is shown.

## On the website

With app-payments-kit's RevenueCat web provider (`revenueCatWeb`), the same Plans screen sells on the website with card checkout. The website has no store codes, so "Have a code?" is hidden there (`payments.canRedeemCode` is false; any payments object can set it). Restore and Manage work the same.

## Look and words

Every screen takes `theme` (colors, radius), `strings` (every word, for rewording or translation) and `components` (`Text`, for your fonts). Pass only what differs. The default is the gold Premium look.

## Testing

`npm test` runs the rules, pricing and screen tests with a fake payments object. In an app, the payments kit's tester switch shows in `SubscriptionRow` in development builds, so every locked and unlocked screen can be tried on the web and in Expo Go.

## License

MIT
