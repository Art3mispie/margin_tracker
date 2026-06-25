import { Audio } from 'expo-av';

// Small, fail-safe SFX manager. Sounds are a finishing touch — every call
// swallows errors and respects the user's preference and the device mute switch.

type SoundName = 'complete' | 'save' | 'archive';

const sources: Record<SoundName, number> = {
  complete: require('../assets/sfx/complete.wav'),
  save: require('../assets/sfx/save.wav'),
  archive: require('../assets/sfx/archive.wav'),
};

const players: Partial<Record<SoundName, Audio.Sound>> = {};
let enabled = true;
let loading = false;
let loaded = false;

export const setSoundEnabled = (v: boolean) => {
  enabled = v;
};

/** Preload all effects once, near app start. Safe to call more than once. */
export async function loadSounds(): Promise<void> {
  if (loaded || loading) return;
  loading = true;
  try {
    // Don't override the silent switch — SFX are non-essential.
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: false });
    await Promise.all(
      (Object.keys(sources) as SoundName[]).map(async name => {
        try {
          const { sound } = await Audio.Sound.createAsync(sources[name], {
            volume: 0.55,
          });
          players[name] = sound;
        } catch {
          // Skip any sound that fails to load.
        }
      })
    );
    loaded = true;
  } catch {
    // Audio unavailable — the app simply runs without sound.
  } finally {
    loading = false;
  }
}

/** Fire-and-forget; replays from the start even if already playing. */
export function playSound(name: SoundName): void {
  if (!enabled) return;
  const s = players[name];
  if (!s) return;
  s.replayAsync().catch(() => {});
}
