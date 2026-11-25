import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { useLook } from '../look';
import { DEFAULT_THEME } from '../theme';

/** The Premium page's look: colors, words and the app's Text. */
export type Look = ReturnType<typeof useLook>;

/** The status colors, each with the kit's default when the app's theme leaves it out. */
export const statusColors = (c: Look['c']) => ({
  danger: c.danger ?? DEFAULT_THEME.danger!,
  success: c.success ?? DEFAULT_THEME.success!,
  successSoft: c.successSoft ?? DEFAULT_THEME.successSoft!,
  onTag: c.onTag ?? DEFAULT_THEME.onTag!,
  info: c.info ?? DEFAULT_THEME.info!,
  infoSoft: c.infoSoft ?? DEFAULT_THEME.infoSoft!,
  infoBadge: c.infoBadge ?? DEFAULT_THEME.infoBadge!,
  dangerSoft: c.dangerSoft ?? DEFAULT_THEME.dangerSoft!,
  dangerBadge: c.dangerBadge ?? DEFAULT_THEME.dangerBadge!,
});

export const cardStyle = (c: Look['c']) => ({ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: c.radius, overflow: 'hidden' as const });
export const lineStyle = (c: Look['c']) => ({ borderTopWidth: 1, borderTopColor: c.border });

/** A date that never breaks across two lines ("Nov 15, 2026", not "Nov 15," then "2026"). */
export const keepTogether = (date: string) => date.replace(/ /g, ' ');

/** A small section title in capitals. */
export function Heading({ look, text }: { look: Look; text: string }) {
  const { c, Text } = look;
  return <Text style={{ color: c.muted, fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginHorizontal: 6, marginBottom: -6 }}>{text}</Text>;
}

/** A small filled label ("Save 17%"). */
export function Tag({ look, text, bg }: { look: Look; text: string; bg: string }) {
  const { c, Text } = look;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: statusColors(c).onTag, fontSize: 11, fontWeight: '800' }}>{text}</Text>
    </View>
  );
}

/** A round mark at the end of a row (✓, i, !). */
export function Badge({ look, bg, fg, glyph }: { look: Look; bg: string; fg: string; glyph: string }) {
  const { Text } = look;
  return (
    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: fg, fontSize: 13, fontWeight: '800' }}>{glyph}</Text>
    </View>
  );
}

export interface PageRowProps {
  look: Look;
  label: string;
  detail: string | null;
  onPress: () => void;
  right?: ReactNode;
  first?: boolean;
  detailColor?: string;
  bold?: boolean;
  /** Replaces the chevron at the end. */
  end?: ReactNode;
  tint?: string;
  busy?: boolean;
}

/** One row of a card: the label, a line under it, an optional mark, and a chevron. */
export function PageRow({ look, label, detail, onPress, right, first = false, detailColor, bold, end, tint, busy }: PageRowProps) {
  const { c, Text } = look;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={busy ? { busy: true } : undefined}
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      onPress={busy ? undefined : onPress}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingVertical: 8, paddingHorizontal: 16 },
        !first && lineStyle(c),
        tint ? { backgroundColor: tint } : null,
        pressed && !busy ? { opacity: 0.6 } : null,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontWeight: '600', fontSize: 16 }}>{label}</Text>
        {detail ? <Text style={{ color: detailColor ?? c.muted, fontSize: 13, fontWeight: bold ? '700' : '400', marginTop: 2 }}>{detail}</Text> : null}
      </View>
      {right ?? null}
      {end ?? <Text style={{ color: c.muted, fontSize: 18 }}>›</Text>}
    </Pressable>
  );
}

/** A large filled button with an optional second line. */
export function BigButton({ look, label, detail, bg, fg, onPress }: { look: Look; label: string; detail: string; bg: string; fg: string; onPress: () => void }) {
  const { c, Text } = look;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      onPress={onPress}
      style={{ minHeight: 62, borderRadius: c.radius + 8, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 18 }}
    >
      <Text style={{ color: fg, fontSize: 17, fontWeight: '800' }}>{label}</Text>
      {detail ? <Text style={{ color: fg, fontSize: 13, fontWeight: '600', opacity: 0.9, marginTop: 2 }}>{detail}</Text> : null}
    </Pressable>
  );
}
