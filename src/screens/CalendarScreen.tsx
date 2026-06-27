import React, { useContext } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppContext } from '../AppContext';
import { useTheme } from '../theme';
import { disp, ui } from '../fonts';
import Icon from '../components/Icon';
import Card from '../components/Card';
import Checkbox from '../components/Checkbox';
import IdeaCard from '../components/IdeaCard';
import { animateLayout } from '../anim';
import { hapticSelect } from '../haptics';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarScreen() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const tk = theme.key;
  const insets = useSafeAreaInsets();
  const { state } = ctx;

  const now = new Date();
  const todayKey = ctx.dayKey(now.getTime());
  const byDay = ctx.byDay();
  const allActive = ctx.active();

  const dueByDay: Record<string, number> = {};
  allActive.forEach(i => {
    if (i.due) {
      const k = ctx.dayKey(i.due);
      dueByDay[k] = (dueByDay[k] || 0) + 1;
    }
  });

  const cal = new Date(state.calRef);
  const monthLabel = cal.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const first = new Date(cal.getFullYear(), cal.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(1 - first.getDay());
  const lastDay = new Date(cal.getFullYear(), cal.getMonth() + 1, 0).getDate();
  const cells = first.getDay() + lastDay > 35 ? 42 : 35;

  const calFill = ['transparent', ctx.rgba(0.12), ctx.rgba(0.26), ctx.rgba(0.42), ctx.rgba(0.58)];

  const days = Array.from({ length: cells }, (_, n) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + n);
    const inMonth = day.getMonth() === cal.getMonth();
    const k = ctx.dayKey(day.getTime());
    const c = byDay[k] || 0;
    const lvl = c >= 4 ? 4 : c;
    const isToday = k === todayKey;
    const selected = k === state.selectedDay;
    return {
      key: k,
      day: day.getDate(),
      inMonth,
      fill: inMonth ? calFill[lvl] : 'transparent',
      color: !inMonth ? theme.inkFaint : lvl >= 3 ? '#fff' : isToday ? theme.accent : theme.ink,
      weight: (isToday || selected ? 700 : 500) as 500 | 700,
      ringColor: selected ? theme.accent : isToday ? ctx.rgba(0.5) : 'transparent',
      ringWidth: selected ? 2 : isToday ? 1.6 : 0,
      due: (dueByDay[k] || 0) > 0,
    };
  });

  const [sy, sm, sd] = state.selectedDay.split('-').map(Number);
  const selDate = new Date(sy, sm - 1, sd);
  const selectedLabel =
    state.selectedDay === todayKey
      ? 'Today'
      : selDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const dayIdeas = [...allActive]
    .sort((a, b) => b.createdAt - a.createdAt)
    .filter(i => ctx.dayKey(i.createdAt) === state.selectedDay || (i.due && ctx.dayKey(i.due) === state.selectedDay));

  const openTasks = allActive.flatMap(idea =>
    idea.checklist.map((c, idx) => ({ idea, task: c, idx })).filter(x => !x.task.done)
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: 130 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { fontFamily: disp(tk), color: theme.ink }]}>Calendar</Text>

        {/* Month grid */}
        <Card radius={18} style={styles.monthCard}>
          <View style={styles.monthNav}>
            <TouchableOpacity
              style={[styles.navBtn, { borderColor: theme.line }]}
              onPress={ctx.prevMonth}
              activeOpacity={0.7}
            >
              <Icon name="chevronLeft" size={15} color={theme.inkSoft} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={[styles.monthLabel, { fontFamily: disp(tk, 500), color: theme.ink }]}>{monthLabel}</Text>
            <TouchableOpacity
              style={[styles.navBtn, { borderColor: theme.line }]}
              onPress={ctx.nextMonth}
              activeOpacity={0.7}
            >
              <Icon name="chevronRight" size={15} color={theme.inkSoft} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View style={styles.dowRow}>
            {DOW.map((d, i) => (
              <Text key={i} style={[styles.dowText, { fontFamily: ui(600), color: theme.inkFaint }]}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {days.map((d, i) => (
              <TouchableOpacity
                key={i}
                style={styles.cell}
                activeOpacity={0.7}
                onPress={() => { hapticSelect(); ctx.selectDay(d.key); }}
              >
                <View
                  style={[
                    styles.cellInner,
                    {
                      backgroundColor: d.fill,
                      borderWidth: d.ringWidth,
                      borderColor: d.ringColor,
                    },
                  ]}
                >
                  <Text style={[styles.cellText, { fontFamily: ui(d.weight === 700 ? 700 : 500), color: d.color }]}>
                    {d.day}
                  </Text>
                  {d.due && <View style={[styles.dueDot, { backgroundColor: theme.accent }]} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendGroup}>
              <Text style={[styles.legendText, { fontFamily: ui(), color: theme.inkFaint }]}>Calm</Text>
              {[0, 1, 2, 3, 4].map(n => (
                <View
                  key={n}
                  style={[styles.legendCell, { backgroundColor: n === 0 ? theme.gridEmpty : calFill[n] }]}
                />
              ))}
              <Text style={[styles.legendText, { fontFamily: ui(), color: theme.inkFaint }]}>Full</Text>
            </View>
            <View style={styles.legendGroup}>
              <View style={[styles.dueLegendDot, { backgroundColor: theme.accent }]} />
              <Text style={[styles.legendText, { fontFamily: ui(), color: theme.inkFaint }]}>Due</Text>
            </View>
          </View>
        </Card>

        {/* Selected day */}
        <Text style={[styles.selectedLabel, { fontFamily: disp(tk), color: theme.ink }]}>{selectedLabel}</Text>
        <View style={{ marginTop: 12 }}>
          {dayIdeas.length > 0 ? (
            dayIdeas.map(idea => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onPress={() => ctx.openReader(idea.id)}
                onArchive={() => ctx.archiveIdea(idea.id)}
              />
            ))
          ) : (
            <View style={[styles.empty, { borderColor: theme.line }]}>
              <Svg width={80} height={46} viewBox="0 0 80 46">
                <Circle cx={58} cy={16} r={10} fill={theme.sun} opacity={0.9} />
                <Path d="M0 30 C14 24 22 34 36 30 S60 24 80 30 L80 46 L0 46 Z" fill={theme.wave1} />
                <Path d="M0 36 C16 31 24 40 38 36 S62 31 80 37 L80 46 L0 46 Z" fill={theme.wave3} />
              </Svg>
              <Text style={[styles.emptyText, { fontFamily: ui(), color: theme.inkFaint }]}>
                Nothing here yet — a calm day.
              </Text>
            </View>
          )}
        </View>

        {/* Open next steps */}
        <View style={styles.stepsHeader}>
          <Text style={[styles.stepsTitle, { fontFamily: disp(tk), color: theme.ink }]}>Open next steps</Text>
          <Text style={[styles.dim, { fontFamily: ui(), color: theme.inkFaint }]}>{openTasks.length} open</Text>
        </View>
        {openTasks.length > 0 && (
          <Card radius={16} clip style={{ marginTop: 12 }}>
            {openTasks.map(({ idea, task, idx }, i) => (
              <View
                key={`${idea.id}-${idx}`}
                style={[styles.taskRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.line }]}
              >
                <Checkbox
                  checked={task.done}
                  onToggle={() => { animateLayout(); ctx.toggleChk(idea.id, idx); }}
                  accent={theme.accent}
                  line={theme.line}
                  size={20}
                  successOnCheck
                  label={task.text}
                />
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.7} onPress={() => ctx.openReader(idea.id)}>
                  <Text style={[styles.taskText, { fontFamily: ui(), color: theme.ink }]} numberOfLines={2}>
                    {task.text}
                  </Text>
                  <Text style={[styles.taskIdea, { fontFamily: ui(), color: theme.accent }]} numberOfLines={1}>
                    {idea.title || 'Untitled idea'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 22 },
  title: { fontSize: 30, letterSpacing: -0.2 },

  monthCard: { marginTop: 18, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  navBtn: { width: 30, height: 30, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 17 },

  dowRow: { flexDirection: 'row', marginBottom: 6 },
  dowText: { flex: 1, textAlign: 'center', fontSize: 11 },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 1.5 },
  cellInner: { flex: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cellText: { fontSize: 13.5 },
  dueDot: { position: 'absolute', top: 5, right: 6, width: 5, height: 5, borderRadius: 2.5 },

  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  legendGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 11 },
  legendCell: { width: 11, height: 11, borderRadius: 3 },
  dueLegendDot: { width: 6, height: 6, borderRadius: 3 },

  selectedLabel: { fontSize: 18, marginTop: 22 },
  empty: { paddingVertical: 22, paddingHorizontal: 16, borderWidth: 1, borderStyle: 'dashed', borderRadius: 15, alignItems: 'center' },
  emptyText: { fontSize: 13.5, marginTop: 10 },

  stepsHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 26 },
  stepsTitle: { fontSize: 18 },
  dim: { fontSize: 12.5 },

  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 13, paddingHorizontal: 15 },
  taskText: { fontSize: 14, lineHeight: 19 },
  taskIdea: { fontSize: 12, marginTop: 3 },
});
