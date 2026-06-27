import React, { useContext, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../AppContext';
import { useTheme } from '../theme';
import { disp, ui } from '../fonts';
import Icon from '../components/Icon';
import Card from '../components/Card';
import { animateLayout } from '../anim';
import { hapticTap } from '../haptics';
import type { Idea } from '../types';

export default function PlanDaySheet() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const tk = theme.key;
  const insets = useSafeAreaInsets();
  const { state } = ctx;
  const [looseOpen, setLooseOpen] = useState(false);

  if (!state.taskPickerOpen) return null;

  const sorted = [...ctx.active()].sort((a, b) => b.createdAt - a.createdAt);
  const pq = state.taskPickerSearch.trim().toLowerCase();
  const matches = (i: Idea, text: string) =>
    !pq || `${text} ${i.title} ${i.project || ''}`.toLowerCase().includes(pq);

  const groupDefs: Array<{ label: string; test: (diff: number | null) => boolean }> = [
    { label: 'Overdue', test: d => d !== null && d < 0 },
    { label: 'This week', test: d => d !== null && d >= 0 && d <= 7 },
    { label: 'Anytime', test: d => d === null || d > 7 },
  ];

  const groups = groupDefs
    .map(g => {
      const ideas = sorted
        .map(i => {
          const di = i.due ? ctx.dueInfo(i.due) : null;
          if (!g.test(di ? di.diff : null)) return null;
          const tasks = i.checklist
            .map((c, idx) => ({ c, idx }))
            .filter(o => !o.c.done && matches(i, o.c.text));
          if (!tasks.length) return null;
          return { idea: i, di, tasks };
        })
        .filter(Boolean) as Array<{ idea: Idea; di: ReturnType<typeof ctx.dueInfo>; tasks: Array<{ c: Idea['checklist'][number]; idx: number }> }>;
      const count = ideas.reduce((n, x) => n + x.tasks.length, 0);
      return { label: g.label, ideas, count };
    })
    .filter(g => g.ideas.length > 0);

  const looseIdeas = sorted.filter(i => {
    const openN = i.checklist.filter(c => !c.done).length;
    return openN === 0 && (!pq || i.title.toLowerCase().includes(pq) || (i.project || '').toLowerCase().includes(pq));
  });

  const chosen = ctx.active().reduce((n, i) => n + i.checklist.filter(c => c.today).length, 0);
  const planSelectedLabel = chosen
    ? `${chosen} task${chosen === 1 ? '' : 's'} chosen for today`
    : 'Nothing chosen for today yet';
  const empty = groups.length === 0 && looseIdeas.length === 0;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={ctx.closeTaskPicker} />
      <KeyboardAvoidingView
        style={[styles.sheet, { backgroundColor: theme.bg, top: insets.top + 8 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.handle, { backgroundColor: theme.line }]} />

        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { fontFamily: disp(tk), color: theme.ink }]}>Plan your day</Text>
            <Text style={[styles.subtitle, { fontFamily: ui(600), color: theme.accent }]}>{planSelectedLabel}</Text>
          </View>
          <TouchableOpacity onPress={ctx.closeTaskPicker} hitSlop={8}>
            <Text style={[styles.done, { fontFamily: ui(600), color: theme.accent }]}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrap}>
          <Card radius={13} style={styles.searchBox}>
            <Icon name="search" size={17} color={theme.inkFaint} strokeWidth={1.8} />
            <TextInput
              style={[styles.searchInput, { fontFamily: ui(), color: theme.ink }]}
              placeholder="Search tasks, ideas, projects"
              placeholderTextColor={theme.inkFaint}
              value={state.taskPickerSearch}
              onChangeText={text => ctx.dispatch({ type: 'SET_TASK_PICKER_SEARCH', text })}
            />
          </Card>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 26 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {groups.map(g => (
            <View key={g.label} style={{ marginTop: 14 }}>
              <View style={styles.groupHead}>
                <Text style={[styles.groupLabel, { fontFamily: ui(700), color: theme.inkFaint }]}>
                  {g.label.toUpperCase()}
                </Text>
                <Text style={[styles.groupCount, { fontFamily: ui(), color: theme.inkFaint }]}>
                  {g.count} task{g.count === 1 ? '' : 's'}
                </Text>
              </View>
              {g.ideas.map(({ idea, di, tasks }) => (
                <Card key={idea.id} radius={14} clip style={{ marginBottom: 10 }}>
                  <TouchableOpacity style={styles.ideaHead} onPress={() => ctx.openReader(idea.id)} activeOpacity={0.7}>
                    <Text style={[styles.ideaTitle, { fontFamily: disp(tk), color: theme.ink }]} numberOfLines={1}>
                      {idea.title || 'Untitled idea'}
                    </Text>
                    {di && (
                      <Text style={[styles.ideaDue, { fontFamily: ui(700), color: di.overdue ? '#C0492F' : theme.accent }]}>
                        {di.label}
                      </Text>
                    )}
                  </TouchableOpacity>
                  {tasks.map(({ c, idx }) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.taskRow, { borderTopColor: theme.line, backgroundColor: c.today ? theme.accentSoft : 'transparent' }]}
                      activeOpacity={0.7}
                      onPress={() => { hapticTap(); ctx.setTaskToday(idea.id, idx, !c.today); }}
                    >
                      <View
                        style={[
                          styles.taskBox,
                          { borderColor: c.today ? theme.accent : theme.line, backgroundColor: c.today ? theme.accent : 'transparent' },
                        ]}
                      >
                        {c.today && <Icon name="check" size={13} color="#fff" strokeWidth={3} />}
                      </View>
                      <Text style={[styles.taskText, { fontFamily: ui(), color: theme.ink }]}>{c.text}</Text>
                      {c.today && (
                        <View style={[styles.todayTag, { backgroundColor: theme.accentSoft }]}>
                          <Text style={[styles.todayTagText, { fontFamily: ui(700), color: theme.accentInk }]}>TODAY</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </Card>
              ))}
            </View>
          ))}

          {looseIdeas.length > 0 && (
            <View style={[styles.looseSection, { borderTopColor: theme.line }]}>
              <TouchableOpacity
                style={styles.looseHead}
                onPress={() => { hapticTap(); animateLayout(); setLooseOpen(!looseOpen); }}
              >
                <Text style={[styles.groupLabel, { fontFamily: ui(700), color: theme.inkFaint }]}>
                  IDEAS WITHOUT TASKS · {looseIdeas.length}
                </Text>
                <Text style={[styles.looseToggle, { fontFamily: ui(600), color: theme.accent }]}>
                  {looseOpen ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.looseHint, { fontFamily: ui(), color: theme.inkFaint }]}>
                So nothing slips — open one to give it a next step.
              </Text>
              {looseOpen &&
                looseIdeas.map(idea => (
                  <TouchableOpacity
                    key={idea.id}
                    activeOpacity={0.7}
                    onPress={() => ctx.openReader(idea.id)}
                    style={{ marginTop: 8 }}
                  >
                    <Card radius={12} style={styles.looseRow}>
                      <Text style={[styles.looseTitle, { fontFamily: ui(), color: theme.ink }]} numberOfLines={1}>
                        {idea.title || 'Untitled idea'}
                      </Text>
                      <Text style={[styles.looseDate, { fontFamily: ui(), color: theme.inkFaint }]}>
                        {ctx.fmtShort(idea.createdAt)}
                      </Text>
                      <Icon name="chevronRight" size={15} color={theme.inkFaint} strokeWidth={1.8} />
                    </Card>
                  </TouchableOpacity>
                ))}
            </View>
          )}

          {empty && (
            <Text style={[styles.emptyText, { fontFamily: ui(), color: theme.inkFaint }]}>
              {pq ? `Nothing matches "${state.taskPickerSearch.trim()}".` : 'No ideas yet — capture one and add a few steps.'}
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 250 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(28,26,20,0.34)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  handle: { width: 38, height: 4, borderRadius: 3, alignSelf: 'center', marginTop: 8, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 4 },
  title: { fontSize: 20, lineHeight: 22 },
  subtitle: { fontSize: 12.5, marginTop: 3 },
  done: { fontSize: 14, paddingTop: 4 },
  searchWrap: { paddingHorizontal: 22, paddingTop: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  searchInput: { flex: 1, fontSize: 14.5, padding: 0 },
  groupHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 2, paddingBottom: 9 },
  groupLabel: { fontSize: 11.5, letterSpacing: 0.5 },
  groupCount: { fontSize: 12 },
  ideaHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 9 },
  ideaTitle: { flex: 1, fontSize: 15, lineHeight: 19 },
  ideaDue: { fontSize: 11 },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  taskBox: { width: 21, height: 21, borderRadius: 7, borderWidth: 1.7, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  taskText: { flex: 1, fontSize: 14, lineHeight: 19 },
  todayTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  todayTagText: { fontSize: 10, letterSpacing: 0.3 },
  looseSection: { marginTop: 18, borderTopWidth: 1, paddingTop: 15 },
  looseHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  looseToggle: { fontSize: 12.5 },
  looseHint: { fontSize: 12, marginTop: 5, marginHorizontal: 2, lineHeight: 17 },
  looseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  looseTitle: { flex: 1, fontSize: 14 },
  looseDate: { fontSize: 11.5 },
  emptyText: { textAlign: 'center', fontSize: 13.5, lineHeight: 20, paddingVertical: 34, paddingHorizontal: 18 },
});
