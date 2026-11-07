import { Pressable, Switch, View } from 'react-native';
import { PremiumPill } from './badges';
import { useLook, type LookProps } from './look';
import { useSubscription } from './SubscriptionProvider';

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
  const { config, server } = sub;
  const until = server?.activeUntil ?? null;
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
            {until ? row(server?.willRenew === false ? s.ends : s.renews, day(until)) : null}
            {row(s.manage, '›', () => void sub.openManage())}
          </>
        ) : (
          row(s.upgrade(config.tierLabels[config.tiers[1]!]!), '›', onOpenPlans)
        )}
        {sub.canRedeemCode && row(s.haveCode, '›', () => void sub.redeemCode(''))}
        {row(s.restore, '›', () => void sub.restore())}
      </View>
      {server?.status === 'grace' && (
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
