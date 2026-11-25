import type { PlanConfig } from './define';
import type { StorePlan } from './payments';
import type { PendingSwitch } from './pendingSwitch';
import { shortDay } from './status';

/** A plan of the shown tier, with the store's price for it. */
export interface ShownPlan {
  cfg: PlanConfig;
  sp: StorePlan;
}

export interface PlanChoiceInput {
  /** The tab's plans that the store (or the preview) has a price for. */
  shown: ShownPlan[];
  /** True when the account already has this tab's tier (or a higher one). */
  has: boolean;
  /** The plan id the account pays for now, only on the tab of the tier it has. */
  currentId: string | null | undefined;
  pendingSwitch: PendingSwitch | null;
  /** The row the person tapped, if any. */
  pick: string | null;
  canSwitchTo?: (from: StorePlan, to: StorePlan) => boolean;
  /** True when the app takes switches here (`onSwitch` is given and nothing blocks it). */
  switchOffered: boolean;
}

/** Which row is current, booked next and chosen on the Plans screen, and whether the button switches plans. */
export function choosePlan({ shown, has, currentId, pendingSwitch, pick, canSwitchTo, switchOffered }: PlanChoiceInput) {
  // The row the account pays for now.
  const current = has && currentId ? shown.find((x) => x.cfg.id === currentId) ?? null : null;
  // The plans a subscriber may move to: the same tier's others, narrowed by the app (e.g., longer plans only).
  const targets = current ? shown.filter((x) => x.cfg.id !== current.cfg.id && (!canSwitchTo || canSwitchTo(current.sp, x.sp))) : [];
  // A switch already booked for the next renewal: that plan shows next and nothing can be switched again until it starts.
  const pending = current && pendingSwitch && pendingSwitch.planId !== current.cfg.id ? shown.find((x) => x.cfg.id === pendingSwitch.planId) ?? null : null;
  const pendingDay = pending && pendingSwitch ? shortDay(pendingSwitch.startsAt) : '';
  const canSwitch = !pending && !!current && switchOffered && targets.length > 0;
  // While switching is offered, the current plan can't be picked and the best allowed plan is picked to start with.
  const others = canSwitch ? targets : shown;
  // With a switch booked, the plan in use stays the one marked; nothing else can be picked until the switch starts.
  const chosen = (pending ? current : null) ?? shown.find((x) => x.cfg.id === pick && !(canSwitch && x.cfg.id === current?.cfg.id))
    // A subscriber whose plan the store hasn't named yet sees no row picked: never a plan they don't pay for.
    ?? (canSwitch ? others.find((x) => x.cfg.badge) ?? others.find((x) => x.cfg.selected) ?? others[0] : has ? current : shown.find((x) => x.cfg.selected) ?? shown[0]);
  const switching = canSwitch && !!chosen && !!current && chosen.cfg.id !== current.cfg.id;
  return { has, current, targets, pending, pendingDay, canSwitch, chosen: chosen ?? null, switching };
}
