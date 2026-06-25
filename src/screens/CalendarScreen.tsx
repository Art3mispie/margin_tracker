import React, { useContext } from 'react';
import {
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
import IdeaCard from '../components/IdeaCard';
import Checkbox from '../components/Checkbox';
import { animateLayout } from '../anim';
import { hapticSelect } from '../haptics';

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarScreen() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = ctx;

  const calDate = new Date(state.calRef);
  const year = calDate.getFullYear();
  const month = calDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

  const allActive = ctx.active();
  const byDay = ctx.byDay();

  // Ideas that have due dates this month
  const dueDays = new Set(
    allActive
      .filter(i => {
        if (!i.due) return false;
        const d = new Date(i.due);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map(i => new Date(i.due!).getDate())
  );

  // Selected day's ideas (created or due that day)
  const [selYear, selMonth, selDate] = state.selectedDay.split('-').map(Number);
  const selIdeas = allActive.filter(i => {
    const created = new Date(i.createdAt);
    const createdMatch =
      created.getFullYear() === selYear &&
      created.getMonth() + 1 === selMonth &&
      created.getDate() === selDate;
    if (createdMatch) return true;
    if (!i.due) return false;
    const due = new Date(i.due);
    return (
      due.getFullYear() === selYear &&
      due.getMonth() + 1 === selMonth &&
      due.getDate() === selDate
    );
  });

  // Open checklist items — map before filtering so idx is the real checklist index.
  const openTasks = allActive.flatMap(idea =>
    idea.checklist
      .map((c, idx) => ({ idea, task: c, idx }))
      .filter(x => !x.task.done)
  );

  const selectedDayLabel = new Date(selYear, selMonth - 1, selDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const totalCells = firstDay + daysInMonth;
  const rows = Math.ceil(totalCells / 7);
  const totalGridCells = rows * 7;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { fontFamily: theme.fdispFamily, color: theme.ink }]}>
          Calendar
        </Text>

        {/* Month calendar card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          {/* Nav */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={ctx.prevMonth} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M15 18l-6-6 6-6" stroke={theme.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
            <Text style={[styles.monthLabel, { fontFamily: theme.fdispFamily, color: theme.ink }]}>
              {MONTH_NAMES[month]} {year}
            </Text>
            <TouchableOpacity onPress={ctx.nextMonth} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M9 18l6-6-6-6" stroke={theme.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View style={styles.dayHeaders}>
            {DAY_NAMES.map((d, i) => (
              <View key={i} style={styles.dayHeader}>
                <Text style={[styles.dayHeaderText, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                  {d}
                </Text>
              </View>
            ))}
          </View>

          {/* Grid */}
          <View style={styles.grid}>
            {Array.from({ length: totalGridCells }).map((_, idx) => {
              const dayNum = idx - firstDay + 1;
              const isValid = dayNum >= 1 && dayNum <= daysInMonth;
              const dayKey = isValid ? `${year}-${month + 1}-${dayNum}` : '';
              const count = isValid ? (byDay[dayKey] || 0) : 0;
              const isToday = dayKey === todayStr;
              const isSelected = dayKey === state.selectedDay;
              const hasDue = isValid && dueDays.has(dayNum);

              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.gridCell}
                  onPress={() => {
                    if (isValid) { hapticSelect(); ctx.selectDay(dayKey); }
                  }}
                  disabled={!isValid}
                  activeOpacity={0.7}
                >
                  {isValid && (
                    <>
                      {/* Activity fill */}
                      {count > 0 && (
                        <View
                          style={[
                            StyleSheet.absoluteFill,
                            {
                              backgroundColor: ctx.levelColor(count),
                              borderRadius: 8,
                              margin: 1,
                            },
                          ]}
                        />
                      )}
                      {/* Today / selected ring */}
                      {(isToday || isSelected) && (
                        <View
                          style={[
                            StyleSheet.absoluteFill,
                            {
                              borderRadius: 8,
                              margin: 1,
                              borderWidth: 1.5,
                              borderColor: isSelected ? theme.accent : theme.inkFaint,
                            },
                          ]}
                        />
                      )}
                      {/* Day number */}
                      <Text style={[
                        styles.dayNum,
                        { fontFamily: theme.fuiFamily },
                        isToday ? { color: theme.accent, fontWeight: '700' } : { color: theme.ink },
                        isSelected && !isToday ? { color: theme.accent } : undefined,
                      ]}>
                        {dayNum}
                      </Text>
                      {/* Due dot */}
                      {hasDue && (
                        <View
                          style={[styles.dueDot, { backgroundColor: theme.accent }]}
                        />
                      )}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <Text style={[styles.legendText, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>Calm</Text>
            {[0, 1, 2, 3, 4].map(n => (
              <View key={n} style={[styles.legendCell, { backgroundColor: ctx.levelColor(n) }]} />
            ))}
            <Text style={[styles.legendText, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>Full</Text>
            <View style={[styles.dueDotLegend, { backgroundColor: theme.accent }]} />
            <Text style={[styles.legendText, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>Due</Text>
          </View>
        </View>

        {/* Selected day */}
        <Text style={[styles.selectedLabel, { fontFamily: theme.fdispFamily, color: theme.ink }]}>
          {selectedDayLabel}
        </Text>

        {selIdeas.length === 0 ? (
          <Text style={[styles.emptyText, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
            No ideas on this day.
          </Text>
        ) : (
          selIdeas.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onPress={() => ctx.openReader(idea.id)}
              onArchive={() => ctx.archiveIdea(idea.id)}
            />
          ))
        )}

        {/* Open next steps */}
        {openTasks.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Text style={[styles.sectionLabel, { fontFamily: theme.fuiFamily, color: theme.ink }]}>
              Open next steps
            </Text>
            {openTasks.map(({ idea, task, idx }) => (
              <View key={`${idea.id}-${idx}`} style={styles.taskRow}>
                <Checkbox
                  checked={task.done}
                  onToggle={() => { animateLayout(); ctx.toggleChk(idea.id, idx); }}
                  accent={theme.accent}
                  line={theme.line}
                  size={20}
                  successOnCheck
                />
                <TouchableOpacity
                  style={styles.taskWrap}
                  onPress={() => ctx.openReader(idea.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.taskText, { fontFamily: theme.fuiFamily, color: theme.ink }]} numberOfLines={1}>
                    {task.text}
                  </Text>
                  <Text style={[styles.taskIdea, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]} numberOfLines={1}>
                    {idea.title}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
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
    gap: 16,
  },
  title: {
    fontSize: 30,
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
    gap: 12,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 17,
  },
  dayHeaders: {
    flexDirection: 'row',
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayHeaderText: {
    fontSize: 11,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayNum: {
    fontSize: 12,
    lineHeight: 14,
  },
  dueDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    top: 3,
    right: 3,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  legendText: {
    fontSize: 11,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  dueDotLegend: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 6,
  },
  selectedLabel: {
    fontSize: 18,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  taskWrap: {
    flex: 1,
  },
  taskText: {
    fontSize: 14,
  },
  taskIdea: {
    fontSize: 11,
    marginTop: 1,
  },
});
