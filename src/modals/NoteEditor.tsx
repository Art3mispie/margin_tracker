import React, { useContext, useState } from 'react';
import {
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
import * as FileSystem from 'expo-file-system';
import { AppContext } from '../AppContext';
import { useTheme } from '../theme';
import Checkbox from '../components/Checkbox';
import { animateLayout } from '../anim';
import { hapticTap, hapticSuccess, hapticWarning } from '../haptics';
import { playSound } from '../sound';

const SKETCH_DIR = FileSystem.documentDirectory
  ? FileSystem.documentDirectory + 'sketches/'
  : null;

export default function NoteEditor() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = ctx;

  const idea = state.noteId !== null
    ? state.ideas.find(i => i.id === state.noteId)
    : null;

  const [newTask, setNewTask] = useState('');
  const [newTagText, setNewTagText] = useState('');
  const [newLink, setNewLink] = useState('');

  if (!idea) return null;

  const due = idea.due ? ctx.dueInfo(idea.due) : null;

  const allTags = Array.from(
    new Set(ctx.active().flatMap(i => i.tags))
  ).sort();
  const suggestedTags = allTags.filter(t => !idea.tags.includes(t));

  const existingProjects = Array.from(
    new Set(ctx.active().filter(i => i.project).map(i => i.project as string))
  ).sort();

  const handleAddTask = () => {
    if (!newTask.trim()) return;
    const checklist = [...idea.checklist, { text: newTask.trim(), done: false }];
    animateLayout();
    ctx.patch(idea.id, { checklist });
    setNewTask('');
  };

  const handleAddTag = (tag: string) => {
    const t = tag.trim().replace(/^#/, '').toLowerCase();
    if (t && !idea.tags.includes(t)) {
      ctx.addTagToNote(idea.id, t);
    }
    setNewTagText('');
  };

  const handleAddLink = () => {
    if (!newLink.trim()) return;
    const links = [...idea.links, { label: newLink.trim() }];
    animateLayout();
    ctx.patch(idea.id, { links });
    setNewLink('');
  };

  const handleAddSketch = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      const picked = result.assets?.[0]?.uri;
      if (result.canceled || !picked) return;
      animateLayout();

      // Copy into the app's document directory so the image survives relaunches
      // (the picker's cache URI can be purged by the OS).
      let stored = picked;
      if (SKETCH_DIR) {
        try {
          await FileSystem.makeDirectoryAsync(SKETCH_DIR, { intermediates: true });
        } catch {
          // Directory already exists — fine.
        }
        const ext = (picked.split('.').pop() || 'jpg').split('?')[0];
        const dest = `${SKETCH_DIR}${idea.id}-${Date.now()}.${ext}`;
        await FileSystem.copyAsync({ from: picked, to: dest });
        stored = dest;
      }
      ctx.addSketch(idea.id, stored);
    } catch {
      // Permission denied, cancelled, or copy failed — leave the note unchanged.
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

  const setDueQuick = (offset: number | null) => {
    if (offset === null) {
      ctx.setDue(idea.id, null);
    } else {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      d.setHours(23, 59, 0, 0);
      ctx.setDue(idea.id, d.getTime());
    }
    ctx.dispatch({ type: 'SET_META_PANEL', panel: null });
  };

  const getThisWeekend = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = day <= 6 ? 6 - day : 0;
    return diff;
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[
          styles.sheet,
          { backgroundColor: theme.bg, paddingTop: insets.top },
        ]}>
          {/* Toolbar */}
          <View style={[styles.toolbar, { borderBottomColor: theme.line }]}>
            <TouchableOpacity onPress={ctx.closeNote}>
              <Text style={[styles.doneBtn, { fontFamily: theme.fuiFamily, color: theme.accent }]}>
                Done
              </Text>
            </TouchableOpacity>
            <View style={styles.toolbarRight}>
              <Text style={[styles.savedLabel, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                Saved · {ctx.fmtShort(idea.createdAt)}
              </Text>
              <TouchableOpacity
                onPress={() => ctx.dispatch({ type: 'SET_NOTE_MENU', open: !state.noteMenuOpen })}
              >
                <Text style={[styles.menuBtn, { color: theme.inkSoft }]}>⋯</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Note menu */}
          {state.noteMenuOpen && (
            <View style={[styles.noteMenu, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <TouchableOpacity
                style={styles.noteMenuItem}
                onPress={() => {
                  hapticSuccess();
                  playSound('archive');
                  ctx.dispatch({ type: 'SET_NOTE_MENU', open: false });
                  ctx.archiveNote();
                }}
              >
                <Text style={[styles.noteMenuText, { fontFamily: theme.fuiFamily, color: theme.ink }]}>
                  {idea.archived ? 'Unarchive' : 'Archive'}
                </Text>
              </TouchableOpacity>
              <View style={[styles.menuDivider, { backgroundColor: theme.line }]} />
              <TouchableOpacity
                style={styles.noteMenuItem}
                onPress={() => {
                  hapticWarning();
                  ctx.dispatch({ type: 'SET_NOTE_MENU', open: false });
                  ctx.deleteNote();
                }}
              >
                <Text style={[styles.noteMenuText, { fontFamily: theme.fuiFamily, color: '#DC2626' }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <TextInput
              style={[styles.titleInput, { fontFamily: theme.fdispFamily, color: theme.ink }]}
              value={idea.title}
              onChangeText={text => ctx.patch(idea.id, { title: text })}
              placeholder="Idea title…"
              placeholderTextColor={theme.inkFaint}
              multiline
              textAlignVertical="top"
              autoFocus={!idea.title}
            />

            {/* Meta chips */}
            <View style={styles.metaChips}>
              {/* Project */}
              <TouchableOpacity
                style={[
                  styles.metaChip,
                  {
                    backgroundColor: idea.project ? theme.accentSoft : theme.canvas,
                    borderColor: theme.line,
                  },
                ]}
                onPress={() => {
                  animateLayout();
                  ctx.dispatch({
                    type: 'SET_META_PANEL',
                    panel: state.metaPanel === 'project' ? null : 'project',
                  });
                }}
              >
                <Text style={[
                  styles.metaChipText,
                  { fontFamily: theme.fuiFamily, color: idea.project ? theme.accent : theme.inkSoft },
                ]}>
                  {idea.project || '+ Project'}
                </Text>
              </TouchableOpacity>

              {/* Due */}
              <TouchableOpacity
                style={[
                  styles.metaChip,
                  {
                    backgroundColor: idea.due ? (due?.overdue ? '#FEE2E2' : theme.accentSoft) : theme.canvas,
                    borderColor: theme.line,
                  },
                ]}
                onPress={() => {
                  animateLayout();
                  ctx.dispatch({
                    type: 'SET_META_PANEL',
                    panel: state.metaPanel === 'due' ? null : 'due',
                  });
                }}
              >
                <Text style={[
                  styles.metaChipText,
                  {
                    fontFamily: theme.fuiFamily,
                    color: idea.due
                      ? (due?.overdue ? '#DC2626' : theme.accent)
                      : theme.inkSoft,
                  },
                ]}>
                  {due ? due.label : '+ Due date'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Project panel */}
            {state.metaPanel === 'project' && (
              <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.line }]}>
                <TouchableOpacity
                  style={styles.panelItem}
                  onPress={() => {
                    ctx.setProject(idea.id, null);
                    ctx.dispatch({ type: 'SET_META_PANEL', panel: null });
                  }}
                >
                  <Text style={[styles.panelItemText, { fontFamily: theme.fuiFamily, color: theme.inkSoft }]}>
                    None
                  </Text>
                  {!idea.project && <Text style={{ color: theme.accent }}>✓</Text>}
                </TouchableOpacity>
                {existingProjects.map(proj => (
                  <TouchableOpacity
                    key={proj}
                    style={[styles.panelItem, { borderTopWidth: 1, borderTopColor: theme.line }]}
                    onPress={() => {
                      ctx.setProject(idea.id, proj);
                      ctx.dispatch({ type: 'SET_META_PANEL', panel: null });
                    }}
                  >
                    <Text style={[styles.panelItemText, { fontFamily: theme.fuiFamily, color: theme.ink }]}>
                      {proj}
                    </Text>
                    {idea.project === proj && <Text style={{ color: theme.accent }}>✓</Text>}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.panelItem, { borderTopWidth: 1, borderTopColor: theme.line }]}
                  onPress={() => {
                    ctx.dispatch({ type: 'SET_META_PANEL', panel: null });
                    ctx.startNewProject();
                  }}
                >
                  <Text style={[styles.panelItemText, { fontFamily: theme.fuiFamily, color: theme.accent }]}>
                    + New project
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Due panel */}
            {state.metaPanel === 'due' && (
              <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.line }]}>
                {[
                  { label: 'Today', offset: 0 },
                  { label: 'Tomorrow', offset: 1 },
                  { label: 'This weekend', offset: getThisWeekend() },
                  { label: 'Next week', offset: 7 },
                ].map(({ label, offset }) => (
                  <TouchableOpacity
                    key={label}
                    style={[styles.panelItem, { borderTopWidth: 1, borderTopColor: theme.line }]}
                    onPress={() => setDueQuick(offset)}
                  >
                    <Text style={[styles.panelItemText, { fontFamily: theme.fuiFamily, color: theme.ink }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
                {idea.due && (
                  <TouchableOpacity
                    style={[styles.panelItem, { borderTopWidth: 1, borderTopColor: theme.line }]}
                    onPress={() => setDueQuick(null)}
                  >
                    <Text style={[styles.panelItemText, { fontFamily: theme.fuiFamily, color: '#DC2626' }]}>
                      Clear
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Tags */}
            <View style={styles.tagsSection}>
              <View style={styles.tagsRow}>
                {idea.tags.map(tag => (
                  <View key={tag} style={[styles.tagChip, { backgroundColor: theme.accentSoft }]}>
                    <Text style={[styles.tagText, { fontFamily: theme.fuiFamily, color: theme.accent }]}>
                      #{tag}
                    </Text>
                    <TouchableOpacity onPress={() => ctx.removeTag(idea.id, tag)}>
                      <Text style={[styles.tagX, { color: theme.accent }]}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TextInput
                  style={[styles.tagInput, { fontFamily: theme.fuiFamily, color: theme.ink, borderColor: theme.line }]}
                  placeholder="+ tag"
                  placeholderTextColor={theme.inkFaint}
                  value={newTagText}
                  onChangeText={setNewTagText}
                  onSubmitEditing={() => handleAddTag(newTagText)}
                  blurOnSubmit={false}
                />
              </View>
              {suggestedTags.length > 0 && (
                <View style={styles.suggestedTags}>
                  <Text style={[styles.suggestedLabel, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                    Suggested:
                  </Text>
                  {suggestedTags.slice(0, 5).map(tag => (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => ctx.addTagToNote(idea.id, tag)}
                    >
                      <Text style={[styles.suggestedTag, { fontFamily: theme.fuiFamily, color: theme.accent }]}>
                        #{tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Body */}
            <TextInput
              style={[styles.bodyInput, { fontFamily: theme.fuiFamily, color: theme.ink }]}
              value={idea.body}
              onChangeText={text => ctx.patch(idea.id, { body: text })}
              placeholder="Add notes, details, or just think out loud…"
              placeholderTextColor={theme.inkFaint}
              multiline
              textAlignVertical="top"
            />

            {/* Extras */}
            {(idea.extras.checklist || idea.extras.links || idea.extras.sketch) && (
              <View style={[styles.extrasSection, { borderTopColor: theme.line }]}>
                {/* Checklist */}
                {idea.extras.checklist && (
                  <View style={styles.extra}>
                    <Text style={[styles.extraLabel, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                      CHECKLIST
                    </Text>
                    {idea.checklist.map((item, idx) => (
                      <View key={idx} style={styles.checkRow}>
                        <Checkbox
                          checked={item.done}
                          onToggle={() => ctx.toggleChk(idea.id, idx)}
                          accent={theme.accent}
                          line={theme.line}
                          size={20}
                          successOnCheck
                        />
                        <Text style={[
                          styles.checkText,
                          { fontFamily: theme.fuiFamily, color: item.done ? theme.inkFaint : theme.ink },
                          item.done && { textDecorationLine: 'line-through' },
                        ]}>
                          {item.text}
                        </Text>
                        <TouchableOpacity onPress={() => { hapticTap(); animateLayout(); ctx.removeChk(idea.id, idx); }}>
                          <Text style={[styles.removeBtn, { color: theme.inkFaint }]}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    <View style={styles.checkRow}>
                      <TextInput
                        style={[styles.newTaskInput, { fontFamily: theme.fuiFamily, color: theme.ink, borderColor: theme.line }]}
                        placeholder="Add step…"
                        placeholderTextColor={theme.inkFaint}
                        value={newTask}
                        onChangeText={setNewTask}
                        onSubmitEditing={handleAddTask}
                        blurOnSubmit={false}
                      />
                    </View>
                  </View>
                )}

                {/* Links */}
                {idea.extras.links && (
                  <View style={styles.extra}>
                    <Text style={[styles.extraLabel, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                      LINKS
                    </Text>
                    {idea.links.map((link, idx) => (
                      <View key={idx} style={styles.linkRow}>
                        <Text style={[styles.linkText, { fontFamily: theme.fuiFamily, color: theme.accent }]}>
                          {link.label}
                        </Text>
                        <TouchableOpacity onPress={() => { hapticTap(); animateLayout(); ctx.removeLink(idea.id, idx); }}>
                          <Text style={[styles.removeBtn, { color: theme.inkFaint }]}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TextInput
                      style={[styles.newTaskInput, { fontFamily: theme.fuiFamily, color: theme.ink, borderColor: theme.line }]}
                      placeholder="Paste link or label…"
                      placeholderTextColor={theme.inkFaint}
                      value={newLink}
                      onChangeText={setNewLink}
                      onSubmitEditing={handleAddLink}
                      blurOnSubmit={false}
                    />
                  </View>
                )}

                {/* Sketches */}
                {idea.extras.sketch && (
                  <View style={styles.extra}>
                    <Text style={[styles.extraLabel, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                      SKETCHES
                    </Text>
                    <View style={styles.sketchGrid}>
                      {idea.sketches.map((uri, idx) => (
                        <View key={idx} style={[styles.sketchThumb, { borderColor: theme.line }]}>
                          <Image source={{ uri }} style={styles.sketchImage} resizeMode="cover" />
                          <TouchableOpacity
                            style={[styles.sketchRemove, { backgroundColor: theme.ink }]}
                            onPress={() => handleRemoveSketch(idx)}
                          >
                            <Text style={styles.sketchRemoveText}>×</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity
                        style={[styles.sketchAdd, { borderColor: theme.line, backgroundColor: theme.canvas }]}
                        onPress={handleAddSketch}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.sketchAddText, { color: theme.inkSoft }]}>＋</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Add extras */}
            <View style={styles.addExtras}>
              {!idea.extras.checklist && (
                <TouchableOpacity
                  style={[styles.addExtraBtn, { borderColor: theme.line }]}
                  onPress={() => { hapticTap(); animateLayout(); ctx.addExtra(idea.id, 'checklist'); }}
                >
                  <Text style={[styles.addExtraText, { fontFamily: theme.fuiFamily, color: theme.inkSoft }]}>
                    + Checklist
                  </Text>
                </TouchableOpacity>
              )}
              {!idea.extras.links && (
                <TouchableOpacity
                  style={[styles.addExtraBtn, { borderColor: theme.line }]}
                  onPress={() => { hapticTap(); animateLayout(); ctx.addExtra(idea.id, 'links'); }}
                >
                  <Text style={[styles.addExtraText, { fontFamily: theme.fuiFamily, color: theme.inkSoft }]}>
                    + Link
                  </Text>
                </TouchableOpacity>
              )}
              {!idea.extras.sketch && (
                <TouchableOpacity
                  style={[styles.addExtraBtn, { borderColor: theme.line }]}
                  onPress={() => { hapticTap(); animateLayout(); ctx.addExtra(idea.id, 'sketch'); }}
                >
                  <Text style={[styles.addExtraText, { fontFamily: theme.fuiFamily, color: theme.inkSoft }]}>
                    + Sketch
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 300,
  },
  sheet: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  doneBtn: {
    fontSize: 15,
    fontWeight: '600',
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savedLabel: {
    fontSize: 13,
  },
  menuBtn: {
    fontSize: 20,
    paddingHorizontal: 4,
  },
  noteMenu: {
    position: 'absolute',
    top: 54,
    right: 16,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 160,
  },
  noteMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  noteMenuText: {
    fontSize: 15,
  },
  menuDivider: {
    height: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  titleInput: {
    fontSize: 26,
    lineHeight: 34,
    textAlignVertical: 'top',
    minHeight: 60,
  },
  metaChips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  metaChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  panel: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  panelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  panelItemText: {
    fontSize: 14,
  },
  tagsSection: {
    gap: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tagX: {
    fontSize: 15,
    lineHeight: 16,
  },
  tagInput: {
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 60,
  },
  suggestedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  suggestedLabel: {
    fontSize: 12,
  },
  suggestedTag: {
    fontSize: 13,
    fontWeight: '500',
  },
  bodyInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  extrasSection: {
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 16,
  },
  extra: {
    gap: 8,
  },
  extraLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 3,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  checkText: {
    flex: 1,
    fontSize: 15,
  },
  removeBtn: {
    fontSize: 18,
    paddingHorizontal: 4,
  },
  newTaskInput: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    gap: 10,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
  },
  sketchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sketchThumb: {
    width: 88,
    height: 88,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  sketchImage: {
    width: '100%',
    height: '100%',
  },
  sketchRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  sketchRemoveText: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 16,
  },
  sketchAdd: {
    width: 88,
    height: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sketchAddText: {
    fontSize: 28,
    fontWeight: '300',
  },
  addExtras: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  addExtraBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 11,
    borderWidth: 1,
  },
  addExtraText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
