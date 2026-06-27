import React, { useContext, useState } from 'react';
import {
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AppContext } from '../AppContext';
import { useTheme } from '../theme';
import { disp, ui } from '../fonts';
import Icon from '../components/Icon';
import Card from '../components/Card';
import Checkbox from '../components/Checkbox';
import { animateLayout } from '../anim';
import { hapticTap, hapticSuccess, hapticWarning } from '../haptics';
import { playSound } from '../sound';

const SKETCH_DIR = FileSystem.documentDirectory ? FileSystem.documentDirectory + 'sketches/' : null;

export default function NoteEditor() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const tk = theme.key;
  const insets = useSafeAreaInsets();
  const { state } = ctx;

  const idea = state.noteId !== null ? state.ideas.find(i => i.id === state.noteId) : null;

  const [newTask, setNewTask] = useState('');
  const [newTagText, setNewTagText] = useState('');
  const [newLink, setNewLink] = useState('');

  if (!idea) return null;

  const di = idea.due ? ctx.dueInfo(idea.due) : null;
  const createdToday = ctx.dayKey(idea.createdAt) === ctx.dayKey(Date.now());
  const savedLabel = createdToday ? 'Saved' : `Saved · ${ctx.fmtShort(idea.createdAt)}`;

  const tagMap: Record<string, number> = {};
  ctx.active().forEach(i => i.tags.forEach(t => (tagMap[t] = (tagMap[t] || 0) + 1)));
  const suggestedTags = Object.keys(tagMap)
    .sort((a, b) => tagMap[b] - tagMap[a])
    .filter(t => !idea.tags.includes(t))
    .slice(0, 8);
  const existingProjects = Array.from(
    new Set(ctx.active().filter(i => i.project).map(i => i.project as string))
  );
  if (idea.project && !existingProjects.includes(idea.project)) existingProjects.push(idea.project);

  const showChecklist = !!idea.extras.checklist || idea.checklist.length > 0;
  const showSketch = !!idea.extras.sketch;
  const showLinks = !!idea.extras.links || idea.links.length > 0;
  const hasExtras = showChecklist || showSketch || showLinks;
  const addOptions = [
    !showChecklist && { label: 'Checklist', kind: 'checklist' as const },
    !showSketch && { label: 'Sketch', kind: 'sketch' as const },
    !showLinks && { label: 'Link', kind: 'links' as const },
  ].filter(Boolean) as Array<{ label: string; kind: 'checklist' | 'sketch' | 'links' }>;

  const handleAddTask = () => {
    if (!newTask.trim()) return;
    animateLayout();
    ctx.patch(idea.id, {
      checklist: [...idea.checklist, { text: newTask.trim(), done: false }],
      extras: { ...idea.extras, checklist: true },
    });
    setNewTask('');
  };

  const handleAddTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, '').replace(/\s+/g, '-').toLowerCase();
    if (t) ctx.addTagToNote(idea.id, t);
    setNewTagText('');
  };

  const handleAddLink = () => {
    if (!newLink.trim()) return;
    animateLayout();
    ctx.patch(idea.id, {
      links: [...idea.links, { label: newLink.trim() }],
      extras: { ...idea.extras, links: true },
    });
    setNewLink('');
  };

  const setDueQuick = (offset: number | null) => {
    if (offset === null) {
      ctx.setDue(idea.id, null);
    } else {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      d.setHours(17, 0, 0, 0);
      ctx.setDue(idea.id, d.getTime());
    }
    ctx.dispatch({ type: 'SET_META_PANEL', panel: null });
  };

  const thisWeekendOffset = () => {
    const day = new Date().getDay();
    return (6 - day + 7) % 7 || 6;
  };

  const handleAddSketch = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      const picked = result.assets?.[0]?.uri;
      if (result.canceled || !picked) return;
      animateLayout();
      let stored = picked;
      if (SKETCH_DIR) {
        try {
          await FileSystem.makeDirectoryAsync(SKETCH_DIR, { intermediates: true });
        } catch {
          // already exists
        }
        const ext = (picked.split('.').pop() || 'jpg').split('?')[0];
        const dest = `${SKETCH_DIR}${idea.id}-${Date.now()}.${ext}`;
        await FileSystem.copyAsync({ from: picked, to: dest });
        stored = dest;
      }
      ctx.addSketch(idea.id, stored);
    } catch {
      // cancelled / denied
    }
  };

  const handleRemoveSketch = (idx: number) => {
    const uri = idea.sketches[idx];
    animateLayout();
    ctx.removeSketch(idea.id, idx);
    if (uri && SKETCH_DIR && uri.startsWith(SKETCH_DIR)) {
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    }
  };

  const togglePanel = (panel: 'project' | 'due') => {
    animateLayout();
    ctx.dispatch({ type: 'SET_META_PANEL', panel: state.metaPanel === panel ? null : panel });
  };

  // Remove-an-extra control shown beside each Extras section header.
  const EXTRA_LABEL = { checklist: 'Checklist', sketch: 'Sketches', links: 'Links' } as const;
  const RemoveExtra = ({ kind }: { kind: 'checklist' | 'sketch' | 'links' }) => {
    const hasData =
      (kind === 'checklist' && idea.checklist.length > 0) ||
      (kind === 'sketch' && idea.sketches.length > 0) ||
      (kind === 'links' && idea.links.length > 0);
    const remove = () => { hapticTap(); animateLayout(); ctx.removeExtra(idea.id, kind); };
    return (
      <TouchableOpacity
        onPress={() => {
          if (hasData) {
            Alert.alert(`Remove ${EXTRA_LABEL[kind]}?`, 'This clears its contents from the note.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: remove },
            ]);
          } else {
            remove();
          }
        }}
        hitSlop={8}
        style={styles.removeExtraBtn}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${EXTRA_LABEL[kind]} section`}
      >
        <Text style={[styles.removeExtraText, { fontFamily: ui(600), color: theme.inkFaint }]}>Remove</Text>
      </TouchableOpacity>
    );
  };

  const dueChipColor = di ? (di.overdue ? '#C0492F' : theme.accentInk) : theme.inkSoft;
  const dueChipBg = di ? (di.overdue ? 'rgba(192,73,47,0.1)' : theme.accentSoft) : theme.surface;
  const dueChipBorder = di && di.overdue ? 'rgba(192,73,47,0.3)' : theme.line;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Toolbar */}
        <View style={[styles.toolbar, { paddingTop: insets.top + 6 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={ctx.closeNote} hitSlop={6}>
            <Icon name="chevronLeft" size={18} color={theme.inkSoft} strokeWidth={1.9} />
            <Text style={[styles.backText, { fontFamily: ui(600), color: theme.inkSoft }]}>Done</Text>
          </TouchableOpacity>
          <View style={styles.toolbarRight}>
            <Text style={[styles.saved, { fontFamily: ui(), color: theme.inkFaint }]}>{savedLabel}</Text>
            <TouchableOpacity
              onPress={() => ctx.dispatch({ type: 'SET_NOTE_MENU', open: !state.noteMenuOpen })}
              hitSlop={6}
              style={{ padding: 6 }}
              accessibilityRole="button"
              accessibilityLabel="More actions"
            >
              <Icon name="dots" size={20} color={theme.inkSoft} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <TextInput
            style={[styles.titleInput, { fontFamily: disp(tk), color: theme.ink }]}
            value={idea.title}
            onChangeText={text => ctx.patch(idea.id, { title: text })}
            placeholder="Untitled idea"
            placeholderTextColor={theme.inkFaint}
            multiline
            textAlignVertical="top"
            autoFocus={!idea.title}
          />

          {/* Meta pills */}
          <View style={styles.metaPills}>
            <TouchableOpacity
              style={[styles.pill, { borderColor: theme.line, backgroundColor: idea.project ? theme.accentSoft : theme.surface }]}
              onPress={() => togglePanel('project')}
            >
              <Icon name="folder" size={13} color={idea.project ? theme.accentInk : theme.inkSoft} strokeWidth={1.8} />
              <Text style={[styles.pillText, { fontFamily: ui(600), color: idea.project ? theme.accentInk : theme.inkSoft }]}>
                {idea.project || 'No project'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, { borderColor: dueChipBorder, backgroundColor: dueChipBg }]}
              onPress={() => togglePanel('due')}
            >
              <Icon name="clock" size={13} color={dueChipColor} strokeWidth={1.8} />
              <Text style={[styles.pillText, { fontFamily: ui(600), color: dueChipColor }]}>
                {di ? di.label : 'Add due date'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Project panel */}
          {state.metaPanel === 'project' && (
            <Card radius={14} style={styles.panel}>
              <View style={styles.panelChips}>
                <TouchableOpacity
                  style={[styles.optChip, { borderColor: theme.line, backgroundColor: theme.bg }]}
                  onPress={() => { ctx.setProject(idea.id, null); ctx.dispatch({ type: 'SET_META_PANEL', panel: null }); }}
                >
                  <Text style={[styles.optText, { fontFamily: ui(600), color: theme.inkSoft }]}>None</Text>
                </TouchableOpacity>
                {existingProjects.map(proj => {
                  const active = idea.project === proj;
                  return (
                    <TouchableOpacity
                      key={proj}
                      style={[styles.optChip, { borderColor: active ? theme.accent : theme.line, backgroundColor: active ? theme.accent : theme.bg }]}
                      onPress={() => { ctx.setProject(idea.id, proj); ctx.dispatch({ type: 'SET_META_PANEL', panel: null }); }}
                    >
                      <Text style={[styles.optText, { fontFamily: ui(600), color: active ? '#fff' : theme.ink }]}>{proj}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                style={[styles.panelNew, { borderTopColor: theme.line }]}
                onPress={() => { ctx.dispatch({ type: 'SET_META_PANEL', panel: null }); ctx.startNewProject(); }}
              >
                <Text style={[styles.optText, { fontFamily: ui(500), color: theme.accent }]}>+ New project…</Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* Due panel */}
          {state.metaPanel === 'due' && (
            <Card radius={14} style={styles.panel}>
              <View style={styles.panelChips}>
                {[
                  { label: 'Today', offset: 0 },
                  { label: 'Tomorrow', offset: 1 },
                  { label: 'This weekend', offset: thisWeekendOffset() },
                  { label: 'Next week', offset: 7 },
                  { label: 'Clear', offset: null as number | null },
                ].map(({ label, offset }) => (
                  <TouchableOpacity
                    key={label}
                    style={[styles.optChip, { borderColor: theme.line, backgroundColor: theme.bg }]}
                    onPress={() => setDueQuick(offset)}
                  >
                    <Text style={[styles.optText, { fontFamily: ui(600), color: label === 'Clear' ? theme.inkFaint : theme.ink }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          )}

          {/* Tags */}
          <View style={styles.tagsRow}>
            {idea.tags.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, { backgroundColor: theme.accentSoft }]}
                onPress={() => ctx.removeTag(idea.id, tag)}
              >
                <Text style={[styles.tagText, { fontFamily: ui(600), color: theme.accentInk }]}>#{tag}</Text>
                <Text style={[styles.tagX, { color: theme.accentInk }]}>×</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={[styles.tagInput, { fontFamily: ui(), color: theme.ink }]}
              placeholder="+ custom"
              placeholderTextColor={theme.inkFaint}
              value={newTagText}
              onChangeText={setNewTagText}
              onSubmitEditing={() => handleAddTag(newTagText)}
              blurOnSubmit={false}
              autoCapitalize="none"
            />
          </View>
          {suggestedTags.length > 0 && (
            <View style={{ marginTop: 9 }}>
              <Text style={[styles.suggestLabel, { fontFamily: ui(600), color: theme.inkFaint }]}>SUGGESTED</Text>
              <View style={styles.suggestRow}>
                {suggestedTags.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.suggestChip, { borderColor: theme.line }]}
                    onPress={() => ctx.addTagToNote(idea.id, tag)}
                  >
                    <Text style={[styles.optText, { fontFamily: ui(600), color: theme.inkSoft }]}>#{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Body */}
          <TextInput
            style={[styles.bodyInput, { fontFamily: ui(), color: theme.inkSoft }]}
            value={idea.body}
            onChangeText={text => ctx.patch(idea.id, { body: text })}
            placeholder="Start writing… thoughts, context, the long version."
            placeholderTextColor={theme.inkFaint}
            multiline
            textAlignVertical="top"
          />

          {/* Extras */}
          {hasExtras && (
            <View style={[styles.extras, { borderTopColor: theme.line }]}>
              <Text style={[styles.extrasLabel, { fontFamily: ui(700), color: theme.inkFaint }]}>EXTRAS</Text>

              {showChecklist && (
                <View style={{ marginTop: 14 }}>
                  <View style={styles.extraHead}>
                    <Text style={[styles.extraTitle, { fontFamily: disp(tk), color: theme.ink }]}>Checklist</Text>
                    <View style={styles.extraHeadRight}>
                      <Text style={[styles.dim, { fontFamily: ui(), color: theme.inkFaint }]}>
                        {idea.checklist.length
                          ? `${idea.checklist.filter(c => c.done).length} of ${idea.checklist.length} done`
                          : 'Nothing yet'}
                      </Text>
                      <RemoveExtra kind="checklist" />
                    </View>
                  </View>
                  {idea.checklist.map((item, idx) => (
                    <View key={idx} style={styles.checkRow}>
                      <Checkbox
                        checked={item.done}
                        onToggle={() => ctx.toggleChk(idea.id, idx)}
                        accent={theme.accent}
                        line={theme.line}
                        size={21}
                        successOnCheck
                        label={item.text}
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
                        onPress={() => { hapticTap(); animateLayout(); ctx.removeChk(idea.id, idx); }}
                        hitSlop={8}
                      >
                        <Text style={[styles.removeX, { color: theme.inkFaint }]}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View style={styles.checkRow}>
                    <View style={[styles.addBox, { borderColor: theme.line }]} />
                    <TextInput
                      style={[styles.addInput, { fontFamily: ui(), color: theme.ink }]}
                      placeholder="Add a step…"
                      placeholderTextColor={theme.inkFaint}
                      value={newTask}
                      onChangeText={setNewTask}
                      onSubmitEditing={handleAddTask}
                      blurOnSubmit={false}
                    />
                  </View>
                </View>
              )}

              {showSketch && (
                <View style={{ marginTop: 18 }}>
                  <View style={styles.extraHead}>
                    <Text style={[styles.extraTitle, { fontFamily: disp(tk), color: theme.ink }]}>Sketches</Text>
                    <RemoveExtra kind="sketch" />
                  </View>
                  <View style={styles.sketchRow}>
                    {idea.sketches.map((uri, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.sketchSlot, { borderColor: theme.line }]}
                        onLongPress={() => handleRemoveSketch(idx)}
                        activeOpacity={0.85}
                      >
                        <Image source={{ uri }} style={styles.sketchImg} resizeMode="cover" />
                      </TouchableOpacity>
                    ))}
                    {idea.sketches.length < 2 && (
                      <TouchableOpacity
                        style={[styles.sketchSlot, styles.sketchAdd, { borderColor: theme.line }]}
                        onPress={handleAddSketch}
                        activeOpacity={0.7}
                      >
                        <Icon name="plus" size={18} color={theme.inkFaint} strokeWidth={2} />
                        <Text style={[styles.sketchAddText, { fontFamily: ui(), color: theme.inkFaint }]}>Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {showLinks && (
                <View style={{ marginTop: 18 }}>
                  <View style={styles.extraHead}>
                    <Text style={[styles.extraTitle, { fontFamily: disp(tk), color: theme.ink }]}>Links</Text>
                    <RemoveExtra kind="links" />
                  </View>
                  <View style={{ marginTop: 9, gap: 7 }}>
                    {idea.links.map((link, idx) => (
                      <Card key={idx} radius={12} style={styles.linkRow}>
                        <Icon name="link" size={15} color={theme.accent} strokeWidth={1.8} />
                        <Text style={[styles.linkText, { fontFamily: ui(), color: theme.ink }]} numberOfLines={1}>
                          {link.label}
                        </Text>
                        <TouchableOpacity onPress={() => { animateLayout(); ctx.removeLink(idea.id, idx); }} hitSlop={8}>
                          <Text style={[styles.removeX, { color: theme.inkFaint }]}>×</Text>
                        </TouchableOpacity>
                      </Card>
                    ))}
                    <TextInput
                      style={[styles.linkInput, { borderColor: theme.line, fontFamily: ui(), color: theme.ink }]}
                      placeholder="Paste a link or reference…"
                      placeholderTextColor={theme.inkFaint}
                      value={newLink}
                      onChangeText={setNewLink}
                      onSubmitEditing={handleAddLink}
                      blurOnSubmit={false}
                    />
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Add extras */}
          <View style={styles.addExtras}>
            {addOptions.map(opt => (
              <TouchableOpacity
                key={opt.kind}
                style={[styles.addExtraBtn, { borderColor: theme.line, backgroundColor: theme.surface }]}
                onPress={() => { animateLayout(); ctx.addExtra(idea.id, opt.kind); }}
              >
                <Icon name="plus" size={14} color={theme.accent} strokeWidth={2} />
                <Text style={[styles.addExtraText, { fontFamily: ui(600), color: theme.inkSoft }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Note ••• menu */}
        {state.noteMenuOpen && (
          <>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => ctx.dispatch({ type: 'SET_NOTE_MENU', open: false })}
            />
            <View style={[styles.noteMenu, { top: insets.top + 44, backgroundColor: theme.surface, borderColor: theme.line }]}>
              <TouchableOpacity
                style={styles.noteMenuItem}
                onPress={() => {
                  hapticTap();
                  ctx.dispatch({ type: 'SET_NOTE_MENU', open: false });
                  ctx.toggleImportant(idea.id);
                }}
              >
                <Icon name="star" size={16} color={idea.important ? '#C8902B' : theme.inkSoft} strokeWidth={1.7} />
                <Text style={[styles.noteMenuText, { fontFamily: ui(), color: theme.ink }]}>
                  {idea.important ? 'Remove flag' : 'Flag as important'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.noteMenuItem}
                onPress={() => {
                  hapticSuccess();
                  playSound('archive');
                  ctx.dispatch({ type: 'SET_NOTE_MENU', open: false });
                  ctx.archiveNote();
                }}
              >
                <Icon name="archive" size={16} color={theme.inkSoft} strokeWidth={1.7} />
                <Text style={[styles.noteMenuText, { fontFamily: ui(), color: theme.ink }]}>
                  {idea.archived ? 'Unarchive' : 'Archive'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.noteMenuItem}
                onPress={() => {
                  hapticWarning();
                  ctx.dispatch({ type: 'SET_NOTE_MENU', open: false });
                  ctx.deleteNote();
                }}
              >
                <Icon name="trash" size={16} color="#C0492F" strokeWidth={1.7} />
                <Text style={[styles.noteMenuText, { fontFamily: ui(), color: '#C0492F' }]}>Delete idea</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 300 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 10 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 8 },
  backText: { fontSize: 14 },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  saved: { fontSize: 12, marginRight: 4 },
  content: { paddingHorizontal: 22, paddingTop: 4 },
  titleInput: { fontSize: 26, lineHeight: 32, letterSpacing: -0.3, minHeight: 34, padding: 0 },

  metaPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontSize: 12.5 },

  panel: { marginTop: 10, padding: 12 },
  panelChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  optChip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6 },
  optText: { fontSize: 12.5 },
  panelNew: { marginTop: 10, paddingTop: 9, borderTopWidth: 1 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginTop: 14 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  tagText: { fontSize: 12.5 },
  tagX: { fontSize: 14, lineHeight: 14, opacity: 0.6 },
  tagInput: { fontSize: 12.5, minWidth: 74, paddingVertical: 5, padding: 0 },
  suggestLabel: { fontSize: 11, letterSpacing: 0.3, marginBottom: 7 },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  suggestChip: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5 },

  bodyInput: { fontSize: 16, lineHeight: 26, minHeight: 150, marginTop: 16, padding: 0 },

  extras: { marginTop: 8, borderTopWidth: 1, paddingTop: 18 },
  extrasLabel: { fontSize: 11.5, letterSpacing: 0.5 },
  extraHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  extraHeadRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  removeExtraBtn: { paddingVertical: 2, paddingHorizontal: 4 },
  removeExtraText: { fontSize: 12.5 },
  extraTitle: { fontSize: 16 },
  dim: { fontSize: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 9 },
  checkText: { flex: 1, fontSize: 14.5, lineHeight: 20 },
  removeX: { fontSize: 17, lineHeight: 20, paddingHorizontal: 2 },
  addBox: { width: 21, height: 21, borderRadius: 7, borderWidth: 1.7, borderStyle: 'dashed', marginTop: 1 },
  addInput: { flex: 1, fontSize: 14.5, padding: 0 },

  sketchRow: { flexDirection: 'row', gap: 10, marginTop: 9 },
  sketchSlot: { flex: 1, aspectRatio: 1, borderRadius: 13, borderWidth: 1, overflow: 'hidden' },
  sketchImg: { width: '100%', height: '100%' },
  sketchAdd: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', gap: 4 },
  sketchAddText: { fontSize: 12 },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 11 },
  linkText: { flex: 1, fontSize: 13.5 },
  linkInput: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, fontSize: 13.5 },

  addExtras: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  addExtraBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 8 },
  addExtraText: { fontSize: 13 },

  noteMenu: {
    position: 'absolute',
    right: 18,
    width: 188,
    borderWidth: 1,
    borderRadius: 15,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 24,
  },
  noteMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10 },
  noteMenuText: { fontSize: 14 },
});
