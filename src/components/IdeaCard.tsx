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
import { hapticSuccess } from '../haptics';
import { animateLayout } from '../anim';
import { playSound } from '../sound';
import type { Idea } from '../types';

interface Props {
  idea: Idea;
  onPress: () => void;
  onArchive: () => void;
}

export default function IdeaCard({ idea, onPress, onArchive }: Props) {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const archiving = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) {
          translateX.setValue(gs.dx);
        }
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
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const due = idea.due ? ctx.dueInfo(idea.due) : null;
  const metaLine = ctx.metaLine(idea);
  const dateLabel = ctx.fmtShort(idea.createdAt);

  return (
    <View style={styles.wrapper}>
      {/* Archive background */}
      <View style={[styles.archiveBg, { backgroundColor: '#E53E3E' }]}>
        <Text style={styles.archiveLabel}>Archive</Text>
      </View>

      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.line,
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.85}
          style={styles.inner}
        >
          <View style={styles.topRow}>
            <Text style={[styles.date, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
              {dateLabel}
            </Text>
            {idea.project && (
              <View style={[styles.projectChip, { backgroundColor: theme.accentSoft }]}>
                <Text style={[styles.projectText, { color: theme.accent, fontFamily: theme.fuiFamily }]}>
                  {idea.project}
                </Text>
              </View>
            )}
            {due && (
              <View style={[styles.dueChip, { backgroundColor: due.overdue ? '#FEE2E2' : theme.accentSoft }]}>
                <Text style={[
                  styles.dueText,
                  { color: due.overdue ? '#DC2626' : due.diff <= 2 ? '#D97706' : theme.accent, fontFamily: theme.fuiFamily }
                ]}>
                  {due.label}
                </Text>
              </View>
            )}
          </View>

          <Text
            style={[styles.title, { fontFamily: theme.fdispFamily, color: theme.ink }]}
            numberOfLines={2}
          >
            {idea.title}
          </Text>

          {metaLine ? (
            <Text style={[styles.meta, { fontFamily: theme.fuiFamily, color: theme.inkSoft }]} numberOfLines={1}>
              {metaLine}
            </Text>
          ) : null}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 10,
    position: 'relative',
  },
  archiveBg: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  archiveLabel: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  inner: {
    padding: 14,
    gap: 5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  date: {
    fontSize: 12,
  },
  projectChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  projectText: {
    fontSize: 11,
    fontWeight: '500',
  },
  dueChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  dueText: {
    fontSize: 11,
    fontWeight: '500',
  },
  title: {
    fontSize: 16.5,
    lineHeight: 22,
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
});
