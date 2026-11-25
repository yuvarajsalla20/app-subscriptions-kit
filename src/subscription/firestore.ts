import { doc, getDoc, type Firestore } from 'firebase/firestore';
import { DEFAULT_PLAN_MODE, planModeFrom, type PlanMode } from './planMode';

/**
 * 9.0.0: the plan mode from the Firestore document `config/app`, for `SubscriptionProvider`'s `planMode`:
 *
 *   import { firestorePlanMode } from 'app-subscriptions-kit/firestore';
 *   const PLAN_MODE = firestorePlanMode(db);
 *   <SubscriptionProvider planMode={PLAN_MODE} ... />
 *
 * `planMode: "subscription"` turns selling on; `subscriptionTesters` (a list of account ids) limits it to those accounts.
 * The document is read once per launch. Without Firebase the app stays free. 11.1.0: when it cannot be read (offline), the
 * lookup fails, and `SubscriptionProvider` uses the last answer it kept for this account (or free when there is none).
 */
export const firestorePlanMode = (db: Firestore | null): ((userId: string | null) => Promise<PlanMode>) => {
  let data: Promise<unknown> | null = null;
  return (userId) => {
    if (!db) return Promise.resolve(DEFAULT_PLAN_MODE);
    data ??= getDoc(doc(db, 'config', 'app'))
      .then((snap) => snap.data())
      .catch((e: unknown) => {
        data = null; // try again at the next sign-in
        throw e;
      });
    return data.then((d) => planModeFrom(d, userId));
  };
};
