import React, { useContext, useRef } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppContext } from '../AppContext';
import { useTheme } from '../theme';
import { disp, ui } from '../fonts';
import Icon from './Icon';
import { hapticSuccess, hapticTap } from '../haptics';
import { animateLayout } from '../anim';
import { playSound } from '../sound';
import type { Idea } from '../types';

interface Props {
  idea: Idea;
  onPress: () => void;
  onArchive: () => void;
  /** Title size — Recent uses 17, list views use 16.5. */
  titleSize?: number;
}

// Gold-ish flag colour reads as "important" across all three themes.
const FLAG = '#C8902B';

export default function IdeaCard({ idea, onPress, onArchive, titleSize = 16.5 }: Props) {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const settling = useRef(false);

  const selectMode = ctx.state.selectMode;
  const selected = selectMode && ctx.state.selectedIds.includes(idea.id);

  // The PanResponder is created once, so mirror live values it needs into refs.
  const selectModeRef = useRef(selectMode);
  selectModeRef.current = selectMode;

  const springBack = () =>
    Animated.spring(translateX, { toValue: 0, friction: 7, tension: 90, useNativeDriver: true }).start();

  const panResponder = useRef(
    PanResponder.create({
      // Swiping is disabled while picking multiple notes.
      onMoveShouldSetPanResponder: (_, gs) =>
        !selectModeRef.current &&
        Math.abs(gs.dx) > 10 &&
        Math.abs(gs.dx) > Math.abs(gs.dy) * 1.2,
      onPanResponderMove: (_, gs) => {
        // Archive pulls fully left; flag only needs a short pull right.
        const x = gs.dx < 0 ? Math.max(-200, gs.dx) : Math.min(140, gs.dx);
        translateX.setValue(x);
      },
      onPanResponderRelease: (_, gs) => {
        if (settling.current) return;
        if (gs.dx < -100) {
          // Archive — slide the card off, then collapse the row.
          settling.current = true;
          hapticSuccess();
          playSound('archive');
          Animated.timing(translateX, { toValue: -480, duration: 190, useNativeDriver: true }).start(() => {
            animateLayout();
            onArchive();
          });
        } else if (gs.dx > 90) {
          // Flag / unflag as important — a lighter, in-place action.
          hapticTap();
          animateLayout();
          ctx.toggleImportant(idea.id);
          springBack();
        } else {
          springBack();
        }
      },
      onPanResponderTerminate: springBack,
    })
  ).current;

  const di = idea.due ? ctx.dueInfo(idea.due) : null;
  const dueColor = di && di.overdue ? '#C0492F' : theme.accent;
  const metaLine = ctx.metaLine(idea);
  const dateLabel = ctx.fmtShort(idea.createdAt);

  const archiveOpacity = translateX.interpolate({
    inputRange: [-12, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const flagOpacity = translateX.interpolate({
    inputRange: [0, 12],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const handlePress = () => {
    if (selectMode) {
      hapticTap();
      ctx.toggleSelect(idea.id);
    } else {
      onPress();
    }
  };

  const handleLongPress = () => {
    if (!selectMode) {
      hapticSuccess();
      ctx.enterSelect(idea.id);
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Swipe-right reveal: flag as important */}
      <Animated.View style={[styles.revealBg, styles.flagBg, { backgroundColor: FLAG, opacity: flagOpacity }]}>
        <Icon name="star" size={16} color="#fff" strokeWidth={1.8} />
        <Text style={[styles.revealLabel, { fontFamily: ui(600) }]}>
          {idea.important ? 'Unflag' : 'Important'}
        </Text>
      </Animated.View>

      {/* Swipe-left reveal: archive */}
      <Animated.View style={[styles.revealBg, styles.archiveBg, { backgroundColor: theme.accent, opacity: archiveOpacity }]}>
        <Icon name="archive" size={16} color="#fff" strokeWidth={1.8} />
        <Text style={[styles.revealLabel, { fontFamily: ui(600) }]}>Archive</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: selected ? theme.accent : theme.line,
            borderWidth: selected ? 1.8 : 1,
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={280}
          activeOpacity={0.85}
          style={styles.inner}
          accessibilityRole={selectMode ? 'checkbox' : 'button'}
          accessibilityState={selectMode ? { checked: selected } : undefined}
          accessibilityLabel={`${idea.important ? 'Important. ' : ''}${idea.title || 'Untitled idea'}`}
          accessibilityHint={
            selectMode ? 'Double tap to select or deselect' : 'Double tap to open. Touch and hold to select.'
          }
        >
          <View style={styles.topRow}>
            {selectMode && (
              <View
                style={[
                  styles.selDot,
                  { borderColor: selected ? theme.accent : theme.line, backgroundColor: selected ? theme.accent : 'transparent' },
                ]}
              >
                {selected && <Icon name="check" size={12} color="#fff" strokeWidth={3} />}
              </View>
            )}
            {idea.important && <Icon name="star" size={13} color={FLAG} strokeWidth={1.6} />}
            <Text style={[styles.date, { fontFamily: ui(500), color: theme.inkFaint }]}>{dateLabel}</Text>
            {!!idea.project && (
              <View style={[styles.projectChip, { backgroundColor: theme.accentSoft }]}>
                <Text style={[styles.projectText, { fontFamily: ui(600), color: theme.accentInk }]}>
                  {idea.project}
                </Text>
              </View>
            )}
            {di && (
              <Text style={[styles.dueText, { fontFamily: ui(700), color: dueColor }]}>{di.label}</Text>
            )}
          </View>

          <Text
            style={[styles.title, { fontFamily: disp(theme.key), color: theme.ink, fontSize: titleSize }]}
            numberOfLines={2}
          >
            {idea.title || 'Untitled idea'}
          </Text>

          {!!metaLine && (
            <Text style={[styles.meta, { fontFamily: ui(), color: theme.inkSoft }]} numberOfLines={1}>
              {metaLine}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 10, position: 'relative', borderRadius: 15, overflow: 'hidden' },
  revealBg: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  archiveBg: { justifyContent: 'flex-end', paddingRight: 20 },
  flagBg: { justifyContent: 'flex-start', paddingLeft: 20 },
  revealLabel: { color: '#fff', fontSize: 13 },
  card: { borderRadius: 15, borderWidth: 1 },
  inner: { paddingVertical: 14, paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 },
  selDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.8, alignItems: 'center', justifyContent: 'center' },
  date: { fontSize: 11.5 },
  projectChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  projectText: { fontSize: 11 },
  dueText: { fontSize: 11 },
  title: { lineHeight: 22, letterSpacing: -0.1 },
  meta: { fontSize: 12.5, marginTop: 6 },
});
