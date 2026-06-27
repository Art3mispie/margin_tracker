import React, { useContext } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../AppContext';
import { useTheme } from '../theme';
import { ui } from '../fonts';
import Icon, { IconName } from './Icon';
import { hapticSelect } from '../haptics';
import type { Screen } from '../types';

const TABS: Array<{ key: Screen; label: string; icon: IconName }> = [
  { key: 'today', label: 'Today', icon: 'home' },
  { key: 'ideas', label: 'Ideas', icon: 'folder' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar' },
  { key: 'settings', label: 'Settings', icon: 'gear' },
];

export default function BottomNav() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const screen = ctx.state.screen;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.line,
          paddingBottom: insets.bottom || 8,
        },
      ]}
    >
      {TABS.map(tab => {
        const active = screen === tab.key;
        const color = active ? theme.accent : theme.inkFaint;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            onPress={() => {
              if (screen !== tab.key) hapticSelect();
              ctx.setScreen(tab.key);
            }}
          >
            <Icon name={tab.icon} size={22} color={color} strokeWidth={1.7} />
            <Text style={[styles.label, { color, fontFamily: ui(600) }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 11,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  label: { fontSize: 10 },
});
