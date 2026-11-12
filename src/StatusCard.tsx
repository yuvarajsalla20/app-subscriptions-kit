import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Diamond, useLook, type LookProps } from './look';
import { statusLines } from './status';
import { useSubscription } from './SubscriptionProvider';

/**
 * The top of an app's Premium page once the account has paid: "You have Premium", the plan, and when it renews or,
 * after a cancel, when it ends ("You keep it until then"). Shows nothing for a free account.
 */
export function SubscriptionStatusCard({ icon, ...look }: LookProps & { icon?: ReactNode }) {
  const { c, s, Text } = useLook(look);
  const sub = useSubscription();
  if (!sub.paid) return null;
  const l = statusLines({ tierLabel: sub.tierLabel, server: sub.server, renewal: sub.renewal, plans: sub.config.plans, strings: s, now: new Date() });
  return (
    <View
      accessible
      accessibilityLabel={[l.title, l.plan, l.when, l.note].filter(Boolean).join('. ')}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: c.radius + 8, backgroundColor: c.premiumSoft, borderWidth: 1, borderColor: c.premium }}
    >
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
        {icon ?? <Diamond color={c.premium} fill={c.premiumSoft} size={26} />}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: c.text, fontSize: 18, fontWeight: '800' }}>{l.title}</Text>
        {l.when ? <Text style={{ color: l.ending ? c.premium : c.accent, fontSize: 14, fontWeight: '700' }}>{l.when}</Text> : null}
        {l.plan ? <Text style={{ color: c.muted, fontSize: 13 }}>{l.plan}</Text> : null}
        {l.note ? <Text style={{ color: c.muted, fontSize: 13 }}>{l.note}</Text> : null}
      </View>
    </View>
  );
}
