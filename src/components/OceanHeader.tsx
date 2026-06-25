import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { useTheme } from '../theme';

interface Props {
  translateY: Animated.Value | Animated.AnimatedInterpolation<number>;
}

export default function OceanHeader({ translateY }: Props) {
  const theme = useTheme();

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <Svg
        width="100%"
        height={380}
        viewBox="0 0 392 380"
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <LinearGradient id="ocnFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.7" stopColor="transparent" stopOpacity="0" />
            <Stop offset="1" stopColor={theme.bg} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Sky */}
        <Rect x="0" y="0" width="392" height="380" fill={theme.sky} />

        {/* Deep zone (wave3) */}
        <Path
          d="M0 58 Q70 50 140 58 Q210 66 280 54 Q340 46 392 56 L392 380 L0 380 Z"
          fill={theme.wave3}
        />

        {/* Mid zone (wave2) */}
        <Path
          d="M0 152 Q80 144 160 152 Q240 160 320 148 Q360 142 392 150 L392 380 L0 380 Z"
          fill={theme.wave2}
        />

        {/* Light zone (wave1) */}
        <Path
          d="M0 246 Q90 238 180 246 Q270 254 392 242 L392 380 L0 380 Z"
          fill={theme.wave1}
        />

        {/* Wave divider lines */}
        <Path
          d="M0 58 Q70 50 140 58 Q210 66 280 54 Q340 46 392 56"
          stroke="white"
          strokeWidth="1.5"
          fill="none"
          opacity={0.22}
        />
        <Path
          d="M0 152 Q80 144 160 152 Q240 160 320 148 Q360 142 392 150"
          stroke="white"
          strokeWidth="1.5"
          fill="none"
          opacity={0.15}
        />
        <Path
          d="M0 246 Q90 238 180 246 Q270 254 392 242"
          stroke="white"
          strokeWidth="1.5"
          fill="none"
          opacity={0.10}
        />

        {/* Fade overlay */}
        <Rect x="0" y="0" width="392" height="380" fill="url(#ocnFade)" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -52,
    left: 0,
    right: 0,
    height: 380,
    zIndex: 0,
  },
});
