import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme';

interface Props {
  children: React.ReactNode;
  radius?: number;
  /** Clip children to the rounded corners (for cards with divided rows). */
  clip?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The standard Margin surface card: flat (no shadow), 1px hairline-ish border on
 * the surface color. Matches the design, where elevation comes from the border
 * and bg contrast — not drop shadows.
 */
export default function Card({ children, radius = 18, clip = false, style }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderColor: theme.line,
          borderWidth: 1,
          borderRadius: radius,
        },
        clip && { overflow: 'hidden' },
        style,
      ]}
    >
      {children}
    </View>
  );
}
