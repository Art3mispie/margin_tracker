import React, { useContext, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../AppContext';
import { useTheme } from '../theme';
import { disp, ui } from '../fonts';
import Icon from '../components/Icon';
import Card from '../components/Card';
import Checkbox from '../components/Checkbox';
import OceanHeader from '../components/OceanHeader';
import ContributionGrid from '../components/ContributionGrid';
import IdeaCard from '../components/IdeaCard';
import { hapticTap } from '../haptics';
import { animateLayout } from '../anim';

export default function Today() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const tk = theme.key;
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  // Gentle parallax: the ocean recedes at half the scroll rate.
  const oceanShift = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [0, -120],
    extrapolate: 'clamp',
  });

  const now = new Date();
  const byDay = ctx.byDay();
  const todayKey = ctx.dayKey(now.getTime());
  const loggedToday = (byDay[todayKey] || 0) > 0;
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const todayLabel = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const streakText = loggedToday
    ? 'Captured today — add more whenever something comes to mind.'
    : 'A blank page is a good place to start.';

  const dueColorFor = (info: { overdue: boolean } | null) =>
    info && info.overdue ? '#C0492F' : theme.accent;

  const sorted = [...ctx.active()].sort((a, b) => b.createdAt - a.createdAt);

  // Today's focus = checklist items flagged for today, across all ideas.
  const todayFocus: Array<{ ideaId: number; idx: number; text: string; done: boolean; ideaTitle: string }> = [];
  const suggested: Array<{ ideaId: number; idx: number; text: string; ideaTitle: string }> = [];
  sorted.forEach(i => {
    i.checklist.forEach((c, idx) => {
      const ideaTitle = i.title || 'Untitled idea';
      if (c.today) todayFocus.push({ ideaId: i.id, idx, text: c.text, done: c.done, ideaTitle });
      else if (!c.done) suggested.push({ ideaId: i.id, idx, text: c.text, ideaTitle });
    });
  });
  const suggestedTasks = suggested.slice(0, 4);
  const todayDone = todayFocus.filter(x => x.done).length;
  const todayFocusLabel = todayFocus.length ? `${todayDone} of ${todayFocus.length} done` : '';

  const dueSoon = sorted
    .filter(i => {
      const di = i.due ? ctx.dueInfo(i.due) : null;
      return di !== null && di.diff <= 7;
    })
    .sort((a, b) => (a.due ?? 0) - (b.due ?? 0))
    .slice(0, 4);

  const totalLabel = `${ctx.active().length} ideas captured`;
  const recent = sorted.slice(0, 5);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <OceanHeader translateY={oceanShift} />

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 130 }]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: date + greeting, glassy settings button */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.dateLabel, { fontFamily: ui(600) }]}>
              {todayLabel.toUpperCase()}
            </Text>
            <Text style={[styles.greeting, { fontFamily: disp(tk) }]}>{greeting}</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => { hapticTap(); ctx.setScreen('settings'); }}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Icon name="gear" size={18} color="#fff" strokeWidth={1.7} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 5 }} />

        {/* Capture state */}
        {loggedToday ? (
          <Card radius={18} style={styles.capturedCard}>
            <View style={[styles.capturedCheck, { backgroundColor: theme.accent }]}>
              <Icon name="check" size={17} color="#fff" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.capturedTitle, { fontFamily: ui(600), color: theme.ink }]}>
                Captured today
              </Text>
              <Text style={[styles.capturedSub, { fontFamily: ui(), color: theme.inkSoft }]}>
                {streakText}
              </Text>
            </View>
          </Card>
        ) : (
          <TouchableOpacity activeOpacity={0.9} onPress={() => { hapticTap(); ctx.openCapture(); }}>
            <View style={[styles.promptCard, { backgroundColor: theme.accent, borderColor: theme.line }]}>
              <Text style={[styles.promptTitle, { fontFamily: disp(tk) }]}>One idea today?</Text>
              <Text style={[styles.promptSub, { fontFamily: ui() }]}>{streakText}</Text>
              <View style={styles.jotPill}>
                <Icon name="plus" size={15} color="#fff" strokeWidth={2} />
                <Text style={[styles.jotText, { fontFamily: ui(600) }]}>Jot it down</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Today's focus */}
        <Card radius={18} clip style={{ marginTop: 16 }}>
          <View style={styles.focusHeader}>
            <Text style={[styles.focusTitle, { fontFamily: disp(tk), color: theme.ink }]}>
              Today's focus
            </Text>
            {!!todayFocusLabel && (
              <Text style={[styles.focusMeta, { fontFamily: ui(), color: theme.inkFaint }]}>
                {todayFocusLabel}
              </Text>
            )}
          </View>

          {todayFocus.map(ft => (
            <View key={`f-${ft.ideaId}-${ft.idx}`} style={[styles.focusRow, { borderTopColor: theme.line }]}>
              <Checkbox
                checked={ft.done}
                onToggle={() => { animateLayout(); ctx.toggleTaskDone(ft.ideaId, ft.idx); }}
                accent={theme.accent}
                line={theme.line}
                size={21}
                successOnCheck
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.focusText,
                    {
                      fontFamily: ui(),
                      color: ft.done ? theme.inkFaint : theme.ink,
                      textDecorationLine: ft.done ? 'line-through' : 'none',
                    },
                  ]}
                >
                  {ft.text}
                </Text>
                <TouchableOpacity onPress={() => ctx.openReader(ft.ideaId)}>
                  <Text style={[styles.focusIdea, { fontFamily: ui(), color: theme.accent }]} numberOfLines={1}>
                    {ft.ideaTitle}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => { hapticTap(); animateLayout(); ctx.setTaskToday(ft.ideaId, ft.idx, false); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.removeX, { color: theme.inkFaint }]}>×</Text>
              </TouchableOpacity>
            </View>
          ))}

          {todayFocus.length === 0 && (
            <Text style={[styles.focusEmpty, { fontFamily: ui(), color: theme.inkSoft }]}>
              Nothing picked yet — choose a few tasks below to focus on today.
            </Text>
          )}

          {suggestedTasks.length > 0 && (
            <>
              <Text style={[styles.suggestedLabel, { fontFamily: ui(700), color: theme.inkFaint, borderTopColor: theme.line }]}>
                SUGGESTED
              </Text>
              {suggestedTasks.map(st => (
                <TouchableOpacity
                  key={`s-${st.ideaId}-${st.idx}`}
                  style={styles.suggestRow}
                  activeOpacity={0.7}
                  onPress={() => { hapticTap(); animateLayout(); ctx.setTaskToday(st.ideaId, st.idx, true); }}
                >
                  <View style={[styles.suggestBox, { borderColor: theme.line }]}>
                    <Icon name="plus" size={13} color={theme.accent} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.suggestText, { fontFamily: ui(), color: theme.ink }]} numberOfLines={1}>
                      {st.text}
                    </Text>
                    <Text style={[styles.suggestIdea, { fontFamily: ui(), color: theme.inkFaint }]} numberOfLines={1}>
                      {st.ideaTitle}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          <TouchableOpacity
            style={[styles.planRow, { borderTopColor: theme.line }]}
            onPress={() => { hapticTap(); ctx.openTaskPicker(); }}
          >
            <View style={[styles.planIcon, { backgroundColor: theme.accentSoft }]}>
              <Icon name="search" size={13} color={theme.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.planText, { fontFamily: ui(600), color: theme.accent }]}>
              Review everything &amp; plan today…
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Due soon */}
        {dueSoon.length > 0 && (
          <Card radius={18} clip style={{ marginTop: 16 }}>
            <View style={styles.dueHeader}>
              <Icon name="clock" size={15} color={theme.inkSoft} strokeWidth={1.8} />
              <Text style={[styles.dueHeaderText, { fontFamily: ui(600), color: theme.ink }]}>Due soon</Text>
            </View>
            {dueSoon.map(i => {
              const di = ctx.dueInfo(i.due!);
              return (
                <TouchableOpacity
                  key={i.id}
                  style={[styles.dueRow, { borderTopColor: theme.line }]}
                  activeOpacity={0.7}
                  onPress={() => ctx.openReader(i.id)}
                >
                  <Text style={[styles.dueLabel, { fontFamily: ui(700), color: dueColorFor(di) }]}>
                    {di?.label}
                  </Text>
                  <Text style={[styles.dueTitle, { fontFamily: ui(), color: theme.ink }]} numberOfLines={1}>
                    {i.title || 'Untitled idea'}
                  </Text>
                  <Icon name="chevronRight" size={15} color={theme.inkFaint} strokeWidth={1.8} />
                </TouchableOpacity>
              );
            })}
          </Card>
        )}

        {/* Your rhythm */}
        <Card radius={18} style={styles.rhythmCard}>
          <View style={styles.rhythmHeader}>
            <Text style={[styles.rhythmTitle, { fontFamily: ui(600), color: theme.ink }]}>Your rhythm</Text>
            <Text style={[styles.rhythmTotal, { fontFamily: disp(tk), color: theme.accent }]}>{totalLabel}</Text>
          </View>
          <ContributionGrid />
          <View style={styles.legend}>
            <Text style={[styles.legendText, { fontFamily: ui(), color: theme.inkFaint }]}>Less</Text>
            {[0, 1, 2, 3, 4].map(n => (
              <View key={n} style={[styles.legendCell, { backgroundColor: ctx.levelColor(n) }]} />
            ))}
            <Text style={[styles.legendText, { fontFamily: ui(), color: theme.inkFaint }]}>More</Text>
          </View>
        </Card>

        {/* Recent */}
        <View style={styles.recentHeader}>
          <Text style={[styles.recentTitle, { fontFamily: disp(tk), color: theme.ink }]}>Recent</Text>
          <TouchableOpacity onPress={() => ctx.setScreen('ideas')}>
            <Text style={[styles.allLink, { fontFamily: ui(600), color: theme.accent }]}>All ideas</Text>
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: 12 }}>
          {recent.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onPress={() => ctx.openReader(idea.id)}
              onArchive={() => ctx.archiveIdea(idea.id)}
            />
          ))}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 22 },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dateLabel: {
    fontSize: 13,
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.82)',
    textShadowColor: 'rgba(18,48,72,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  greeting: {
    fontSize: 32,
    lineHeight: 36,
    marginTop: 5,
    color: '#fff',
    letterSpacing: -0.2,
    textShadowColor: 'rgba(14,42,66,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 16,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  capturedCard: {
    marginTop: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  capturedCheck: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capturedTitle: { fontSize: 15 },
  capturedSub: { fontSize: 13, lineHeight: 17, marginTop: 1 },

  promptCard: {
    marginTop: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
  },
  promptTitle: { fontSize: 21, color: '#fff', lineHeight: 25, letterSpacing: -0.2 },
  promptSub: { fontSize: 13.5, color: 'rgba(255,255,255,0.85)', marginTop: 5, maxWidth: 230, lineHeight: 19 },
  jotPill: {
    marginTop: 13,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 11,
  },
  jotText: { fontSize: 13.5, color: '#fff' },

  focusHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  focusTitle: { fontSize: 17 },
  focusMeta: { fontSize: 12.5 },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  focusText: { fontSize: 14.5, lineHeight: 20 },
  focusIdea: { fontSize: 12, marginTop: 2 },
  removeX: { fontSize: 18, lineHeight: 20, paddingHorizontal: 2 },
  focusEmpty: { fontSize: 13.5, lineHeight: 20, paddingHorizontal: 16, paddingTop: 2, paddingBottom: 16 },
  suggestedLabel: {
    fontSize: 11,
    letterSpacing: 0.4,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 4,
    borderTopWidth: 1,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  suggestBox: {
    width: 21,
    height: 21,
    borderRadius: 7,
    borderWidth: 1.7,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestText: { fontSize: 14, lineHeight: 19 },
  suggestIdea: { fontSize: 11.5, marginTop: 1 },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  planIcon: {
    width: 21,
    height: 21,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planText: { fontSize: 14, flex: 1 },

  dueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 13,
    paddingHorizontal: 16,
    paddingBottom: 9,
  },
  dueHeaderText: { fontSize: 13, letterSpacing: 0.2 },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  dueLabel: { fontSize: 12, minWidth: 62 },
  dueTitle: { flex: 1, fontSize: 14 },

  rhythmCard: { marginTop: 24, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16 },
  rhythmHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  rhythmTitle: { fontSize: 15 },
  rhythmTotal: { fontSize: 14 },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 13,
  },
  legendText: { fontSize: 11 },
  legendCell: { width: 11, height: 11, borderRadius: 3 },

  recentHeader: {
    marginTop: 26,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  recentTitle: { fontSize: 19 },
  allLink: { fontSize: 13 },
});
