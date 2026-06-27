import React, { useContext, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../AppContext';
import { useTheme } from '../theme';
import { disp, ui } from '../fonts';
import Icon from '../components/Icon';
import { hapticTap, hapticWarning } from '../haptics';

export default function ProjectMenu() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const tk = theme.key;
  const insets = useSafeAreaInsets();
  const { state } = ctx;
  const translateY = useRef(new Animated.Value(400)).current;

  const isManage = state.manageKind !== null;
  const isNewProject = state.newProjectOpen;
  const open = isManage || isNewProject;

  useEffect(() => {
    if (open) {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else {
      Animated.timing(translateY, { toValue: 400, duration: 220, useNativeDriver: true }).start();
    }
  }, [open]);

  if (!open) return null;

  const name = state.projectMenuName || '';
  const isTag = state.manageKind === 'tag';
  const count = isTag
    ? ctx.active().filter(i => i.tags.includes(name)).length
    : ctx.active().filter(i => i.project === name).length;

  const newProjValid = state.newProjectText.trim().length > 0;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => (isNewProject ? ctx.closeNewProject() : ctx.closeProjectMenu())}
      />

      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: theme.bg, paddingBottom: insets.bottom + 20, transform: [{ translateY }] },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: theme.line }]} />

        {isNewProject ? (
          <>
            <Text style={[styles.heading, { fontFamily: ui(700), color: theme.inkFaint }]}>NEW PROJECT</Text>
            <TextInput
              style={[styles.input, { fontFamily: disp(tk), color: theme.ink, borderColor: theme.line, backgroundColor: theme.surface }]}
              placeholder="Project name"
              placeholderTextColor={theme.inkFaint}
              value={state.newProjectText}
              onChangeText={text => ctx.dispatch({ type: 'SET_NEW_PROJECT_TEXT', text })}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: newProjValid ? theme.accent : ctx.rgba(0.4) }]}
              onPress={() => { hapticTap(); ctx.commitNewProject(); }}
              activeOpacity={0.9}
            >
              <Text style={[styles.primaryText, { fontFamily: ui(600) }]}>Create project</Text>
            </TouchableOpacity>
          </>
        ) : state.pmRenaming ? (
          <>
            <Text style={[styles.heading, { fontFamily: ui(700), color: theme.inkFaint }]}>
              {isTag ? 'RENAME TAG' : 'RENAME PROJECT'}
            </Text>
            <TextInput
              style={[styles.input, { fontFamily: disp(tk), color: theme.ink, borderColor: theme.line, backgroundColor: theme.surface }]}
              value={state.pmRenameText}
              onChangeText={text => ctx.dispatch({ type: 'SET_RENAME_TEXT', text })}
              autoFocus
              placeholder="New name"
              placeholderTextColor={theme.inkFaint}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
              onPress={() => { hapticTap(); ctx.commitRename(); }}
              activeOpacity={0.9}
            >
              <Text style={[styles.primaryText, { fontFamily: ui(600) }]}>Save name</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.menuName, { fontFamily: disp(tk), color: theme.ink }]}>
              {isTag ? `#${name}` : name}
            </Text>
            <Text style={[styles.menuCount, { fontFamily: ui(), color: theme.inkFaint }]}>
              {count} idea{count === 1 ? '' : 's'}
            </Text>

            <TouchableOpacity style={[styles.menuRow, { backgroundColor: theme.surface }]} onPress={ctx.startRename} activeOpacity={0.7}>
              <Icon name="pencil" size={18} color={theme.inkSoft} strokeWidth={1.7} />
              <Text style={[styles.menuRowText, { fontFamily: ui(), color: theme.ink }]}>
                {isTag ? 'Rename tag' : 'Rename project'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, { backgroundColor: theme.surface }]}
              onPress={() => { hapticWarning(); ctx.deleteProject(); }}
              activeOpacity={0.7}
            >
              <Icon name="trash" size={18} color="#C0492F" strokeWidth={1.7} />
              <Text style={[styles.menuRowText, { fontFamily: ui(), color: '#C0492F' }]}>
                {isTag ? 'Delete tag' : 'Delete project'}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.helper, { fontFamily: ui(), color: theme.inkFaint }]}>
              {isTag
                ? 'Deleting removes this tag from every idea — the ideas stay.'
                : 'Deleting keeps the ideas — it just unfiles them.'}
            </Text>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 400, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(28,26,20,0.3)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 20,
  },
  handle: { width: 38, height: 4, borderRadius: 3, alignSelf: 'center', marginTop: 6, marginBottom: 16 },
  heading: { fontSize: 12, letterSpacing: 0.4, paddingHorizontal: 4, marginBottom: 8 },
  input: { fontSize: 16, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  primaryBtn: { marginTop: 12, paddingVertical: 14, borderRadius: 13, alignItems: 'center' },
  primaryText: { fontSize: 15, color: '#fff' },
  menuName: { fontSize: 19, paddingHorizontal: 4 },
  menuCount: { fontSize: 13, paddingHorizontal: 4, marginTop: 2, marginBottom: 12 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 15, borderRadius: 13, marginBottom: 8 },
  menuRowText: { fontSize: 15 },
  helper: { fontSize: 12, textAlign: 'center', marginTop: 2, lineHeight: 17 },
});
