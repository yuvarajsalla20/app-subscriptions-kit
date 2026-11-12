import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Crowns, useLook, type LookProps } from './look';
import { shortDay, statusLines } from './status';
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
  // A switch that starts at renewal: "Switching to Yearly on Dec 12" under the plan, until the store shows it.
  const next = sub.pendingSwitch ? sub.config.plans.find((p) => p.id === sub.pendingSwitch!.planId)?.label : undefined;
  const switching = next ? s.switchingTo(next, shortDay(sub.pendingSwitch!.startsAt)) : '';
  return (
    <View
      accessible
      accessibilityLabel={[l.title, l.plan, switching, l.when, l.note].filter(Boolean).join('. ')}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: c.radius + 8, backgroundColor: c.premiumSoft, borderWidth: 1, borderColor: c.premium }}
    >
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
        {icon ?? <Crowns size={20} king={c.king} kingFill={c.kingFill} queen={c.queen} queenFill={c.queenFill} />}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: c.text, fontSize: 18, fontWeight: '800' }}>{l.title}</Text>
        {l.when ? <Text style={{ color: l.ending ? c.premium : c.accent, fontSize: 14, fontWeight: '700' }}>{l.when}</Text> : null}
        {l.plan ? <Text style={{ color: c.muted, fontSize: 13 }}>{l.plan}</Text> : null}
        {switching ? (
          <View style={{ alignSelf: 'flex-start', marginTop: 6, backgroundColor: c.surface, borderColor: c.premium, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: c.accent, fontSize: 12.5, fontWeight: '700' }}>{`→ ${switching}`}</Text>
          </View>
        ) : null}
        {l.note ? <Text style={{ color: c.muted, fontSize: 13 }}>{l.note}</Text> : null}
      </View>
    </View>
  );
}
