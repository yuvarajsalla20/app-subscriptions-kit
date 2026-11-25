import type { ComponentProps, ComponentType } from 'react';
import type { Text as RNText } from 'react-native';

/** Colors the screens use. Pass only what differs. The default is the gold Premium look. */
export interface SubscriptionTheme {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  /** Links and the selected plan. */
  accent: string;
  /** Text on the accent color. */
  onAccent: string;
  /** The Premium pill, lock badges and highlighted rows. */
  premium: string;
  onPremium: string;
  premiumSoft: string;
  /** Messages: success and problem backgrounds. */
  good: string;
  warn: string;
  radius: number;
  /** The main button (defaults to the accent). */
  button?: string;
  onButton?: string;
  /** A CSS box-shadow for cards. Set it and cards drop their outline and float instead (a flat outline when empty). */
  shadow?: string;
  /** The Cancel Subscription button and Continue to Cancel. */
  danger?: string;
  onDanger?: string;
  /** The default Premium mark, a king and a queen crown: outline and fill of each. */
  king?: string;
  kingFill?: string;
  queen?: string;
  queenFill?: string;
  /** The words on the plan pill (Settings' Premium row). Default: the premium color. */
  premiumText?: string;
  /** The dark box shown while a subscription change is confirmed, and the words on it. */
  hud?: string;
  onHud?: string;
  /** The ring and dots on that box. Default: the premium color. */
  hudAccent?: string;
  /** The confetti colors when a change is confirmed. */
  confetti?: readonly string[];
  /** Good news on the Premium page (Restore found it, the Save tag): the words, the soft row behind them, and text on a solid tag. */
  success?: string;
  successSoft?: string;
  onTag?: string;
  /** Neutral news (Restore found nothing): the words, the soft row, and the round badge. */
  info?: string;
  infoSoft?: string;
  infoBadge?: string;
  /** A problem (Restore could not reach the store): the soft row and the round badge, with the danger color. */
  dangerSoft?: string;
  dangerBadge?: string;
  /** The floating crown's gold, light to deep (4.0.0). Default: the gold of the Premium tag. */
  crown?: readonly [string, string, string];
}

export const DEFAULT_THEME: SubscriptionTheme = {
  bg: '#F5F7FB',
  surface: '#FFFFFF',
  border: '#E1E6F0',
  text: '#14213D',
  muted: '#5B6687',
  accent: '#14213D',
  onAccent: '#FFFFFF',
  premium: '#FFC23D',
  onPremium: '#3A2700',
  premiumSoft: '#FFF6DD',
  good: '#E9F7EF',
  warn: '#FFF1E6',
  radius: 14,
  danger: '#B42318',
  onDanger: '#FFFFFF',
  king: '#B45309',
  kingFill: '#FCD34D',
  queen: '#BE185D',
  queenFill: '#FBCFE8',
  hud: '#14213D',
  onHud: '#FFFFFF',
  hudAccent: '#FFC23D',
  confetti: ['#4FD1C0', '#FB923C', '#A78BFA', '#FBBF24', '#F472B6'],
  success: '#15803D',
  successSoft: '#F0FDF4',
  onTag: '#FFFFFF',
  info: '#0369A1',
  infoSoft: '#F0F9FF',
  infoBadge: '#E0F2FE',
  dangerSoft: '#FEF3F2',
  dangerBadge: '#FDE7E5',
};

/** Where the person's purchases live, for the Restore and Updating words. */
export type StorePlatform = 'ios' | 'android' | 'web';

/** The app's own Text component, so the screens use its fonts. Plain React Native Text is the default. */
export interface SubscriptionComponents {
  Text: ComponentType<ComponentProps<typeof RNText>>;
}

export type { SubscriptionStrings } from './stringTypes';
export { DEFAULT_STRINGS } from './strings';
