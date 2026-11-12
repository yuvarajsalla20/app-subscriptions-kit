import { View } from 'react-native';
import { Crowns, useLook, type LookProps } from './look';
import { useSubscription } from './SubscriptionProvider';

const TICK = '✓';
const NONE = '–';

/**
 * Free vs paid tiers, one column per tier. The paid columns are tinted and carry a crown; what a paid tier adds shows as a
 * solid tick or a bold number pill, so the eye lands there first. Rows the same in every tier are quieter. A row's `icon`
 * shows before its label.
 */
export function CompareTable(look: LookProps) {
  const { c, s, Text } = useLook(look);
  const { config, tier } = useSubscription();
  const rows = config.compare;
  if (!rows.length) return null;
  const tiers = config.tiers;
  const paidCol = (t: string) => t !== 'free';
  const extra = (r: (typeof rows)[number]) => tiers.some((t) => paidCol(t) && r.values[t] !== r.values.free);
  const tint = c.premiumSoft;
  const crowns = { king: c.king, kingFill: c.kingFill, queen: c.queen, queenFill: c.queenFill };

  const cell = (r: (typeof rows)[number], t: string) => {
    const v = r.values[t] ?? NONE;
    const gain = paidCol(t) && v !== r.values.free;
    if (v === NONE) return <Text style={{ fontSize: 15, color: c.muted }}>{NONE}</Text>;
    if (gain && v === TICK) {
      return (
        <View accessible accessibilityLabel={s.included} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: c.onAccent, fontSize: 13, fontWeight: '900' }}>{TICK}</Text>
        </View>
      );
    }
    if (gain) {
      return (
        <View style={{ minWidth: 30, height: 26, paddingHorizontal: 9, borderRadius: 13, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: c.onAccent, fontSize: 15, fontWeight: '800' }}>{v}</Text>
        </View>
      );
    }
    return <Text style={{ fontSize: 14, fontWeight: paidCol(t) ? '700' : '600', color: paidCol(t) ? c.accent : c.muted }}>{v}</Text>;
  };

  return (
    <View style={[{ backgroundColor: c.surface, borderRadius: c.radius, overflow: 'hidden' }, c.shadow ? { boxShadow: c.shadow } : { borderColor: c.border, borderWidth: 1 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'stretch', paddingLeft: 14, minHeight: 40 }}>
        <View style={{ flex: 1.6, justifyContent: 'center' }}><Text style={{ fontSize: 12, fontWeight: '700', color: c.muted }}>{s.feature.toUpperCase()}</Text></View>
        {tiers.map((t) => (
          <View key={t} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 6, backgroundColor: paidCol(t) ? tint : undefined }}>
            {t === tier ? <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.4, color: c.onAccent, backgroundColor: c.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' }}>{s.current.toUpperCase()}</Text> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {paidCol(t) ? <Crowns size={11} {...crowns} /> : null}
              <Text style={{ fontSize: 12, fontWeight: '800', color: c.text }}>{(config.tierLabels[t] ?? t).toUpperCase()}</Text>
            </View>
          </View>
        ))}
      </View>
      {rows.map((r) => {
        const big = extra(r);
        return (
          <View key={r.label} style={{ flexDirection: 'row', alignItems: 'stretch', paddingLeft: 14, minHeight: big ? 44 : 40, borderTopWidth: 1, borderTopColor: c.border }}>
            <View style={{ flex: 1.6, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
              {r.icon ?? null}
              <Text style={{ flex: 1, fontSize: big ? 14 : 13, color: big ? c.text : c.muted, fontWeight: big ? '700' : '500' }}>{r.label}</Text>
            </View>
            {tiers.map((t) => (
              <View key={t} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: paidCol(t) ? tint : undefined }}>{cell(r, t)}</View>
            ))}
          </View>
        );
      })}
    </View>
  );
}
