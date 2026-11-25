import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator } from 'react-native';
import type { SubscriptionState } from '../subscription/SubscriptionProvider';
import { Badge, PageRow, statusColors, type Look } from './parts';

/** How long "You're All Set" or "No Purchases Found" stays before the hint comes back. */
export const RESTORE_NOTE_MS = 4000;

export type RestoreState = 'idle' | 'checking' | 'allSet' | 'done' | 'none' | 'failed';

/**
 * Restore Subscription: always tappable, and it always answers. A second tap while the store is asked is ignored; the
 * answer is announced to VoiceOver, and a good answer goes back to the hint after RESTORE_NOTE_MS.
 */
export function useRestore(look: Look, sub: SubscriptionState, words: { tierLabel: string; store: string; account: string }, fail: (e: unknown) => void) {
  const { s } = look;
  const [state, setState] = useState<RestoreState>('idle');
  const busy = useRef(false);
  const alive = useRef(true);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (noteTimer.current) clearTimeout(noteTimer.current);
    };
  }, []);

  const restore = async () => {
    if (busy.current) return;
    busy.current = true;
    if (noteTimer.current) clearTimeout(noteTimer.current);
    const wasPaid = sub.paid;
    setState('checking');
    let next: RestoreState;
    try {
      const r = await sub.restore();
      if (r.ok) next = sub.config.tiers.indexOf(r.tier) > 0 ? (wasPaid ? 'allSet' : 'done') : 'none';
      else if (r.cancelled) next = 'idle';
      else {
        next = 'failed';
        fail(new Error(r.message));
      }
    } catch (e) {
      next = 'failed';
      fail(e);
    }
    busy.current = false;
    if (!alive.current) return;
    setState(next);
    const said =
      next === 'allSet' ? s.restoreAllSet(words.tierLabel, words.account)
      : next === 'done' ? s.restoreDone(words.tierLabel)
      : next === 'none' ? s.restoreNone(words.account)
      : next === 'failed' ? s.restoreFailed(words.store)
      : '';
    if (said) AccessibilityInfo.announceForAccessibility?.(said);
    if (next === 'allSet' || next === 'done' || next === 'none') noteTimer.current = setTimeout(() => { if (alive.current) setState('idle'); }, RESTORE_NOTE_MS);
  };
  return { state, restore };
}

/** The Restore Subscription row, which shows the last answer in place of its hint. */
export function RestoreRow({ look, state, onPress, paid, words, first = false }: { look: Look; state: RestoreState; onPress: () => void; paid: boolean; words: { tierLabel: string; store: string; account: string }; first?: boolean }) {
  const { c, s } = look;
  const k = statusColors(c);
  const base = { look, label: s.restoreSubscription, onPress, first };
  switch (state) {
    case 'checking':
      return <PageRow {...base} detail={s.restoreChecking(words.store)} detailColor={c.accent} end={<ActivityIndicator color={c.accent} />} busy />;
    case 'allSet':
      return <PageRow {...base} detail={s.restoreAllSet(words.tierLabel, words.account)} detailColor={k.success} bold end={<Badge look={look} bg={k.success} fg={k.onTag} glyph="✓" />} tint={k.successSoft} />;
    case 'done':
      return <PageRow {...base} detail={s.restoreDone(words.tierLabel)} detailColor={k.success} bold end={<Badge look={look} bg={k.success} fg={k.onTag} glyph="✓" />} tint={k.successSoft} />;
    case 'none':
      return <PageRow {...base} detail={s.restoreNone(words.account)} detailColor={k.info} bold end={<Badge look={look} bg={k.infoBadge} fg={k.info} glyph="i" />} tint={k.infoSoft} />;
    case 'failed':
      return <PageRow {...base} detail={s.restoreFailed(words.store)} detailColor={k.danger} bold end={<Badge look={look} bg={k.dangerBadge} fg={k.danger} glyph="!" />} tint={k.dangerSoft} />;
    default:
      return <PageRow {...base} detail={paid ? s.restoreHintPaid(words.tierLabel) : s.restoreHint} />;
  }
}
