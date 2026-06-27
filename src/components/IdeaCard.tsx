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
import { hapticSuccess } from '../haptics';
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

export default function IdeaCard({ idea, onPress, onArchive, titleSize = 16.5 }: Props) {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const archiving = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.2,
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) translateX.setValue(Math.max(-180, gs.dx));
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -100 && !archiving.current) {
          archiving.current = true;
          hapticSuccess();
          playSound('archive');
          Animated.timing(translateX, {
            toValue: -500,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            animateLayout();
            onArchive();
          });
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const di = idea.due ? ctx.dueInfo(idea.due) : null;
  const dueColor = di && di.overdue ? '#C0492F' : theme.accent;
  const metaLine = ctx.metaLine(idea);
  const dateLabel = ctx.fmtShort(idea.createdAt);

  return (
    <View style={styles.wrapper}>
      {/* Archive reveal */}
      <View style={[styles.archiveBg, { backgroundColor: theme.accent }]}>
        <Icon name="archive" size={16} color="#fff" strokeWidth={1.8} />
        <Text style={[styles.archiveLabel, { fontFamily: ui(600) }]}>Archive</Text>
      </View>

      <Animated.View
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.line, transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.inner}>
          <View style={styles.topRow}>
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
  archiveBg: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 7,
    paddingRight: 20,
  },
  archiveLabel: { color: '#fff', fontSize: 13 },
  card: { borderRadius: 15, borderWidth: 1 },
  inner: { paddingVertical: 14, paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 },
  date: { fontSize: 11.5 },
  projectChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  projectText: { fontSize: 11 },
  dueText: { fontSize: 11 },
  title: { lineHeight: 22, letterSpacing: -0.1 },
  meta: { fontSize: 12.5, marginTop: 6 },
});
