import React, { useContext, useEffect, useRef } from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../AppContext';
import { useTheme } from '../theme';
import { ui } from '../fonts';
import Icon from './Icon';
import { hapticTap, hapticSuccess, hapticWarning } from '../haptics';
import { animateLayout } from '../anim';
import { playSound } from '../sound';

/**
 * Floating action bar shown while the user is selecting multiple notes
 * (entered by long-pressing a card). Lets them act on the whole set at once.
 */
export default function SelectionBar() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = ctx;
  const lift = useRef(new Animated.Value(80)).current;

  const open = state.selectMode;
  useEffect(() => {
    Animated.spring(lift, {
      toValue: open ? 0 : 80,
      useNativeDriver: true,
      tension: 70,
      friction: 11,
    }).start();
  }, [open]);

  if (!open) return null;

  const ids = state.selectedIds;
  const count = ids.length;
  // If every selected note is already important, the flag button un-flags.
  const allImportant =
    count > 0 && ids.every(id => state.ideas.find(i => i.id === id)?.important);

  const confirmDelete = () => {
    hapticWarning();
    Alert.alert(
      `Delete ${count} idea${count === 1 ? '' : 's'}?`,
      'This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { animateLayout(); ctx.bulkDelete(); } },
      ]
    );
  };

  const Action = ({
    icon,
    label,
    color,
    onPress,
  }: {
    icon: Parameters<typeof Icon>[0]['name'];
    label: string;
    color: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={styles.action}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${count} selected idea${count === 1 ? '' : 's'}`}
    >
      <Icon name={icon} size={20} color={color} strokeWidth={1.8} />
      <Text style={[styles.actionText, { fontFamily: ui(600), color }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          backgroundColor: theme.surface,
          borderColor: theme.line,
          paddingBottom: (insets.bottom || 8) + 8,
          transform: [{ translateY: lift }],
        },
      ]}
    >
      <View style={styles.top}>
        <TouchableOpacity
          style={styles.cancel}
          onPress={() => { hapticTap(); ctx.exitSelect(); }}
          accessibilityRole="button"
          accessibilityLabel="Cancel selection"
        >
          <Icon name="chevronLeft" size={16} color={theme.inkSoft} strokeWidth={2} />
          <Text style={[styles.cancelText, { fontFamily: ui(600), color: theme.inkSoft }]}>Done</Text>
        </TouchableOpacity>
        <Text style={[styles.count, { fontFamily: ui(600), color: theme.ink }]}>
          {count} selected
        </Text>
        <View style={{ width: 56 }} />
      </View>
      <View style={styles.actions}>
        <Action
          icon="star"
          label={allImportant ? 'Unflag' : 'Flag'}
          color="#C8902B"
          onPress={() => { hapticTap(); animateLayout(); ctx.bulkImportant(!allImportant); }}
        />
        <Action
          icon="archive"
          label="Archive"
          color={theme.accent}
          onPress={() => { hapticSuccess(); playSound('archive'); animateLayout(); ctx.bulkArchive(); }}
        />
        <Action icon="trash" label="Delete" color="#C0492F" onPress={confirmDelete} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 24,
    zIndex: 500,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cancel: { flexDirection: 'row', alignItems: 'center', gap: 3, width: 56 },
  cancelText: { fontSize: 14 },
  count: { fontSize: 14 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  action: { alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 18, flex: 1 },
  actionText: { fontSize: 12 },
});
