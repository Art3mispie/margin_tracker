import React, { useContext } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../AppContext';
import { useTheme } from '../theme';
import { hapticSelect } from '../haptics';
import type { Screen } from '../types';

const TABS: Array<{ key: Screen; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'ideas', label: 'Ideas' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'settings', label: 'Settings' },
];

function TodayIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 10.5 L12 3 L21 10.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 9.5V20h14V9.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IdeasIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4.5} width={18} height={16} rx={2.5} stroke={color} strokeWidth={1.8} />
      <Path d="M3 9h18" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M8 2.5v4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M16 2.5v4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function SettingsIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
      <Path
        d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function TabIcon({ tabKey, color }: { tabKey: Screen; color: string }) {
  switch (tabKey) {
    case 'today': return <TodayIcon color={color} />;
    case 'ideas': return <IdeasIcon color={color} />;
    case 'calendar': return <CalendarIcon color={color} />;
    case 'settings': return <SettingsIcon color={color} />;
  }
}

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
            onPress={() => { if (screen !== tab.key) hapticSelect(); ctx.setScreen(tab.key); }}
            activeOpacity={0.7}
          >
            <TabIcon tabKey={tab.key} color={color} />
            <Text style={[styles.label, { color, fontFamily: theme.fuiFamily }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 84,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
  },
});
