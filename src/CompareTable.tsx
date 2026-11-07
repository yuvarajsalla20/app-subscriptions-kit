import { View } from 'react-native';
import { useLook, type LookProps } from './look';
import { useSubscription } from './SubscriptionProvider';

/** Free vs paid tiers, one column per tier. Rows where a paid tier differs from Free are highlighted. */
export function CompareTable(look: LookProps) {
  const { c, Text } = useLook(look);
  const { config } = useSubscription();
  const rows = config.compare;
  if (!rows.length) return null;
  const tiers = config.tiers;
  const extra = (r: (typeof rows)[number]) => tiers.some((t) => t !== 'free' && r.values[t] !== r.values.free);
  return (
    <View style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: c.radius, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, gap: 8, backgroundColor: c.premiumSoft }}>
        <Text style={{ flex: 1.6 }}> </Text>
        {tiers.map((t) => (
          <Text key={t} style={{ flex: 1, textAlign: 'center', fontWeight: '800', color: c.text }}>{config.tierLabels[t]}</Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderTopWidth: i ? 1 : 0, borderTopColor: c.border, backgroundColor: extra(r) ? c.premiumSoft : c.surface }}>
          <Text style={{ flex: 1.6, fontSize: 14, color: c.text, fontWeight: extra(r) ? '700' : '400' }}>{r.label}</Text>
          {tiers.map((t) => (
            <Text key={t} style={{ flex: 1, fontSize: 13, textAlign: 'center', color: r.values[t] === '–' ? c.muted : c.text, fontWeight: t !== 'free' ? '700' : '400' }}>{r.values[t] ?? '–'}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}
