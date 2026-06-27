import type { ThemeKey } from './types';

// React Native does NOT synthesize weight from a named font file: setting
// `fontWeight: '600'` on top of `fontFamily: 'HankenGrotesk_400Regular'` is
// ignored and renders at 400. These helpers return the *actual* loaded family
// for a given weight, so the design's typography lands correctly.

export type UIWeight = 400 | 500 | 600 | 700;
export type DispWeight = 400 | 500 | 600;

/** UI / body font — Hanken Grotesk across every theme. */
export function ui(weight: UIWeight = 400): string {
  switch (weight) {
    case 700:
      return 'HankenGrotesk_700Bold';
    case 600:
      return 'HankenGrotesk_600SemiBold';
    case 500:
      return 'HankenGrotesk_500Medium';
    default:
      return 'HankenGrotesk_400Regular';
  }
}

/**
 * Display / heading font — theme dependent:
 *  paper → Newsreader (editorial serif), cool → Hanken Grotesk, mono → JetBrains Mono.
 */
export function disp(theme: ThemeKey, weight: DispWeight = 400): string {
  if (theme === 'cool') {
    // Hanken-based display; lift regular to medium so headings keep presence.
    return ui(weight === 400 ? 500 : (weight as UIWeight));
  }
  if (theme === 'mono') {
    return weight >= 500 ? 'JetBrainsMono_500Medium' : 'JetBrainsMono_400Regular';
  }
  switch (weight) {
    case 600:
      return 'Newsreader_600SemiBold';
    case 500:
      return 'Newsreader_500Medium';
    default:
      return 'Newsreader_400Regular';
  }
}

/** Italic display — used for the wordmark and a few editorial accents. */
export function dispItalic(theme: ThemeKey): string {
  if (theme === 'paper') return 'Newsreader_400Regular_Italic';
  return ui(500);
}
