import React, { useContext } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../AppContext';
import { useTheme } from '../theme';
import { disp, ui } from '../fonts';
import Icon from '../components/Icon';
import Card from '../components/Card';
import Checkbox from '../components/Checkbox';
import { hapticTap } from '../haptics';

export default function NoteReader() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const tk = theme.key;
  const insets = useSafeAreaInsets();
  const { state } = ctx;

  const idea = state.readerId !== null ? state.ideas.find(i => i.id === state.readerId) : null;
  if (!idea) return null;

  const di = idea.due ? ctx.dueInfo(idea.due) : null;
  const createdToday = ctx.dayKey(idea.createdAt) === ctx.dayKey(Date.now());
  const dateLabel = createdToday ? 'Captured today' : `Captured ${ctx.fmtShort(idea.createdAt)}`;
  const hasChecklist = idea.checklist.length > 0;
  const hasLinks = idea.links.length > 0;
  const hasSketches = idea.sketches.length > 0;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: theme.bg }]}>
      <View style={[styles.toolbar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={ctx.closeReader} hitSlop={6}>
          <Icon name="chevronLeft" size={18} color={theme.inkSoft} strokeWidth={1.9} />
          <Text style={[styles.backText, { fontFamily: ui(600), color: theme.inkSoft }]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.editBtn, { borderColor: theme.line, backgroundColor: theme.surface }]}
          onPress={ctx.editFromReader}
        >
          <Icon name="pencil" size={15} color={theme.accent} strokeWidth={1.8} />
          <Text style={[styles.editText, { fontFamily: ui(600), color: theme.ink }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { fontFamily: disp(tk), color: theme.ink }]}>
          {idea.title || 'Untitled idea'}
        </Text>

        <View style={styles.metaRow}>
          <Text style={[styles.metaDate, { fontFamily: ui(), color: theme.inkFaint }]}>{dateLabel}</Text>
          {!!idea.project && (
            <View style={[styles.metaChip, { backgroundColor: theme.accentSoft }]}>
              <Icon name="folder" size={12} color={theme.accentInk} strokeWidth={1.8} />
              <Text style={[styles.metaChipText, { fontFamily: ui(600), color: theme.accentInk }]}>{idea.project}</Text>
            </View>
          )}
          {di && (
            <View style={[styles.metaChip, { backgroundColor: di.overdue ? 'rgba(192,73,47,0.1)' : theme.accentSoft }]}>
              <Icon name="clock" size={12} color={di.overdue ? '#C0492F' : theme.accentInk} strokeWidth={1.8} />
              <Text style={[styles.metaChipText, { fontFamily: ui(600), color: di.overdue ? '#C0492F' : theme.accentInk }]}>
                {di.label}
              </Text>
            </View>
          )}
        </View>

        {idea.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {idea.tags.map(tag => (
              <View key={tag} style={[styles.tagChip, { backgroundColor: theme.accentSoft }]}>
                <Text style={[styles.tagText, { fontFamily: ui(600), color: theme.accentInk }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {!!idea.body.trim() && (
          <Text style={[styles.body, { fontFamily: ui(), color: theme.inkSoft }]}>{idea.body}</Text>
        )}

        {hasChecklist && (
          <View style={{ marginTop: 22 }}>
            <Text style={[styles.sectionTitle, { fontFamily: disp(tk), color: theme.ink }]}>Tasks</Text>
            <Card radius={14} clip>
              {idea.checklist.map((item, idx) => (
                <View
                  key={idx}
                  style={[styles.checkRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.line }]}
                >
                  <Checkbox
                    checked={item.done}
                    onToggle={() => ctx.toggleChk(idea.id, idx)}
                    accent={theme.accent}
                    line={theme.line}
                    size={21}
                    successOnCheck
                  />
                  <Text
                    style={[
                      styles.checkText,
                      {
                        fontFamily: ui(),
                        color: item.done ? theme.inkFaint : theme.ink,
                        textDecorationLine: item.done ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {item.text}
                  </Text>
                  <TouchableOpacity
                    onPress={() => { hapticTap(); ctx.setTaskToday(idea.id, idx, !item.today); }}
                    style={[
                      styles.todayPill,
                      {
                        borderColor: item.today ? theme.accent : theme.line,
                        backgroundColor: item.today ? theme.accentSoft : 'transparent',
                      },
                    ]}
                  >
                    <Icon name="sun" size={12} color={item.today ? theme.accentInk : theme.inkSoft} strokeWidth={2} />
                    <Text style={[styles.todayText, { fontFamily: ui(600), color: item.today ? theme.accentInk : theme.inkSoft }]}>
                      Today
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </Card>
          </View>
        )}

        {hasLinks && (
          <View style={{ marginTop: 20 }}>
            <Text style={[styles.sectionTitle, { fontFamily: disp(tk), color: theme.ink }]}>Links</Text>
            <View style={{ gap: 7 }}>
              {idea.links.map((link, idx) => (
                <Card key={idx} radius={12} style={styles.linkRow}>
                  <Icon name="link" size={15} color={theme.accent} strokeWidth={1.8} />
                  <Text style={[styles.linkText, { fontFamily: ui(), color: theme.ink }]} numberOfLines={1}>
                    {link.label}
                  </Text>
                </Card>
              ))}
            </View>
          </View>
        )}

        {hasSketches && (
          <View style={{ marginTop: 20 }}>
            <Text style={[styles.sectionTitle, { fontFamily: disp(tk), color: theme.ink }]}>Sketches</Text>
            <View style={styles.sketchGrid}>
              {idea.sketches.map((uri, idx) => (
                <Image key={idx} source={{ uri }} style={[styles.sketch, { borderColor: theme.line }]} resizeMode="cover" />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 200 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 8 },
  backText: { fontSize: 14 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 8 },
  editText: { fontSize: 13.5 },
  content: { paddingHorizontal: 22, paddingTop: 4 },
  title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  metaDate: { fontSize: 12.5 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20 },
  metaChipText: { fontSize: 12.5 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  tagChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  tagText: { fontSize: 12.5 },
  body: { fontSize: 16, lineHeight: 26, marginTop: 18 },
  sectionTitle: { fontSize: 16, marginBottom: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 12, paddingHorizontal: 14 },
  checkText: { flex: 1, fontSize: 14.5, lineHeight: 20 },
  todayPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 18, paddingHorizontal: 9, paddingVertical: 5 },
  todayText: { fontSize: 11.5 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 11 },
  linkText: { flex: 1, fontSize: 13.5 },
  sketchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sketch: { width: 104, height: 104, borderRadius: 13, borderWidth: 1 },
});
