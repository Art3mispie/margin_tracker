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
import Checkbox from '../components/Checkbox';
import { animateLayout } from '../anim';
import { hapticTap } from '../haptics';
import type { Idea, ChecklistItem } from '../types';

interface TaskItem {
  idea: Idea;
  task: ChecklistItem;
  idx: number;
}

export default function PlanDaySheet() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = ctx;
  const [looseExpanded, setLooseExpanded] = useState(false);

  if (!state.taskPickerOpen) return null;

  const allActive = ctx.active();
  const now = Date.now();

  const getTasks = (idea: Idea): TaskItem[] =>
    idea.checklist
      .map((task, idx) => ({ idea, task, idx }))
      .filter(x => !x.task.done);

  const q = state.taskPickerSearch.toLowerCase();
  const filterIdeas = (list: Idea[]) =>
    q
      ? list.filter(
          i =>
            i.title.toLowerCase().includes(q) ||
            i.checklist.some(c => c.text.toLowerCase().includes(q))
        )
      : list;

  const overdueIdeas = filterIdeas(
    allActive.filter(i => i.due && i.due < now)
  );
  const thisWeekIdeas = filterIdeas(
    allActive.filter(i => {
      if (!i.due || i.due < now) return false;
      return i.due <= now + 7 * 86400000;
    })
  );
  const anytimeIdeas = filterIdeas(
    allActive.filter(i => !i.due || i.due > now + 7 * 86400000)
  );
  const noTaskIdeas = filterIdeas(
    allActive.filter(i => i.checklist.length === 0)
  );

  const todayCount = allActive.reduce((acc, idea) => {
    return acc + idea.checklist.filter(c => c.today && !c.done).length;
  }, 0);

  const renderTaskGroup = (title: string, ideas: Idea[]) => {
    const hasTasks = ideas.some(i => i.checklist.some(c => !c.done));
    if (!hasTasks && ideas.length === 0) return null;
    const ideasWithTasks = ideas.filter(i => getTasks(i).length > 0);
    if (ideasWithTasks.length === 0) return null;

    return (
      <View style={styles.group}>
        <Text style={[styles.groupLabel, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
          {title.toUpperCase()}
        </Text>
        {ideasWithTasks.map(idea => (
          <View key={idea.id} style={[styles.ideaBlock, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Text style={[styles.ideaTitle, { fontFamily: theme.fuiFamily, color: theme.ink }]} numberOfLines={1}>
              {idea.title}
            </Text>
            {getTasks(idea).map(({ task, idx }) => {
              const isToday = !!task.today;
              return (
                <View key={idx} style={styles.taskRow}>
                  <Checkbox
                    checked={isToday}
                    onToggle={() => ctx.setTaskToday(idea.id, idx, !isToday)}
                    accent={theme.accent}
                    line={theme.inkFaint}
                    size={22}
                  />
                  <Text style={[
                    styles.taskText,
                    { fontFamily: theme.fuiFamily, color: isToday ? theme.ink : theme.inkSoft },
                  ]}>
                    {task.text}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[
          styles.sheet,
          { backgroundColor: theme.bg, paddingTop: insets.top },
        ]}>
          {/* Toolbar */}
          <View style={[styles.toolbar, { borderBottomColor: theme.line }]}>
            <View style={styles.toolbarLeft}>
              <Text style={[styles.sheetTitle, { fontFamily: theme.fdispFamily, color: theme.ink }]}>
                Plan your day
              </Text>
              {todayCount > 0 && (
                <Text style={[styles.taskCount, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                  {todayCount} chosen
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: theme.accent }]}
              onPress={ctx.closeTaskPicker}
            >
              <Text style={[styles.doneBtnText, { fontFamily: theme.fuiFamily }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.line, margin: 16, marginBottom: 0 }]}>
            <Text style={{ color: theme.inkFaint, fontSize: 15 }}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { fontFamily: theme.fuiFamily, color: theme.ink }]}
              placeholder="Search tasks…"
              placeholderTextColor={theme.inkFaint}
              value={state.taskPickerSearch}
              onChangeText={text => ctx.dispatch({ type: 'SET_TASK_PICKER_SEARCH', text })}
            />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderTaskGroup('Overdue', overdueIdeas)}
            {renderTaskGroup('This week', thisWeekIdeas)}
            {renderTaskGroup('Anytime', anytimeIdeas)}

            {/* Ideas without tasks */}
            {noTaskIdeas.length > 0 && (
              <TouchableOpacity
                style={styles.looseToggle}
                onPress={() => { hapticTap(); animateLayout(); setLooseExpanded(!looseExpanded); }}
              >
                <Text style={[styles.looseLabel, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                  Ideas without tasks · {noTaskIdeas.length}
                </Text>
                <Text style={{ color: theme.inkFaint }}>{looseExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>
            )}
            {looseExpanded && noTaskIdeas.map(idea => (
              <TouchableOpacity
                key={idea.id}
                style={[styles.looseIdea, { backgroundColor: theme.surface, borderColor: theme.line }]}
                onPress={() => ctx.openNote(idea.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.looseIdeaTitle, { fontFamily: theme.fuiFamily, color: theme.inkSoft }]} numberOfLines={1}>
                  {idea.title}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={{ height: 80 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 250,
  },
  sheet: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarLeft: {
    gap: 2,
  },
  sheetTitle: {
    fontSize: 20,
  },
  taskCount: {
    fontSize: 13,
  },
  doneBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 11,
  },
  doneBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  group: {
    gap: 10,
  },
  groupLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
  ideaBlock: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  ideaTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 3,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  taskText: {
    flex: 1,
    fontSize: 14,
  },
  looseToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  looseLabel: {
    fontSize: 14,
  },
  looseIdea: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  looseIdeaTitle: {
    fontSize: 14,
  },
});
