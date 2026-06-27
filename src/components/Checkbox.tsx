import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { animationsEnabled } from '../anim';
import { hapticToggle, hapticSuccess } from '../haptics';
import { playSound } from '../sound';

interface Props {
  checked: boolean;
  onToggle: () => void;
  accent: string;
  line: string;
  size?: number;
  /** Fire a success rumble (rather than a plain tap) when it becomes checked. */
  successOnCheck?: boolean;
  /** Spoken label for screen readers (e.g. the task text). */
  label?: string;
}

/**
 * A checkbox with a satisfying spring fill + checkmark pop and a press bounce.
 * Falls back to instant state when the user disables animations.
 */
export default function Checkbox({
  checked,
  onToggle,
  accent,
  line,
  size = 22,
  successOnCheck = false,
  label,
}: Props) {
  const fill = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animationsEnabled()) {
      fill.setValue(checked ? 1 : 0);
      return;
    }
    Animated.spring(fill, {
      toValue: checked ? 1 : 0,
      useNativeDriver: true,
      friction: 6,
      tension: 140,
    }).start();
  }, [checked]);

  const handlePress = () => {
    if (!checked && successOnCheck) {
      hapticSuccess();
      playSound('complete');
    } else {
      hapticToggle();
    }

    if (animationsEnabled()) {
      Animated.sequence([
        Animated.timing(press, { toValue: 0.82, duration: 90, useNativeDriver: true }),
        Animated.spring(press, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
      ]).start();
    }
    onToggle();
  };

  const radius = Math.round(size * 0.32);

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          styles.box,
          {
            width: size,
            height: size,
            borderRadius: radius,
            borderColor: checked ? accent : line,
            transform: [{ scale: press }],
          },
        ]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: accent,
              borderRadius: radius - 1,
              opacity: fill,
              transform: [{ scale: fill }],
            },
          ]}
        />
        <Animated.View style={{ opacity: fill, transform: [{ scale: fill }] }}>
          <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
            <Path
              d="M20 6 9 17l-5-5"
              stroke="#fff"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.7,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
