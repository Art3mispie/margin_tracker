import React, { useContext, useRef } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { AppContext } from '../AppContext';
import { useTheme } from '../theme';
import OceanHeader from '../components/OceanHeader';
import ContributionGrid from '../components/ContributionGrid';
import IdeaCard from '../components/IdeaCard';
import Checkbox from '../components/Checkbox';
import { hapticTap } from '../haptics';
import { animateLayout } from '../anim';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning.';
  if (h < 17) return 'Good afternoon.';
  return 'Good evening.';
}

export default function Today() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const translateY = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [0, -150],
    extrapolate: 'clamp',
  });

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const todayIdeas = ctx.active().filter(
    i => ctx.dayKey(i.createdAt) === todayKey
  );

  const todayTasks = ctx.active().flatMap(idea =>
    idea.checklist
      .map((c, idx) => ({ idea, task: c, idx }))
      .filter(x => x.task.today && !x.task.done)
  );

  const doneTodayCount = ctx.active().flatMap(i =>
    i.checklist.filter(c => c.today && c.done)
  ).length;

  const totalTodayCount = todayTasks.length + doneTodayCount;

  const suggested = ctx.active().flatMap(idea =>
    idea.checklist
      .map((c, idx) => ({ idea, task: c, idx }))
      .filter(x => !x.task.today && !x.task.done)
  ).slice(0, 4);

  const dueSoon = ctx.active()
    .filter(i => {
      if (!i.due) return false;
      const info = ctx.dueInfo(i.due);
      return info !== null && info.diff <= 7;
    })
    .sort((a, b) => (a.due ?? 0) - (b.due ?? 0))
    .slice(0, 4);

  const recent = ctx.active()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).toUpperCase();

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* Ocean sits behind everything */}
      <OceanHeader translateY={translateY} />

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Spacer for ocean */}
        <View style={{ height: 220 }} />

        {/* Greeting area — sits over ocean */}
        <View style={[styles.greetingArea, { paddingTop: insets.top + 12 }]}>
          <Text style={[styles.dateStr, { fontFamily: theme.fuiFamily, color: 'rgba(255,255,255,0.7)' }]}>
            {dateStr}
          </Text>
          <Text style={[styles.greeting, { fontFamily: theme.fdispFamily }]}>
            {getGreeting()}
          </Text>
        </View>

        <View style={styles.cards}>
          {/* Captured today / One idea today */}
          {todayIdeas.length === 0 ? (
            <TouchableOpacity
              style={[styles.capturePrompt, { backgroundColor: theme.accent }]}
              onPress={ctx.openCapture}
              activeOpacity={0.85}
            >
              <Text style={[styles.capturePromptText, { fontFamily: theme.fuiFamily }]}>
                + One idea today?
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <Text style={[styles.cardLabel, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                Captured today · {todayIdeas.length}
              </Text>
              {todayIdeas.slice(0, 3).map(idea => (
                <Text
                  key={idea.id}
                  style={[styles.capturedItem, { fontFamily: theme.fuiFamily, color: theme.ink }]}
                  numberOfLines={1}
                >
                  {idea.title}
                </Text>
              ))}
            </View>
          )}

          {/* Today's Focus */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { fontFamily: theme.fuiFamily, color: theme.ink }]}>
                Today's focus
              </Text>
              {totalTodayCount > 0 && (
                <Text style={[styles.cardMeta, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                  {doneTodayCount} of {totalTodayCount} done
                </Text>
              )}
            </View>

            {todayTasks.length === 0 && suggested.length === 0 && (
              <Text style={[styles.emptyText, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                No tasks for today yet.
              </Text>
            )}

            {todayTasks.map(({ idea, task, idx }) => (
              <View key={`${idea.id}-${idx}`} style={styles.taskRow}>
                <Checkbox
                  checked={task.done}
                  onToggle={() => { animateLayout(); ctx.toggleTaskDone(idea.id, idx); }}
                  accent={theme.accent}
                  line={theme.line}
                  size={21}
                  successOnCheck
                />
                <View style={styles.taskTextWrap}>
                  <Text style={[styles.taskText, { fontFamily: theme.fuiFamily, color: theme.ink }]} numberOfLines={1}>
                    {task.text}
                  </Text>
                  <TouchableOpacity onPress={() => ctx.openReader(idea.id)}>
                    <Text style={[styles.taskIdea, { fontFamily: theme.fuiFamily, color: theme.accent }]} numberOfLines={1}>
                      {idea.title}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => { hapticTap(); animateLayout(); ctx.setTaskToday(idea.id, idx, false); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.removeBtn, { color: theme.inkFaint }]}>×</Text>
                </TouchableOpacity>
              </View>
            ))}

            {suggested.length > 0 && (
              <>
                {todayTasks.length > 0 && (
                  <View style={[styles.divider, { backgroundColor: theme.line }]} />
                )}
                <Text style={[styles.suggestedLabel, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                  Suggested
                </Text>
                {suggested.map(({ idea, task, idx }) => (
                  <TouchableOpacity
                    key={`sug-${idea.id}-${idx}`}
                    style={styles.taskRow}
                    onPress={() => { hapticTap(); animateLayout(); ctx.setTaskToday(idea.id, idx, true); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkboxDashed, { borderColor: theme.inkFaint }]} />
                    <Text style={[styles.taskText, { fontFamily: theme.fuiFamily, color: theme.inkSoft }]} numberOfLines={1}>
                      {task.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <TouchableOpacity
              style={[styles.planBtn, { borderTopColor: theme.line }]}
              onPress={ctx.openTaskPicker}
            >
              <Text style={[styles.planBtnText, { fontFamily: theme.fuiFamily, color: theme.accent }]}>
                Review everything & plan today…
              </Text>
            </TouchableOpacity>
          </View>

          {/* Due Soon */}
          {dueSoon.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { fontFamily: theme.fuiFamily, color: theme.ink }]}>
                  Due soon
                </Text>
              </View>
              {dueSoon.map(idea => {
                const due = ctx.dueInfo(idea.due!);
                return (
                  <TouchableOpacity
                    key={idea.id}
                    style={styles.dueSoonRow}
                    onPress={() => ctx.openReader(idea.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.dueLabel,
                      {
                        fontFamily: theme.fuiFamily,
                        color: due?.overdue ? '#DC2626' : '#D97706'
                      }
                    ]}>
                      {due?.label}
                    </Text>
                    <Text style={[styles.dueSoonTitle, { fontFamily: theme.fuiFamily, color: theme.ink }]} numberOfLines={1}>
                      {idea.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Contribution grid */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { fontFamily: theme.fuiFamily, color: theme.ink }]}>
                Your rhythm
              </Text>
            </View>
            <ContributionGrid />
            <View style={styles.legend}>
              <Text style={[styles.legendText, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                Calm
              </Text>
              {[0, 1, 2, 3, 4].map(n => (
                <View
                  key={n}
                  style={[
                    styles.legendCell,
                    { backgroundColor: ctx.levelColor(n) }
                  ]}
                />
              ))}
              <Text style={[styles.legendText, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                Full
              </Text>
            </View>
          </View>

          {/* Recent */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { fontFamily: theme.fdispFamily, color: theme.ink }]}>
              Recent
            </Text>
            <TouchableOpacity onPress={() => ctx.setScreen('ideas')}>
              <Text style={[styles.allLink, { fontFamily: theme.fuiFamily, color: theme.accent }]}>
                All ideas
              </Text>
            </TouchableOpacity>
          </View>

          {recent.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onPress={() => ctx.openReader(idea.id)}
              onArchive={() => ctx.archiveIdea(idea.id)}
            />
          ))}

          <View style={{ height: 120 }} />
        </View>
      </Animated.ScrollView>

      {/* Settings button */}
      <TouchableOpacity
        style={[styles.settingsBtn, { top: insets.top + 12 }]}
        onPress={() => ctx.setScreen('settings')}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={1.8}
          />
          <Path
            d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  greetingArea: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    gap: 4,
  },
  dateStr: {
    fontSize: 11,
    letterSpacing: 1,
  },
  greeting: {
    fontSize: 28,
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cards: {
    gap: 16,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardLabel: {
    fontSize: 12,
  },
  cardMeta: {
    fontSize: 12,
  },
  capturePrompt: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  capturePromptText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  capturedItem: {
    fontSize: 14,
    paddingVertical: 2,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  checkboxDashed: {
    width: 18,
    height: 18,
    borderRadius: 7,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  taskTextWrap: {
    flex: 1,
  },
  taskText: {
    fontSize: 14,
  },
  taskIdea: {
    fontSize: 11,
    marginTop: 1,
  },
  removeBtn: {
    fontSize: 18,
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  suggestedLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  planBtn: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 2,
  },
  planBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dueSoonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 3,
  },
  dueLabel: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 90,
  },
  dueSoonTitle: {
    flex: 1,
    fontSize: 13,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  legendText: {
    fontSize: 11,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
  },
  allLink: {
    fontSize: 13,
    fontWeight: '500',
  },
  settingsBtn: {
    position: 'absolute',
    right: 16,
    padding: 6,
  },
});
