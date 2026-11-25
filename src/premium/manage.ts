import { useEffect, useRef, useState } from 'react';
import type { SubscriptionState } from '../SubscriptionProvider';
import type { UpdatingDone } from '../Updating';

/** How long "Updating Your Subscription…" may show when nothing changes (the store's manage screen was closed as it was). */
const UPDATING_MS = 20_000;
/**
 * The shortest time "Updating Your Subscription…" shows. Once the store has been asked after its screen closed and nothing
 * changed (most often the screen was closed as it was), the box closes after this, so it never flashes and never stays.
 */
export const SETTLE_MS = 1_500;
/** How long the box says what changed before it closes by itself. */
export const UPDATED_MS = 2_200;
/** How long the calm line may wait. Past this (also after Done with nothing changed) it goes, so it never stays for good. */
export const UNCONFIRMED_MS = 15 * 60_000;

/**
 * The page state "Updating…" was waiting to change from, when the store still hadn't confirmed after UPDATING_MS. Kept outside
 * the page so that leaving Settings and coming back still shows the calm line and asks the store again. Null when nothing waits.
 */
let unconfirmedFrom: string | null = null;
let unconfirmedAt = 0;
/** True while the page listens for a late change without showing the calm line (the store found nothing changed). */
let unconfirmedQuiet = false;
/** The waiting state if it is still fresh; an old one is dropped. */
const stillUnconfirmed = () => {
  if (unconfirmedFrom !== null && Date.now() - unconfirmedAt > UNCONFIRMED_MS) unconfirmedFrom = null;
  return unconfirmedFrom;
};

/**
 * The store's manage screen and what follows it: "Updating Your Subscription…" from the moment the screen closes until
 * what the person changed there shows (or 20 seconds), then "You're All Set!" or "Subscription Updated" (`describe` says
 * which), or a calm line that waits on for a late answer. Only what the sheet can change counts (the tier, auto-renew,
 * the plan, a booked switch): a fresher end date alone used to close the loader early. Store actions run one at a time.
 */
export function useManage(sub: SubscriptionState, ending: boolean, describe: () => UpdatingDone, fail: (e: unknown) => void) {
  const stateKey = JSON.stringify([sub.tier, ending, sub.renewal?.productId ?? null, sub.pendingSwitch?.planId ?? null]);
  const stateNow = useRef(stateKey);
  stateNow.current = stateKey;
  const [updatingFrom, setUpdatingFrom] = useState<string | null>(null);
  const [updated, setUpdated] = useState<UpdatingDone | null>(null);
  // After "Updating…" gave up waiting: a calm line until the store shows the change. Survives leaving the page.
  const [waitingFrom, setWaitingFrom] = useState<string | null>(() => (stillUnconfirmed() === stateKey ? stateKey : null));
  // Listening without the calm line: the store was asked after its screen closed and nothing had changed.
  const [quiet, setQuiet] = useState(() => unconfirmedQuiet);
  // Guards that read now, not at the last render: two quick taps never start two store calls.
  const storeBusy = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** Runs one store action at a time (the manage sheet, a purchase); a tap while one runs is ignored. */
  const oneAtATime = (job: () => Promise<unknown>) => {
    if (storeBusy.current) return;
    storeBusy.current = true;
    void job().catch(fail).finally(() => {
      storeBusy.current = false;
    });
  };
  const confirmed = () => setUpdated(describe());

  // Opening the page while a change is still unconfirmed asks the store again. If it changed while the page was closed, the line just goes.
  useEffect(() => {
    if (stillUnconfirmed() === null) return;
    if (unconfirmedFrom !== stateNow.current) unconfirmedFrom = null;
    else void sub.refresh().catch(fail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The box waits for the change (or 20 seconds). With no answer by then, the calm line takes over and waits on.
  useEffect(() => {
    if (updatingFrom === null) return;
    if (stateKey !== updatingFrom) {
      setUpdatingFrom(null);
      confirmed();
      return;
    }
    const t = setTimeout(() => {
      // Already closed quietly: the store answered and nothing had changed.
      if (unconfirmedQuiet && unconfirmedFrom === updatingFrom) return;
      unconfirmedFrom = updatingFrom;
      unconfirmedAt = Date.now();
      unconfirmedQuiet = false;
      setQuiet(false);
      setWaitingFrom(updatingFrom);
      setUpdatingFrom(null);
    }, UPDATING_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatingFrom, stateKey]);
  // The line never stays for good: it goes once UNCONFIRMED_MS has passed, even with the page open.
  useEffect(() => {
    if (waitingFrom === null) return;
    const t = setTimeout(() => { if (stillUnconfirmed() === null) setWaitingFrom(null); }, Math.max(0, unconfirmedAt + UNCONFIRMED_MS - Date.now()) + 50);
    return () => clearTimeout(t);
  }, [waitingFrom]);
  // A late answer still ends with "You're All Set!" or "Subscription Updated", and the calm line goes.
  useEffect(() => {
    if (waitingFrom === null || stateKey === waitingFrom) return;
    unconfirmedFrom = null;
    setWaitingFrom(null);
    confirmed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingFrom, stateKey]);
  useEffect(() => {
    if (!updated) return;
    const t = setTimeout(() => setUpdated(null), UPDATED_MS);
    return () => clearTimeout(t);
  }, [updated]);

  const manage = () =>
    oneAtATime(async () => {
      const before = stateNow.current;
      // "Updating…" from the moment the store's screen closes, unless the change is already here. 4.0.0: shown in every app, since a
      // page that stayed still and then changed by itself left people unsure what happened.
      let shownAt = 0;
      const wait = () => {
        if (!alive.current || shownAt || stateNow.current !== before) return;
        shownAt = Date.now();
        unconfirmedFrom = null;
        unconfirmedQuiet = false;
        setQuiet(false);
        setWaitingFrom(null);
        setUpdatingFrom(before);
      };
      // openManage returns once the store has been asked again after its screen closed (Apple's sheet, or the person's return
      // from the store's page).
      await sub.openManage(wait);
      wait(); // app-payments-kit before 2.5.0 does not say when the screen closed
      // A change shows here: the page and "You're All Set!" or "Subscription Updated" change together (the effect above).
      // Nothing changed: most often the screen was closed as it was. After SETTLE_MS the box closes quietly, and the page keeps
      // listening for 15 minutes, so a change the store passes on late still ends with the usual confirmation.
      await new Promise((r) => setTimeout(r, Math.max(0, shownAt + SETTLE_MS - Date.now())));
      if (!alive.current || stateNow.current !== before) return;
      // The store took longer than UPDATING_MS to answer: the calm line has already taken over and stays.
      if (unconfirmedFrom === before && !unconfirmedQuiet) return;
      unconfirmedFrom = before;
      unconfirmedAt = Date.now();
      unconfirmedQuiet = true;
      setQuiet(true);
      setWaitingFrom(before);
      setUpdatingFrom(null);
    });

  const closeBox = () => {
    setUpdatingFrom(null);
    setUpdated(null);
  };
  return { updating: updatingFrom !== null, updated, waiting: waitingFrom !== null && !quiet, manage, oneAtATime, closeBox };
}
