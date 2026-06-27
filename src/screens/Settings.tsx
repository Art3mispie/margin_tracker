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
import { disp, ui } from '../fonts';
import Icon from '../components/Icon';
import Card from '../components/Card';
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
  const tk = theme.key;
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

  const toggleNotif = async (enabling: boolean, toggle: () => void) => {
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
      await Share.share({ title: 'Margin ideas', message: JSON.stringify(data, null, 2) });
    } catch {
      // Dismissed — nothing to do.
    }
  };

  const SectionLabel = ({ children }: { children: string }) => (
    <Text style={[styles.sectionLabel, { fontFamily: ui(600), color: theme.inkFaint }]}>{children}</Text>
  );

  const Toggle = ({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ true: theme.accent, false: theme.line }}
      thumbColor="#fff"
      ios_backgroundColor={theme.line}
    />
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: 130 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { fontFamily: disp(tk), color: theme.ink }]}>Settings</Text>

        {/* Appearance */}
        <View style={styles.section}>
          <SectionLabel>APPEARANCE</SectionLabel>
          <Card radius={18} clip>
            {THEME_ORDER.map((key, idx) => {
              const t = themes[key];
              const active = state.theme === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.themeRow,
                    { borderTopColor: theme.line, borderTopWidth: idx === 0 ? 0 : 1 },
                    active && { backgroundColor: ctx.rgba(0.08) },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => { hapticSelect(); ctx.setTheme(key); }}
                >
                  <View style={[styles.swatch, { backgroundColor: t.bg }]}>
                    <Text style={[styles.swatchAa, { fontFamily: disp(key), color: t.ink }]}>Aa</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { fontFamily: ui(600), color: theme.ink }]}>{t.name}</Text>
                    <Text style={[styles.rowDesc, { fontFamily: ui(), color: theme.inkFaint }]}>{t.desc}</Text>
                  </View>
                  {active && <Icon name="check" size={18} color={theme.accent} strokeWidth={2.4} />}
                </TouchableOpacity>
              );
            })}
          </Card>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <SectionLabel>NOTIFICATIONS</SectionLabel>
          <Card radius={18} clip>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { fontFamily: ui(500), color: theme.ink }]}>Morning planning</Text>
                <Text style={[styles.rowDesc, { fontFamily: ui(), color: theme.inkFaint }]}>
                  Pick the tasks you'll focus on today
                </Text>
              </View>
              <Toggle value={state.notifMorning} onValueChange={v => toggleNotif(v, ctx.toggleNotifMorning)} />
            </View>
            {state.notifMorning && (
              <TouchableOpacity
                style={[styles.timeRow, { borderTopColor: theme.line }]}
                activeOpacity={0.7}
                onPress={() => cycleTime(MORNING_TIMES, state.notifMorningTime, 'SET_NOTIF_MORNING_TIME')}
              >
                <Icon name="sun" size={15} color={theme.inkFaint} strokeWidth={1.8} />
                <Text style={[styles.timeLabel, { fontFamily: ui(), color: theme.inkSoft }]}>Prompt time</Text>
                <View style={[styles.timePill, { borderColor: theme.line, backgroundColor: theme.bg }]}>
                  <Text style={[styles.timeValue, { fontFamily: ui(600), color: theme.ink }]}>{state.notifMorningTime}</Text>
                </View>
              </TouchableOpacity>
            )}

            <View style={[styles.row, { borderTopColor: theme.line, borderTopWidth: 1 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { fontFamily: ui(500), color: theme.ink }]}>Evening check-in</Text>
                <Text style={[styles.rowDesc, { fontFamily: ui(), color: theme.inkFaint }]}>
                  Check off what you finished today
                </Text>
              </View>
              <Toggle value={state.notifEvening} onValueChange={v => toggleNotif(v, ctx.toggleNotifEvening)} />
            </View>
            {state.notifEvening && (
              <TouchableOpacity
                style={[styles.timeRow, { borderTopColor: theme.line }]}
                activeOpacity={0.7}
                onPress={() => cycleTime(EVENING_TIMES, state.notifEveningTime, 'SET_NOTIF_EVENING_TIME')}
              >
                <Icon name="moon" size={15} color={theme.inkFaint} strokeWidth={1.8} />
                <Text style={[styles.timeLabel, { fontFamily: ui(), color: theme.inkSoft }]}>Prompt time</Text>
                <View style={[styles.timePill, { borderColor: theme.line, backgroundColor: theme.bg }]}>
                  <Text style={[styles.timeValue, { fontFamily: ui(600), color: theme.ink }]}>{state.notifEveningTime}</Text>
                </View>
              </TouchableOpacity>
            )}

            <View style={[styles.row, { borderTopColor: theme.line, borderTopWidth: 1 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { fontFamily: ui(500), color: theme.ink }]}>Due date reminders</Text>
                <Text style={[styles.rowDesc, { fontFamily: ui(), color: theme.inkFaint }]}>Morning of the due date</Text>
              </View>
              <Toggle value={state.notifDue} onValueChange={v => toggleNotif(v, ctx.toggleNotifDue)} />
            </View>
          </Card>
        </View>

        {/* Feedback & motion (device features beyond the web mockup) */}
        <View style={styles.section}>
          <SectionLabel>FEEDBACK &amp; MOTION</SectionLabel>
          <Card radius={18} clip>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { fontFamily: ui(500), color: theme.ink }]}>Haptics</Text>
                <Text style={[styles.rowDesc, { fontFamily: ui(), color: theme.inkFaint }]}>
                  Subtle taps as you check things off
                </Text>
              </View>
              <Toggle value={state.haptics} onValueChange={() => { hapticSelect(); ctx.toggleHaptics(); }} />
            </View>
            <View style={[styles.row, { borderTopColor: theme.line, borderTopWidth: 1 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { fontFamily: ui(500), color: theme.ink }]}>Smooth animations</Text>
                <Text style={[styles.rowDesc, { fontFamily: ui(), color: theme.inkFaint }]}>
                  Gentle motion when things change
                </Text>
              </View>
              <Toggle value={state.animations} onValueChange={ctx.toggleAnimations} />
            </View>
            <View style={[styles.row, { borderTopColor: theme.line, borderTopWidth: 1 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { fontFamily: ui(500), color: theme.ink }]}>Sound effects</Text>
                <Text style={[styles.rowDesc, { fontFamily: ui(), color: theme.inkFaint }]}>
                  Soft notes as you complete things
                </Text>
              </View>
              <Toggle
                value={state.sound}
                onValueChange={v => { ctx.toggleSound(); if (v) setTimeout(() => playSound('complete'), 60); }}
              />
            </View>
          </Card>
        </View>

        {/* Data */}
        <View style={styles.section}>
          <SectionLabel>DATA</SectionLabel>
          <Card radius={18} clip>
            <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={exportIdeas}>
              <Icon name="download" size={18} color={theme.accent} strokeWidth={1.7} />
              <Text style={[styles.actionText, { fontFamily: ui(500), color: theme.ink }]}>Export ideas</Text>
              <Text style={[styles.actionMeta, { fontFamily: ui(), color: theme.inkFaint }]}>
                {ctx.active().length} ideas
              </Text>
            </TouchableOpacity>
            {archived.length > 0 && (
              <TouchableOpacity
                style={[styles.actionRow, { borderTopColor: theme.line, borderTopWidth: 1 }]}
                activeOpacity={0.7}
                onPress={() =>
                  Alert.alert(
                    'Clear archive',
                    `Permanently delete ${archived.length} archived idea${archived.length > 1 ? 's' : ''}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Clear', style: 'destructive', onPress: ctx.clearArchive },
                    ]
                  )
                }
              >
                <Icon name="archive" size={18} color="#C0492F" strokeWidth={1.7} />
                <Text style={[styles.actionText, { fontFamily: ui(500), color: '#C0492F' }]}>Clear archive</Text>
                <Text style={[styles.actionMeta, { fontFamily: ui(), color: theme.inkFaint }]}>
                  {archived.length} archived
                </Text>
              </TouchableOpacity>
            )}
          </Card>
        </View>

        {/* About */}
        <View style={[styles.section, { marginBottom: 8 }]}>
          <Card radius={18} clip>
            <View style={styles.aboutRow}>
              <View style={[styles.appIcon, { backgroundColor: theme.accent }]}>
                <Icon name="bookmark" size={20} color="#fff" strokeWidth={1.8} />
              </View>
              <View>
                <Text style={[styles.rowTitle, { fontFamily: ui(600), color: theme.ink }]}>Margin</Text>
                <Text style={[styles.rowDesc, { fontFamily: ui(), color: theme.inkFaint }]}>
                  Version 0.1 · Ideas, unhurried
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 22 },
  title: { fontSize: 30, letterSpacing: -0.2, marginBottom: 26 },
  section: { marginBottom: 26 },
  sectionLabel: { fontSize: 11.5, letterSpacing: 0.5, marginBottom: 10 },

  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchAa: { fontSize: 17 },
  rowTitle: { fontSize: 15 },
  rowDesc: { fontSize: 12.5, marginTop: 2, lineHeight: 16 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  timeLabel: { flex: 1, fontSize: 13.5 },
  timePill: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  timeValue: { fontSize: 13 },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  actionText: { flex: 1, fontSize: 15 },
  actionMeta: { fontSize: 13 },

  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  appIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
