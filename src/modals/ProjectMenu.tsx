import React, { useContext, useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../AppContext';
import { useTheme } from '../theme';
import { hapticTap, hapticWarning } from '../haptics';

export default function ProjectMenu() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = ctx;
  const translateY = useRef(new Animated.Value(400)).current;

  const isOpen = state.manageKind !== null;
  const isNewProject = state.newProjectOpen;

  useEffect(() => {
    if (isOpen || isNewProject) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 400,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [isOpen, isNewProject]);

  if (!isOpen && !isNewProject) return null;

  const name = state.projectMenuName || '';
  const kind = state.manageKind;
  const count = kind === 'project'
    ? ctx.active().filter(i => i.project === name).length
    : ctx.active().filter(i => i.tags.includes(name)).length;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => {
          if (isNewProject) ctx.closeNewProject();
          else ctx.closeProjectMenu();
        }}
      />

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.surface,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handleArea}>
          <View style={[styles.handle, { backgroundColor: theme.line }]} />
        </View>

        {/* New Project Sheet */}
        {isNewProject && (
          <>
            <Text style={[styles.sheetTitle, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
              NEW PROJECT
            </Text>
            <TextInput
              style={[
                styles.renameInput,
                { fontFamily: theme.fuiFamily, color: theme.ink, borderColor: theme.line },
              ]}
              placeholder="Project name…"
              placeholderTextColor={theme.inkFaint}
              value={state.newProjectText}
              onChangeText={text => ctx.dispatch({ type: 'SET_NEW_PROJECT_TEXT', text })}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
              onPress={() => { hapticTap(); ctx.commitNewProject(); }}
              activeOpacity={0.85}
            >
              <Text style={[styles.primaryBtnText, { fontFamily: theme.fuiFamily }]}>
                Create project
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Project/Tag menu */}
        {isOpen && !isNewProject && (
          <>
            <Text style={[styles.menuTitle, { fontFamily: theme.fdispFamily, color: theme.ink }]}>
              {kind === 'tag' ? `#${name}` : name}
            </Text>
            <Text style={[styles.menuCount, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
              {count} idea{count !== 1 ? 's' : ''}
            </Text>

            {state.pmRenaming ? (
              <>
                <TextInput
                  style={[
                    styles.renameInput,
                    { fontFamily: theme.fuiFamily, color: theme.ink, borderColor: theme.line },
                  ]}
                  value={state.pmRenameText}
                  onChangeText={text => ctx.dispatch({ type: 'SET_RENAME_TEXT', text })}
                  autoFocus
                  placeholder="New name…"
                  placeholderTextColor={theme.inkFaint}
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
                  onPress={ctx.commitRename}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.primaryBtnText, { fontFamily: theme.fuiFamily }]}>
                    Save name
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.menuItem, { borderColor: theme.line }]}
                  onPress={ctx.startRename}
                >
                  <Text style={[styles.menuItemText, { fontFamily: theme.fuiFamily, color: theme.ink }]}>
                    Rename
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuItem, styles.deleteItem]}
                  onPress={() => { hapticWarning(); ctx.deleteProject(); }}
                >
                  <Text style={[styles.menuItemText, { fontFamily: theme.fuiFamily, color: '#DC2626' }]}>
                    {kind === 'tag' ? 'Delete tag' : 'Delete project'}
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.helperText, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                  {kind === 'tag'
                    ? 'Removes tag from all ideas. Ideas are kept.'
                    : 'Unfiles all ideas. Ideas are kept.'}
                </Text>
              </>
            )}
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 400,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
    gap: 12,
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    paddingBottom: 4,
  },
  menuTitle: {
    fontSize: 22,
    lineHeight: 28,
  },
  menuCount: {
    fontSize: 13,
    marginTop: -4,
    marginBottom: 4,
  },
  menuItem: {
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  deleteItem: {
    borderTopWidth: 0,
    marginTop: 4,
  },
  menuItemText: {
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    paddingTop: 4,
    paddingBottom: 8,
  },
  renameInput: {
    fontSize: 17,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 11,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
