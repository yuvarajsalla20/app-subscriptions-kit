import { useEffect, useRef, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { PremiumPill } from './badges';
import { useLook, type LookProps } from '../look';
import { rank } from '../subscription/rules';
import { subscriptionTerms } from '../subscription/status';
import { useSubscription } from '../subscription/SubscriptionProvider';
import type { PurchaseResult } from '../subscription/payments';

/** Formats a date for the Renews / Ends line. */
const day = (iso: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
};

/**
 * The subscription section for a Settings screen (fits app-account-kit's App slot): tier, renew or end date,
 * manage, redeem a code, restore, a payment-problem note, and the developer-only tester switch.
 */
export function SubscriptionRow({ onOpenPlans, ...look }: LookProps & { onOpenPlans: () => void }) {
  const { c, s, Text } = useLook(look);
  const sub = useSubscription();
  const { config, server, renewal } = sub;
  // The same rule as the status card: the server row only while it gives the tier, else the store; no date already past.
  const terms = subscriptionTerms({ server, renewal, source: sub.source });
  const until = terms.until;
  const ends = terms.ending;
  // What Restore, Have a Code? or Manage came back with, shown under the card like the Plans screen does.
  const [note, setNote] = useState<{ text: string; good: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const say = (n: { text: string; good: boolean } | null) => { if (alive.current) setNote(n); };
  const restore = async () => {
    if (busy) return;
    if (!sub.ready) return say({ text: s.notOpenYet, good: false });
    setBusy(true);
    say(null);
    try {
      const r: PurchaseResult = await sub.restore();
      if (r.ok) say(rank(config, r.tier) > 0 ? { text: s.restored(config.tierLabels[r.tier] ?? r.tier), good: true } : { text: s.nothingToRestore, good: false });
      else if (!r.cancelled) say({ text: r.message, good: false });
    } catch {
      say({ text: s.pricesFailed, good: false });
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  /** Manage and Have a Code? only open the store's own screen; a failure to open it still says so. */
  const open = (job: () => Promise<void>) => () => {
    say(null);
    job().catch(() => say({ text: s.pricesFailed, good: false }));
  };
  const row = (label: string, right: string, onPress?: () => void) => (
    <Pressable key={label} accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress} onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, borderTopWidth: 1, borderTopColor: c.border }}>
      <Text style={{ flex: 1, color: c.text, fontWeight: '600', fontSize: 15 }}>{label}</Text>
      <Text style={{ color: c.muted, fontSize: 15 }}>{right}</Text>
    </Pressable>
  );
  return (
    <View style={{ gap: 10 }}>
      <View style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: c.radius, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 8 }}>
          <Text style={{ flex: 1, color: c.text, fontWeight: '800', fontSize: 16 }}>{s.subscription}</Text>
          {sub.paid ? <PremiumPill tier={sub.tier} {...look} /> : <Text style={{ color: c.muted }}>{s.free}</Text>}
        </View>
        {sub.paid ? (
          <>
            {row(s.plan, sub.tierLabel)}
            {until ? row(ends ? s.ends : s.renews, day(until)) : null}
            {row(s.manage, '›', open(() => sub.openManage()))}
          </>
        ) : (
          row(s.upgrade(config.tierLabels[config.tiers[1]!]!), '›', onOpenPlans)
        )}
        {sub.canRedeemCode && row(s.haveCode, '›', open(() => sub.redeemCode('')))}
        {row(s.restore, busy ? s.restoring : '›', () => void restore())}
      </View>
      {note ? (
        <View accessibilityLiveRegion="polite" style={{ backgroundColor: note.good ? c.good : c.warn, borderRadius: c.radius, padding: 12 }}>
          <Text style={{ color: c.text, fontSize: 14 }}>{note.text}</Text>
        </View>
      ) : null}
      {terms.billingIssue && (
        <View accessibilityLiveRegion="polite" style={{ backgroundColor: c.warn, borderRadius: c.radius, padding: 12 }}>
          <Text style={{ color: c.text, fontSize: 14 }}>{s.graceNote}</Text>
        </View>
      )}
      {sub.tester.available && (
        <View style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: c.muted, borderRadius: c.radius, padding: 12, gap: 6 }}>
          <Text style={{ color: c.muted, fontSize: 12, fontWeight: '800' }}>{s.developerOnly}</Text>
          {config.tiers.slice(1).map((t) => (
            <View key={t} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44 }}>
              <Text style={{ flex: 1, color: c.text, fontWeight: '600' }}>{`${s.pretend} ${config.tierLabels[t]}`}</Text>
              <Switch accessibilityLabel={`${s.pretend} ${config.tierLabels[t]}`} value={sub.tester.tier === t} onValueChange={(on) => void sub.tester.set(on ? t : null)} />
            </View>
          ))}
          <Text style={{ color: c.muted, fontSize: 12 }}>{s.pretendNote}</Text>
        </View>
      )}
    </View>
  );
}
