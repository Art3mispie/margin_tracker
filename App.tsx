import React, { useContext, useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_500Medium,
  Newsreader_600SemiBold,
} from '@expo-google-fonts/newsreader';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';

import { AppProvider, AppContext } from './src/AppContext';
import { useTheme } from './src/theme';
import { enableLayoutAnimations, animationsEnabled } from './src/anim';
import { hapticTap } from './src/haptics';
import { loadSounds } from './src/sound';
import Icon from './src/components/Icon';
import BottomNav from './src/components/BottomNav';
import SelectionBar from './src/components/SelectionBar';
import Today from './src/screens/Today';
import Ideas from './src/screens/Ideas';
import CalendarScreen from './src/screens/CalendarScreen';
import Settings from './src/screens/Settings';
import CaptureSheet from './src/modals/CaptureSheet';
import NoteReader from './src/modals/NoteReader';
import NoteEditor from './src/modals/NoteEditor';
import PlanDaySheet from './src/modals/PlanDaySheet';
import ProjectMenu from './src/modals/ProjectMenu';

enableLayoutAnimations();

function AppShell() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const { state } = ctx;

  // Cross-fade + lift when switching screens.
  const fade = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animationsEnabled()) {
      fade.setValue(1);
      lift.setValue(0);
      return;
    }
    fade.setValue(0);
    lift.setValue(10);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.spring(lift, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [state.screen]);

  // Springy FAB press.
  const fabScale = useRef(new Animated.Value(1)).current;
  const pressFab = (to: number) =>
    Animated.spring(fabScale, { toValue: to, friction: 6, tension: 200, useNativeDriver: true }).start();

  const renderScreen = () => {
    switch (state.screen) {
      case 'today': return <Today />;
      case 'ideas': return <Ideas />;
      case 'calendar': return <CalendarScreen />;
      case 'settings': return <Settings />;
    }
  };

  const showFAB = state.screen !== 'settings' && !state.selectMode;

  // Full-screen overlays have light backgrounds; the Today screen has a dark ocean top.
  const overlayOpen =
    state.readerId !== null || state.noteId !== null || state.taskPickerOpen;
  const statusBarStyle =
    !overlayOpen && state.screen === 'today' ? 'light' : 'dark';

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style={statusBarStyle} />

      {/* Main screen */}
      <Animated.View style={[styles.screenArea, { opacity: fade, transform: [{ translateY: lift }] }]}>
        {renderScreen()}
      </Animated.View>

      {/* Bottom Nav */}
      <BottomNav />

      {/* Multi-select action bar (overlays the nav when active) */}
      <SelectionBar />

      {/* FAB */}
      {showFAB && (
        <Pressable
          onPress={() => { hapticTap(); ctx.openCapture(); }}
          onPressIn={() => pressFab(0.9)}
          onPressOut={() => pressFab(1)}
          accessibilityRole="button"
          accessibilityLabel="Capture a new idea"
          style={styles.fabHit}
        >
          <Animated.View style={[styles.fab, { backgroundColor: theme.accent, shadowColor: theme.accent, transform: [{ scale: fabScale }] }]}>
            <Icon name="plus" size={24} color="#fff" strokeWidth={2.2} />
          </Animated.View>
        </Pressable>
      )}

      {/* Modals — rendered on top */}
      <CaptureSheet />
      <NoteReader />
      <NoteEditor />
      <PlanDaySheet />
      <ProjectMenu />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    loadSounds();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>margin</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppProvider>
          <AppShell />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screenArea: {
    flex: 1,
  },
  loading: {
    flex: 1,
    backgroundColor: '#F4EFE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 34,
    color: '#1F303C',
    fontFamily: 'Newsreader_400Regular_Italic',
  },
  fabHit: {
    position: 'absolute',
    right: 20,
    bottom: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: {
    color: '#FFF',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '300',
  },
});
