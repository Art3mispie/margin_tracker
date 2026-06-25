export interface ChecklistItem {
  text: string;
  done: boolean;
  today?: boolean;
}

export interface Link {
  label: string;
}

export interface Extras {
  checklist?: boolean;
  sketch?: boolean;
  links?: boolean;
}

export interface Idea {
  id: number;
  title: string;
  body: string;
  tags: string[];
  project: string | null;
  due: number | null;
  archived: boolean;
  checklist: ChecklistItem[];
  links: Link[];
  sketches: string[];
  extras: Extras;
  createdAt: number;
}

export type Screen = 'today' | 'ideas' | 'calendar' | 'settings';
export type ThemeKey = 'paper' | 'cool' | 'mono';

export interface Theme {
  key: ThemeKey;
  name: string;
  desc: string;
  bg: string;
  surface: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  line: string;
  accent: string;
  accentInk: string;
  accentSoft: string;
  accentRGB: string;
  canvas: string;
  gridEmpty: string;
  sky: string;
  sun: string;
  wave1: string;
  wave2: string;
  wave3: string;
  sand: string;
  boat: string;
  sail: string;
  fdispFamily: string;
  fuiFamily: string;
}
