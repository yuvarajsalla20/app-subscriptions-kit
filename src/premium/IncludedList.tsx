import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import type { PremiumFeature } from './PremiumPage';
import { cardStyle, Heading, lineStyle, type Look } from './parts';

/**
 * Included With Premium. 5.0.0: plan facts only. A subscriber sees every feature the plan includes, each with a check;
 * nothing here switches or edits a setting. Features whose settings live in Preferences are named in one line under the
 * card. 7.0.0 Page rule: a switch or an editor passed here is refused and named in development.
 */
export function IncludedList({ look, features, tierLabel, show }: { look: Look; features: readonly PremiumFeature[]; tierLabel: string; show: boolean }) {
  const { c, s, Text } = look;
  const inPrefs = features.filter((f) => f.inPreferences).map((f) => f.label);
  const refused = features.filter((f) => 'toggle' in f || 'children' in f).map((f) => f.label).join(', ');
  useEffect(() => {
    if (refused && typeof __DEV__ !== 'undefined' && __DEV__) console.warn(`app-subscriptions-kit: ${refused} passed a switch or an editor to the Premium page, which shows plan facts only (Page rule). Put it in Preferences and set inPreferences.`);
  }, [refused]);
  if (!show || !features.length) return null;
  const rowStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingVertical: 8, paddingHorizontal: 16, minHeight: 52 };
  return (
    <>
      <Heading look={look} text={s.includedWith(tierLabel)} />
      <View style={{ gap: 6 }}>
        <View style={cardStyle(c)}>
          {features.map((f, i) => {
            const inner = (
              <>
                {f.icon ?? null}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{f.label}</Text>
                  {f.detail ? <Text style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{f.detail}</Text> : null}
                </View>
                <Text style={{ color: f.onPress ? c.muted : c.accent, fontSize: f.onPress ? 20 : 17, fontWeight: '800' }} accessibilityElementsHidden importantForAccessibility="no">{f.onPress ? '›' : '✓'}</Text>
              </>
            );
            const said = [f.label, f.detail, s.included].filter(Boolean).join('. ');
            return f.onPress ? (
              <Pressable key={f.key} onPress={f.onPress} accessibilityRole="button" accessibilityLabel={said} accessibilityHint={s.opensPage} style={({ pressed }) => [rowStyle, i ? lineStyle(c) : null, pressed ? { opacity: 0.6 } : null]}>
                {inner}
              </Pressable>
            ) : (
              <View key={f.key} accessible accessibilityLabel={said} style={[rowStyle, i ? lineStyle(c) : null]}>{inner}</View>
            );
          })}
        </View>
        {inPrefs.length ? <Text style={{ color: c.muted, fontSize: 13, lineHeight: 18, marginHorizontal: 16 }}>{s.setInPreferences(inPrefs)}</Text> : null}
      </View>
    </>
  );
}
