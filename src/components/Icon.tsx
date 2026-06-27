import React from 'react';
import Svg, { Path, Circle, Rect, Polyline, Line } from 'react-native-svg';

// A single source of truth for the line-icon set used throughout Margin, ported
// 1:1 from the design's inline SVGs (24x24 viewBox, round caps/joins).

export type IconName =
  | 'gear'
  | 'check'
  | 'plus'
  | 'search'
  | 'clock'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronUp'
  | 'archive'
  | 'folder'
  | 'dots'
  | 'sun'
  | 'moon'
  | 'pencil'
  | 'link'
  | 'trash'
  | 'sliders'
  | 'bookmark'
  | 'download'
  | 'calendar'
  | 'home';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function Icon({ name, size = 22, color = '#000', strokeWidth = 1.8 }: Props) {
  const s = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  const svg = (children: React.ReactNode) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );

  switch (name) {
    case 'gear':
      return svg(
        <>
          <Circle cx={12} cy={12} r={3} {...s} />
          <Path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
            {...s}
          />
        </>
      );
    case 'check':
      return svg(<Path d="M20 6 9 17l-5-5" {...s} />);
    case 'plus':
      return svg(<Path d="M12 5v14M5 12h14" {...s} />);
    case 'search':
      return svg(
        <>
          <Circle cx={11} cy={11} r={7} {...s} />
          <Path d="m21 21-4.3-4.3" {...s} />
        </>
      );
    case 'clock':
      return svg(
        <>
          <Circle cx={12} cy={12} r={9} {...s} />
          <Path d="M12 7v5l3 2" {...s} />
        </>
      );
    case 'chevronRight':
      return svg(<Path d="m9 6 6 6-6 6" {...s} />);
    case 'chevronLeft':
      return svg(<Path d="m15 18-6-6 6-6" {...s} />);
    case 'chevronUp':
      return svg(<Path d="m18 15-6-6-6 6" {...s} />);
    case 'archive':
      return svg(
        <>
          <Rect x={3} y={4} width={18} height={4} rx={1} {...s} />
          <Path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" {...s} />
        </>
      );
    case 'folder':
      return svg(
        <Path
          d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
          {...s}
        />
      );
    case 'dots':
      return svg(
        <>
          <Circle cx={5} cy={12} r={1.8} fill={color} />
          <Circle cx={12} cy={12} r={1.8} fill={color} />
          <Circle cx={19} cy={12} r={1.8} fill={color} />
        </>
      );
    case 'sun':
      return svg(
        <>
          <Circle cx={12} cy={12} r={4.5} {...s} />
          <Path
            d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19"
            {...s}
          />
        </>
      );
    case 'moon':
      return svg(<Path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" {...s} />);
    case 'pencil':
      return svg(<Path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" {...s} />);
    case 'link':
      return svg(
        <>
          <Path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" {...s} />
          <Path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" {...s} />
        </>
      );
    case 'trash':
      return svg(<Path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" {...s} />);
    case 'sliders':
      return svg(<Path d="M4 6h12M4 12h8M4 18h4" {...s} />);
    case 'bookmark':
      return svg(<Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" {...s} />);
    case 'download':
      return svg(
        <>
          <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" {...s} />
          <Polyline points="7 10 12 15 17 10" {...s} />
          <Line x1={12} y1={15} x2={12} y2={3} {...s} />
        </>
      );
    case 'calendar':
      return svg(
        <>
          <Rect x={3} y={4.5} width={18} height={16} rx={2.5} {...s} />
          <Path d="M3 9h18M8 2.5v4M16 2.5v4" {...s} />
        </>
      );
    case 'home':
      return svg(
        <>
          <Path d="M3 10.5 12 3l9 7.5" {...s} />
          <Path d="M5 9.5V20h14V9.5" {...s} />
        </>
      );
  }
}
