import React, { useContext, useRef, useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
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
import { hapticTap } from '../haptics';
import { playSound } from '../sound';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_H * 0.65;

export default function CaptureSheet() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const tk = theme.key;
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const { state } = ctx;
  const [mounted, setMounted] = useState(false);
  const [newTag, setNewTag] = useState('');

  // Suggested tags: current selection first, then the most-used tags.
  const tagMap: Record<string, number> = {};
  ctx.active().forEach(i => i.tags.forEach(t => (tagMap[t] = (tagMap[t] || 0) + 1)));
  const top = Object.keys(tagMap).sort((a, b) => tagMap[b] - tagMap[a]);
  const chipTags = Array.from(new Set([...state.captureTags, ...top])).slice(0, 12);

  useEffect(() => {
    if (state.captureOpen) {
      setMounted(true);
      setNewTag('');
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else if (mounted) {
      Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 240, useNativeDriver: true }).start(
        ({ finished }) => finished && setMounted(false)
      );
    }
  }, [state.captureOpen]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 8,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy < -60) ctx.expandQuick();
        else if (gs.dy > 80) ctx.closeCapture();
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
      },
    })
  ).current;

  if (!mounted) return null;

  const hasText = state.captureText.trim().length > 0;

  const commitNewTag = () => {
    const t = newTag.trim().replace(/^#/, '').replace(/\s+/g, '-').toLowerCase();
    if (t) ctx.toggleCaptureTag(t);
    setNewTag('');
  };

  const handleSave = () => {
    if (hasText) { hapticTap(); playSound('save'); }
    ctx.saveCapture();
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="box-none">
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={ctx.closeCapture} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'position' : undefined}
        style={styles.kavOuter}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: theme.bg, paddingBottom: insets.bottom + 16, transform: [{ translateY }] },
          ]}
        >
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: theme.line }]} />
          </View>

          <View style={styles.header}>
            <Text style={[styles.headerTitle, { fontFamily: disp(tk), color: theme.ink }]}>Quick capture</Text>
            <TouchableOpacity onPress={ctx.closeCapture} hitSlop={8}>
              <Text style={[styles.cancel, { fontFamily: ui(), color: theme.inkFaint }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.textarea, { fontFamily: disp(tk), color: theme.ink }]}
            placeholder="What's the idea? Just start typing…"
            placeholderTextColor={theme.inkFaint}
            value={state.captureText}
            onChangeText={text => ctx.dispatch({ type: 'SET_CAPTURE_TEXT', text })}
            multiline
            autoFocus
            textAlignVertical="top"
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tagsScroll}
            contentContainerStyle={styles.tagsContent}
            keyboardShouldPersistTaps="handled"
          >
            {chipTags.map(tag => {
              const active = state.captureTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.chip, { borderColor: active ? theme.accent : theme.line, backgroundColor: active ? theme.accent : theme.surface }]}
                  onPress={() => ctx.toggleCaptureTag(tag)}
                >
                  <Text style={[styles.chipText, { fontFamily: ui(600), color: active ? '#fff' : theme.inkSoft }]}>#{tag}</Text>
                </TouchableOpacity>
              );
            })}
            <View style={[styles.newTagChip, { borderColor: theme.line }]}>
              <Icon name="plus" size={13} color={theme.inkFaint} strokeWidth={2.2} />
              <TextInput
                style={[styles.newTagInput, { fontFamily: ui(), color: theme.ink }]}
                placeholder="tag"
                placeholderTextColor={theme.inkFaint}
                value={newTag}
                onChangeText={setNewTag}
                onSubmitEditing={commitNewTag}
                blurOnSubmit={false}
                autoCapitalize="none"
                returnKeyType="done"
              />
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: hasText ? theme.accent : ctx.rgba(0.4) }]}
            onPress={handleSave}
            disabled={!hasText}
            activeOpacity={0.9}
          >
            <Text style={[styles.saveText, { fontFamily: ui(600) }]}>Save idea</Text>
          </TouchableOpacity>

          <View style={styles.hint}>
            <Icon name="chevronUp" size={13} color={theme.inkFaint} strokeWidth={2} />
            <Text style={[styles.hintText, { fontFamily: ui(), color: theme.inkFaint }]}>Swipe up for the full editor</Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 100, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(28,26,20,0.34)' },
  kavOuter: { justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 22,
    minHeight: SCREEN_H * 0.42,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 20,
  },
  handleArea: { alignItems: 'center', paddingVertical: 8 },
  handle: { width: 38, height: 4, borderRadius: 3 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 18 },
  cancel: { fontSize: 14 },
  textarea: { fontSize: 20, lineHeight: 28, minHeight: 96, textAlignVertical: 'top' },
  tagsScroll: { marginHorizontal: -22, marginTop: 6 },
  tagsContent: { paddingHorizontal: 22, gap: 8, alignItems: 'center' },
  chip: { borderWidth: 1, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20 },
  chipText: { fontSize: 13 },
  newTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingLeft: 9,
    paddingRight: 11,
    paddingVertical: 5,
  },
  newTagInput: { fontSize: 13, minWidth: 44, padding: 0 },
  saveBtn: { marginTop: 18, paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  saveText: { fontSize: 15.5, color: '#fff' },
  hint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  hintText: { fontSize: 11.5 },
});
