import React, { useContext } from 'react';
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../AppContext';
import { useTheme, themes } from '../theme';
import { hapticSelect } from '../haptics';
import { playSound } from '../sound';
import { ensureNotificationPermission } from '../notifications';
import type { ThemeKey } from '../types';

const THEME_ORDER: ThemeKey[] = ['paper', 'cool', 'mono'];
const MORNING_TIMES = ['06:30', '07:00', '08:00', '09:00'];
const EVENING_TIMES = ['18:00', '20:00', '21:00', '22:00'];

export default function Settings() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = ctx;

  const archived = state.ideas.filter(i => i.archived);

  const cycleTime = (
    times: string[],
    current: string,
    type: 'SET_NOTIF_MORNING_TIME' | 'SET_NOTIF_EVENING_TIME'
  ) => {
    const next = times[(times.indexOf(current) + 1) % times.length];
    hapticSelect();
    ctx.dispatch({ type, time: next });
  };

  // Enabling a reminder requires OS permission — request it first and only flip
  // the toggle if granted (or when turning it off).
  const toggleNotif = async (
    enabling: boolean,
    toggle: () => void
  ) => {
    if (enabling) {
      const ok = await ensureNotificationPermission();
      if (!ok) {
        Alert.alert(
          'Notifications are off',
          'Turn on notifications for Margin in your device settings to get reminders.'
        );
        return;
      }
    }
    toggle();
  };

  const exportIdeas = async () => {
    const data = ctx.active().map(i => ({
      title: i.title,
      body: i.body,
      tags: i.tags,
      project: i.project,
      due: i.due,
      checklist: i.checklist,
      links: i.links,
      createdAt: i.createdAt,
    }));
    try {
      await Share.share({
        title: 'Margin ideas',
        message: JSON.stringify(data, null, 2),
      });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { fontFamily: theme.fdispFamily, color: theme.ink }]}>
        Settings
      </Text>

      {/* Appearance */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
          APPEARANCE
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          {THEME_ORDER.map((key, idx) => {
            const t = themes[key];
            const isActive = state.theme === key;
            const isLast = idx === THEME_ORDER.length - 1;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.themeRow,
                  !isLast && { borderBottomWidth: 1, borderBottomColor: theme.line },
                ]}
                onPress={() => { hapticSelect(); ctx.setTheme(key); }}
                activeOpacity={0.7}
              >
                {/* Swatch */}
                <View style={styles.swatchGroup}>
                  <View style={[styles.swatchMain, { backgroundColor: t.bg }]}>
                    <View style={[styles.swatchAccent, { backgroundColor: t.accent }]} />
                    <View style={[styles.swatchSky, { backgroundColor: t.sky }]} />
                  </View>
                </View>
                <View style={styles.themeInfo}>
                  <Text style={[styles.themeName, { fontFamily: theme.fuiFamily, color: theme.ink }]}>
                    {t.name}
                  </Text>
                  <Text style={[styles.themeDesc, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                    {t.desc}
                  </Text>
                </View>
                {isActive && (
                  <View style={[styles.checkmark, { backgroundColor: theme.accent }]}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
          NOTIFICATIONS
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.line }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { fontFamily: theme.fuiFamily, color: theme.ink }]}>
                Morning planning
              </Text>
              <Text style={[styles.settingDesc, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                Pick tasks for the day
              </Text>
            </View>
            <Switch
              value={state.notifMorning}
              onValueChange={v => toggleNotif(v, ctx.toggleNotifMorning)}
              trackColor={{ true: theme.accent, false: theme.line }}
            />
          </View>
          {state.notifMorning && (
            <TouchableOpacity
              style={[styles.timeRow, { borderBottomWidth: 1, borderBottomColor: theme.line }]}
              onPress={() => cycleTime(MORNING_TIMES, state.notifMorningTime, 'SET_NOTIF_MORNING_TIME')}
              activeOpacity={0.6}
            >
              <Text style={[styles.timeLabel, { fontFamily: theme.fuiFamily, color: theme.inkSoft }]}>
                Time
              </Text>
              <View style={styles.timeValueWrap}>
                <Text style={[styles.timeValue, { fontFamily: theme.fuiFamily, color: theme.accent }]}>
                  {state.notifMorningTime}
                </Text>
                <Text style={[styles.timeChevron, { color: theme.inkFaint }]}>›</Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.line }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { fontFamily: theme.fuiFamily, color: theme.ink }]}>
                Evening check-in
              </Text>
              <Text style={[styles.settingDesc, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                Check off what's done
              </Text>
            </View>
            <Switch
              value={state.notifEvening}
              onValueChange={v => toggleNotif(v, ctx.toggleNotifEvening)}
              trackColor={{ true: theme.accent, false: theme.line }}
            />
          </View>
          {state.notifEvening && (
            <TouchableOpacity
              style={[styles.timeRow, { borderBottomWidth: 1, borderBottomColor: theme.line }]}
              onPress={() => cycleTime(EVENING_TIMES, state.notifEveningTime, 'SET_NOTIF_EVENING_TIME')}
              activeOpacity={0.6}
            >
              <Text style={[styles.timeLabel, { fontFamily: theme.fuiFamily, color: theme.inkSoft }]}>
                Time
              </Text>
              <View style={styles.timeValueWrap}>
                <Text style={[styles.timeValue, { fontFamily: theme.fuiFamily, color: theme.accent }]}>
                  {state.notifEveningTime}
                </Text>
                <Text style={[styles.timeChevron, { color: theme.inkFaint }]}>›</Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { fontFamily: theme.fuiFamily, color: theme.ink }]}>
                Due date reminders
              </Text>
              <Text style={[styles.settingDesc, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                Get reminded when ideas are due
              </Text>
            </View>
            <Switch
              value={state.notifDue}
              onValueChange={v => toggleNotif(v, ctx.toggleNotifDue)}
              trackColor={{ true: theme.accent, false: theme.line }}
            />
          </View>
        </View>
      </View>

      {/* Feedback & motion */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
          FEEDBACK & MOTION
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.line }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { fontFamily: theme.fuiFamily, color: theme.ink }]}>
                Haptics
              </Text>
              <Text style={[styles.settingDesc, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                Subtle taps as you check things off
              </Text>
            </View>
            <Switch
              value={state.haptics}
              onValueChange={() => { hapticSelect(); ctx.toggleHaptics(); }}
              trackColor={{ true: theme.accent, false: theme.line }}
            />
          </View>
          <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.line }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { fontFamily: theme.fuiFamily, color: theme.ink }]}>
                Smooth animations
              </Text>
              <Text style={[styles.settingDesc, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                Gentle motion when things change
              </Text>
            </View>
            <Switch
              value={state.animations}
              onValueChange={ctx.toggleAnimations}
              trackColor={{ true: theme.accent, false: theme.line }}
            />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { fontFamily: theme.fuiFamily, color: theme.ink }]}>
                Sound effects
              </Text>
              <Text style={[styles.settingDesc, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                Soft piano notes as you complete things
              </Text>
            </View>
            <Switch
              value={state.sound}
              onValueChange={v => { ctx.toggleSound(); if (v) setTimeout(() => playSound('complete'), 60); }}
              trackColor={{ true: theme.accent, false: theme.line }}
            />
          </View>
        </View>
      </View>

      {/* Data */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
          DATA
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <TouchableOpacity
            style={[styles.dataRow, { borderBottomWidth: 1, borderBottomColor: theme.line }]}
            onPress={exportIdeas}
            activeOpacity={0.7}
          >
            <Text style={[styles.dataLabel, { fontFamily: theme.fuiFamily, color: theme.ink }]}>
              Export ideas
            </Text>
            <Text style={[styles.dataArrow, { color: theme.inkFaint }]}>›</Text>
          </TouchableOpacity>

          {archived.length > 0 && (
            <TouchableOpacity
              style={styles.dataRow}
              onPress={() => {
                Alert.alert(
                  'Clear archive',
                  `Permanently delete ${archived.length} archived idea${archived.length > 1 ? 's' : ''}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear',
                      style: 'destructive',
                      onPress: ctx.clearArchive,
                    },
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dataLabel, { fontFamily: theme.fuiFamily, color: '#DC2626' }]}>
                Clear archive ({archived.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
          ABOUT
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <View style={styles.aboutRow}>
            <View style={[styles.appIcon, { backgroundColor: theme.accent }]}>
              <Text style={styles.appIconText}>M</Text>
            </View>
            <View style={styles.aboutInfo}>
              <Text style={[styles.appName, { fontFamily: theme.fdispFamily, color: theme.ink }]}>
                Margin
              </Text>
              <Text style={[styles.appVersion, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                Version 0.1 · Ideas, unhurried
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 20,
  },
  title: {
    fontSize: 30,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    paddingLeft: 4,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  swatchGroup: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
  },
  swatchMain: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  swatchAccent: {
    flex: 1,
  },
  swatchSky: {
    flex: 1,
  },
  themeInfo: {
    flex: 1,
    gap: 2,
  },
  themeName: {
    fontSize: 15,
    fontWeight: '600',
  },
  themeDesc: {
    fontSize: 12,
  },
  checkmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingInfo: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    fontSize: 15,
  },
  settingDesc: {
    fontSize: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  timeLabel: {
    fontSize: 14,
  },
  timeValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeChevron: {
    fontSize: 18,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  dataLabel: {
    fontSize: 15,
  },
  dataArrow: {
    fontSize: 20,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
  },
  aboutInfo: {
    gap: 3,
  },
  appName: {
    fontSize: 18,
  },
  appVersion: {
    fontSize: 13,
  },
});
