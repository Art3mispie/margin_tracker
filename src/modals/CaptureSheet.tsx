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
import { hapticTap } from '../haptics';
import { playSound } from '../sound';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_H * 0.65;

export default function CaptureSheet() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const { state } = ctx;
  // Keep the sheet mounted through its close animation instead of vanishing.
  const [mounted, setMounted] = useState(false);
  const [newTag, setNewTag] = useState('');

  const allTags = Array.from(
    new Set([...state.captureTags, ...ctx.active().flatMap(i => i.tags)])
  );

  useEffect(() => {
    if (state.captureOpen) {
      setMounted(true);
      setNewTag('');
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else if (mounted) {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 240,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [state.captureOpen]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 8,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          translateY.setValue(gs.dy);
        } else if (gs.dy < -60) {
          // Swipe up — expand
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy < -60) {
          ctx.expandQuick();
        } else if (gs.dy > 80) {
          ctx.closeCapture();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
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
    if (hasText) {
      hapticTap();
      playSound('save');
    }
    ctx.saveCapture();
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="box-none">
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={ctx.closeCapture}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'position' : undefined}
        style={styles.kavOuter}
        pointerEvents="box-none"
      >
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
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: theme.line }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { fontFamily: theme.fuiFamily, color: theme.ink }]}>
              Quick capture
            </Text>
            <TouchableOpacity onPress={ctx.closeCapture}>
              <Text style={[styles.cancelBtn, { fontFamily: theme.fuiFamily, color: theme.accent }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>

          {/* Text area */}
          <TextInput
            style={[
              styles.textarea,
              { fontFamily: theme.fdispFamily, color: theme.ink },
            ]}
            placeholder="What's the idea? Just start typing…"
            placeholderTextColor={theme.inkFaint}
            value={state.captureText}
            onChangeText={text => ctx.dispatch({ type: 'SET_CAPTURE_TEXT', text })}
            multiline
            autoFocus
            textAlignVertical="top"
          />

          {/* Tags */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tagsScroll}
            contentContainerStyle={styles.tagsContent}
            keyboardShouldPersistTaps="handled"
          >
            {allTags.map(tag => {
              const selected = state.captureTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: selected ? theme.accent : theme.accentSoft,
                      borderColor: theme.line,
                    },
                  ]}
                  onPress={() => ctx.toggleCaptureTag(tag)}
                >
                  <Text style={[
                    styles.tagText,
                    { fontFamily: theme.fuiFamily, color: selected ? '#FFF' : theme.accent },
                  ]}>
                    #{tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {/* Custom tag input */}
            <View style={[styles.newTagChip, { borderColor: theme.line }]}>
              <Text style={[styles.newTagHash, { color: theme.inkFaint }]}>#</Text>
              <TextInput
                style={[styles.newTagInput, { fontFamily: theme.fuiFamily, color: theme.ink }]}
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

          {/* Swipe hint */}
          <Text style={[styles.swipeHint, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
            ↑ Swipe up for the full editor
          </Text>

          {/* Save button */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: hasText ? theme.accent : theme.line },
            ]}
            onPress={handleSave}
            disabled={!hasText}
            activeOpacity={0.85}
          >
            <Text style={[
              styles.saveBtnText,
              { fontFamily: theme.fuiFamily, color: hasText ? '#FFF' : theme.inkFaint },
            ]}>
              Save idea
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  kavOuter: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    minHeight: SCREEN_H * 0.45,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelBtn: {
    fontSize: 15,
    fontWeight: '500',
  },
  textarea: {
    fontSize: 20,
    lineHeight: 28,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  tagsScroll: {
    marginHorizontal: -20,
    marginBottom: 12,
  },
  tagsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 0,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  newTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 2,
  },
  newTagHash: {
    fontSize: 13,
    fontWeight: '600',
  },
  newTagInput: {
    fontSize: 13,
    minWidth: 44,
    padding: 0,
  },
  swipeHint: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 11,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
