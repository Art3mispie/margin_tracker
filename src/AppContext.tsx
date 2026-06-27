import React, { createContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { AppState as RNAppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Idea, Screen, ThemeKey } from './types';
import { seedIdeas } from './seed';
import { dayKey, dueInfo, fmtShort, fmtFull } from './dates';
import { syncNotifications } from './notifications';
import { setHapticsEnabled } from './haptics';
import { setAnimationsEnabled } from './anim';
import { setSoundEnabled } from './sound';

const STORAGE_KEY = 'margin.store.v1';

// Slice of state that gets persisted across launches.
interface PersistedState {
  ideas: Idea[];
  theme: ThemeKey;
  notifMorning: boolean;
  notifMorningTime: string;
  notifEvening: boolean;
  notifEveningTime: string;
  notifDue: boolean;
  haptics: boolean;
  animations: boolean;
  sound: boolean;
}

// Inline theme data to avoid circular dependency with theme.ts
const themeAccentRGB: Record<ThemeKey, string> = {
  paper: '44,109,168',
  cool: '46,134,196',
  mono: '39,97,158',
};
const themeGridEmpty: Record<ThemeKey, string> = {
  paper: '#ECE4D3',
  cool: '#E4ECEF',
  mono: '#E2EAF1',
};

// ─── State ───────────────────────────────────────────────────────────────────

export interface AppState {
  screen: Screen;
  theme: ThemeKey;
  ideas: Idea[];
  captureOpen: boolean;
  captureText: string;
  captureTags: string[];
  noteId: number | null;
  readerId: number | null;
  noteMenuOpen: boolean;
  metaPanel: 'project' | 'due' | null;
  taskPickerOpen: boolean;
  taskPickerSearch: string;
  planShowLoose: boolean;
  browseKey: string | null;
  search: string;
  ideasView: 'all' | 'folders';
  ideasSort: 'recent' | 'oldest' | 'due';
  ideasFilter: string | null;
  manageKind: 'project' | 'tag' | null;
  projectMenuName: string | null;
  pmRenaming: boolean;
  pmRenameText: string;
  newProjectOpen: boolean;
  newProjectText: string;
  calRef: number;
  selectedDay: string;
  notifMorning: boolean;
  notifMorningTime: string;
  notifEvening: boolean;
  notifEveningTime: string;
  notifDue: boolean;
  haptics: boolean;
  animations: boolean;
  sound: boolean;
}

const today = new Date();
const initialState: AppState = {
  screen: 'today',
  theme: 'paper',
  ideas: seedIdeas,
  captureOpen: false,
  captureText: '',
  captureTags: [],
  noteId: null,
  readerId: null,
  noteMenuOpen: false,
  metaPanel: null,
  taskPickerOpen: false,
  taskPickerSearch: '',
  planShowLoose: false,
  browseKey: null,
  search: '',
  ideasView: 'all',
  ideasSort: 'recent',
  ideasFilter: null,
  manageKind: null,
  projectMenuName: null,
  pmRenaming: false,
  pmRenameText: '',
  newProjectOpen: false,
  newProjectText: '',
  calRef: Date.now(),
  selectedDay: `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`,
  notifMorning: false,
  notifMorningTime: '08:00',
  notifEvening: false,
  notifEveningTime: '20:00',
  notifDue: false,
  haptics: true,
  animations: true,
  sound: true,
};

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'HYDRATE'; data: Partial<PersistedState> }
  | { type: 'SET_SCREEN'; screen: Screen }
  | { type: 'SET_THEME'; theme: ThemeKey }
  | { type: 'OPEN_CAPTURE' }
  | { type: 'CLOSE_CAPTURE' }
  | { type: 'SET_CAPTURE_TEXT'; text: string }
  | { type: 'TOGGLE_CAPTURE_TAG'; tag: string }
  | { type: 'SAVE_CAPTURE'; idea: Idea }
  | { type: 'OPEN_NOTE'; id: number }
  | { type: 'CLOSE_NOTE' }
  | { type: 'OPEN_READER'; id: number }
  | { type: 'CLOSE_READER' }
  | { type: 'PATCH_IDEA'; id: number; changes: Partial<Idea> }
  | { type: 'ARCHIVE_IDEA'; id: number }
  | { type: 'DELETE_IDEA'; id: number }
  | { type: 'OPEN_BROWSE'; key: string }
  | { type: 'CLEAR_BROWSE' }
  | { type: 'SET_SEARCH'; text: string }
  | { type: 'SET_IDEAS_VIEW'; view: 'all' | 'folders' }
  | { type: 'SET_IDEAS_SORT'; sort: 'recent' | 'oldest' | 'due' }
  | { type: 'SET_IDEAS_FILTER'; filter: string | null }
  | { type: 'SET_NOTE_MENU'; open: boolean }
  | { type: 'SET_META_PANEL'; panel: 'project' | 'due' | null }
  | { type: 'SET_TASK_PICKER'; open: boolean }
  | { type: 'SET_TASK_PICKER_SEARCH'; text: string }
  | { type: 'TOGGLE_PLAN_LOOSE' }
  | { type: 'OPEN_MANAGE'; kind: 'project' | 'tag'; name: string }
  | { type: 'CLOSE_PROJECT_MENU' }
  | { type: 'START_RENAME' }
  | { type: 'SET_RENAME_TEXT'; text: string }
  | { type: 'COMMIT_RENAME'; oldName: string; newName: string; kind: 'project' | 'tag' }
  | { type: 'DELETE_PROJECT'; name: string }
  | { type: 'DELETE_TAG'; name: string }
  | { type: 'START_NEW_PROJECT' }
  | { type: 'CLOSE_NEW_PROJECT' }
  | { type: 'SET_NEW_PROJECT_TEXT'; text: string }
  | { type: 'COMMIT_NEW_PROJECT' }
  | { type: 'PREV_MONTH' }
  | { type: 'NEXT_MONTH' }
  | { type: 'SELECT_DAY'; day: string }
  | { type: 'SET_TASK_TODAY'; ideaId: number; taskIdx: number; today: boolean }
  | { type: 'TOGGLE_TASK_DONE'; ideaId: number; taskIdx: number }
  | { type: 'TOGGLE_NOTIF_MORNING' }
  | { type: 'TOGGLE_NOTIF_EVENING' }
  | { type: 'TOGGLE_NOTIF_DUE' }
  | { type: 'SET_NOTIF_MORNING_TIME'; time: string }
  | { type: 'SET_NOTIF_EVENING_TIME'; time: string }
  | { type: 'TOGGLE_HAPTICS' }
  | { type: 'TOGGLE_ANIMATIONS' }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'CLEAR_ARCHIVE' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.data };
    case 'SET_SCREEN':
      return { ...state, screen: action.screen };
    case 'SET_THEME':
      return { ...state, theme: action.theme };

    case 'OPEN_CAPTURE':
      return { ...state, captureOpen: true, captureText: '', captureTags: [] };
    case 'CLOSE_CAPTURE':
      return { ...state, captureOpen: false, captureText: '', captureTags: [] };
    case 'SET_CAPTURE_TEXT':
      return { ...state, captureText: action.text };
    case 'TOGGLE_CAPTURE_TAG': {
      const tags = state.captureTags.includes(action.tag)
        ? state.captureTags.filter(t => t !== action.tag)
        : [...state.captureTags, action.tag];
      return { ...state, captureTags: tags };
    }
    case 'SAVE_CAPTURE':
      return {
        ...state,
        ideas: [action.idea, ...state.ideas],
        captureOpen: false,
        captureText: '',
        captureTags: [],
      };

    case 'OPEN_NOTE':
      return { ...state, noteId: action.id, noteMenuOpen: false, metaPanel: null };
    case 'CLOSE_NOTE': {
      const idea = state.ideas.find(i => i.id === state.noteId);
      const isEmpty =
        !!idea &&
        !idea.title.trim() &&
        !idea.body.trim() &&
        idea.tags.length === 0 &&
        idea.checklist.length === 0 &&
        idea.links.length === 0 &&
        idea.sketches.length === 0 &&
        idea.due === null &&
        idea.project === null;
      if (isEmpty) {
        return {
          ...state,
          noteId: null,
          noteMenuOpen: false,
          metaPanel: null,
          ideas: state.ideas.filter(i => i.id !== state.noteId),
        };
      }
      return { ...state, noteId: null, noteMenuOpen: false, metaPanel: null };
    }
    case 'OPEN_READER':
      return { ...state, readerId: action.id };
    case 'CLOSE_READER':
      return { ...state, readerId: null };

    case 'PATCH_IDEA':
      return {
        ...state,
        ideas: state.ideas.map(i =>
          i.id === action.id ? { ...i, ...action.changes } : i
        ),
      };
    case 'ARCHIVE_IDEA':
      return {
        ...state,
        ideas: state.ideas.map(i =>
          i.id === action.id ? { ...i, archived: true } : i
        ),
        readerId: state.readerId === action.id ? null : state.readerId,
        noteId: state.noteId === action.id ? null : state.noteId,
      };
    case 'DELETE_IDEA':
      return {
        ...state,
        ideas: state.ideas.filter(i => i.id !== action.id),
        noteId: state.noteId === action.id ? null : state.noteId,
        readerId: state.readerId === action.id ? null : state.readerId,
      };

    case 'OPEN_BROWSE':
      return { ...state, browseKey: action.key, screen: 'ideas' };
    case 'CLEAR_BROWSE':
      return { ...state, browseKey: null };
    case 'SET_SEARCH':
      return { ...state, search: action.text };
    case 'SET_IDEAS_VIEW':
      return { ...state, ideasView: action.view, ideasFilter: null };
    case 'SET_IDEAS_SORT':
      return { ...state, ideasSort: action.sort };
    case 'SET_IDEAS_FILTER':
      return { ...state, ideasFilter: action.filter };
    case 'SET_NOTE_MENU':
      return { ...state, noteMenuOpen: action.open };
    case 'SET_META_PANEL':
      return { ...state, metaPanel: action.panel };
    case 'SET_TASK_PICKER':
      return { ...state, taskPickerOpen: action.open, taskPickerSearch: '' };
    case 'SET_TASK_PICKER_SEARCH':
      return { ...state, taskPickerSearch: action.text };
    case 'TOGGLE_PLAN_LOOSE':
      return { ...state, planShowLoose: !state.planShowLoose };

    case 'OPEN_MANAGE':
      return {
        ...state,
        manageKind: action.kind,
        projectMenuName: action.name,
        pmRenaming: false,
        pmRenameText: action.name,
      };
    case 'CLOSE_PROJECT_MENU':
      return {
        ...state,
        manageKind: null,
        projectMenuName: null,
        pmRenaming: false,
        pmRenameText: '',
      };
    case 'START_RENAME':
      return { ...state, pmRenaming: true, pmRenameText: state.projectMenuName || '' };
    case 'SET_RENAME_TEXT':
      return { ...state, pmRenameText: action.text };
    case 'COMMIT_RENAME': {
      const { oldName, newName, kind } = action;
      if (!newName.trim() || newName === oldName) {
        return { ...state, pmRenaming: false, projectMenuName: oldName };
      }
      const ideas = state.ideas.map(i => {
        if (kind === 'project' && i.project === oldName) return { ...i, project: newName };
        if (kind === 'tag' && i.tags.includes(oldName)) {
          return { ...i, tags: i.tags.map(t => (t === oldName ? newName : t)) };
        }
        return i;
      });
      return {
        ...state,
        ideas,
        pmRenaming: false,
        projectMenuName: newName,
        pmRenameText: newName,
      };
    }
    case 'DELETE_PROJECT':
      return {
        ...state,
        ideas: state.ideas.map(i =>
          i.project === action.name ? { ...i, project: null } : i
        ),
        manageKind: null,
        projectMenuName: null,
      };
    case 'DELETE_TAG':
      return {
        ...state,
        ideas: state.ideas.map(i =>
          i.tags.includes(action.name)
            ? { ...i, tags: i.tags.filter(t => t !== action.name) }
            : i
        ),
        manageKind: null,
        projectMenuName: null,
      };
    case 'START_NEW_PROJECT':
      return { ...state, newProjectOpen: true, newProjectText: '' };
    case 'CLOSE_NEW_PROJECT':
      return { ...state, newProjectOpen: false, newProjectText: '' };
    case 'SET_NEW_PROJECT_TEXT':
      return { ...state, newProjectText: action.text };
    case 'COMMIT_NEW_PROJECT':
      return { ...state, newProjectOpen: false, newProjectText: '' };

    case 'PREV_MONTH': {
      const d = new Date(state.calRef);
      d.setMonth(d.getMonth() - 1);
      return { ...state, calRef: d.getTime() };
    }
    case 'NEXT_MONTH': {
      const d = new Date(state.calRef);
      d.setMonth(d.getMonth() + 1);
      return { ...state, calRef: d.getTime() };
    }
    case 'SELECT_DAY':
      return { ...state, selectedDay: action.day };

    case 'SET_TASK_TODAY':
      return {
        ...state,
        ideas: state.ideas.map(i => {
          if (i.id !== action.ideaId) return i;
          const checklist = i.checklist.map((c, idx) =>
            idx === action.taskIdx ? { ...c, today: action.today } : c
          );
          return { ...i, checklist };
        }),
      };
    case 'TOGGLE_TASK_DONE':
      return {
        ...state,
        ideas: state.ideas.map(i => {
          if (i.id !== action.ideaId) return i;
          const checklist = i.checklist.map((c, idx) =>
            idx === action.taskIdx ? { ...c, done: !c.done } : c
          );
          return { ...i, checklist };
        }),
      };

    case 'TOGGLE_NOTIF_MORNING':
      return { ...state, notifMorning: !state.notifMorning };
    case 'TOGGLE_NOTIF_EVENING':
      return { ...state, notifEvening: !state.notifEvening };
    case 'TOGGLE_NOTIF_DUE':
      return { ...state, notifDue: !state.notifDue };
    case 'SET_NOTIF_MORNING_TIME':
      return { ...state, notifMorningTime: action.time };
    case 'SET_NOTIF_EVENING_TIME':
      return { ...state, notifEveningTime: action.time };
    case 'TOGGLE_HAPTICS':
      return { ...state, haptics: !state.haptics };
    case 'TOGGLE_ANIMATIONS':
      return { ...state, animations: !state.animations };
    case 'TOGGLE_SOUND':
      return { ...state, sound: !state.sound };

    case 'CLEAR_ARCHIVE':
      return { ...state, ideas: state.ideas.filter(i => !i.archived) };

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

let _nextId = 100;
const nextId = () => ++_nextId;

export interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Helper methods
  dayKey: (ts: number) => string;
  fmtShort: (ts: number) => string;
  fmtFull: (ts: number) => string;
  dueInfo: (ts: number) => { label: string; overdue: boolean; diff: number } | null;
  metaLine: (idea: Idea) => string;
  active: () => Idea[];
  byDay: () => Record<string, number>;
  levelColor: (count: number) => string;
  rgba: (a: number) => string;
  // Actions
  openCapture: () => void;
  closeCapture: () => void;
  saveCapture: () => void;
  expandQuick: () => void;
  openNote: (id: number) => void;
  closeNote: () => void;
  openReader: (id: number) => void;
  closeReader: () => void;
  editFromReader: () => void;
  patch: (id: number, changes: Partial<Idea>) => void;
  archiveIdea: (id: number) => void;
  deleteNote: () => void;
  archiveNote: () => void;
  openBrowse: (key: string) => void;
  clearBrowse: () => void;
  setScreen: (screen: Screen) => void;
  setTheme: (theme: ThemeKey) => void;
  toggleNotifMorning: () => void;
  toggleNotifEvening: () => void;
  toggleNotifDue: () => void;
  toggleHaptics: () => void;
  toggleAnimations: () => void;
  toggleSound: () => void;
  prevMonth: () => void;
  nextMonth: () => void;
  selectDay: (day: string) => void;
  setTaskToday: (ideaId: number, taskIdx: number, today: boolean) => void;
  toggleTaskDone: (ideaId: number, taskIdx: number) => void;
  openManage: (kind: 'project' | 'tag', name: string) => void;
  closeProjectMenu: () => void;
  startRename: () => void;
  commitRename: () => void;
  deleteProject: () => void;
  startNewProject: () => void;
  closeNewProject: () => void;
  commitNewProject: () => void;
  setIdeasView: (view: 'all' | 'folders') => void;
  cycleSort: () => void;
  setIdeasFilter: (filter: string | null) => void;
  toggleCaptureTag: (tag: string) => void;
  openTaskPicker: () => void;
  closeTaskPicker: () => void;
  togglePlanLoose: () => void;
  addExtra: (ideaId: number, kind: 'checklist' | 'sketch' | 'links') => void;
  toggleChk: (ideaId: number, idx: number) => void;
  removeChk: (ideaId: number, idx: number) => void;
  removeTag: (ideaId: number, tag: string) => void;
  addTagToNote: (ideaId: number, tag: string) => void;
  setDue: (ideaId: number, due: number | null) => void;
  setProject: (ideaId: number, project: string | null) => void;
  removeLink: (ideaId: number, idx: number) => void;
  addSketch: (ideaId: number, uri: string) => void;
  removeSketch: (ideaId: number, idx: number) => void;
  clearArchive: () => void;
}

export const AppContext = createContext<AppContextValue>({} as AppContextValue);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const hydrated = useRef(false);

  // Latest persisted slice, kept in a ref so the background-flush listener
  // (registered once) always sees current data.
  const persistedRef = useRef<PersistedState | null>(null);
  persistedRef.current = {
    ideas: state.ideas,
    theme: state.theme,
    notifMorning: state.notifMorning,
    notifMorningTime: state.notifMorningTime,
    notifEvening: state.notifEvening,
    notifEveningTime: state.notifEveningTime,
    notifDue: state.notifDue,
    haptics: state.haptics,
    animations: state.animations,
    sound: state.sound,
  };

  // ── Persistence: load once on mount, then save the persisted slice on change ─
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw) as Partial<PersistedState>;
          if (Array.isArray(data.ideas)) {
            // Backfill any fields added since the data was written.
            data.ideas = data.ideas.map(i => ({
              ...i,
              tags: i.tags ?? [],
              checklist: i.checklist ?? [],
              links: i.links ?? [],
              sketches: i.sketches ?? [],
              extras: i.extras ?? {},
            }));
            const maxId = data.ideas.reduce((m, i) => Math.max(m, i.id), 0);
            if (maxId >= _nextId) _nextId = maxId + 1;
          }
          dispatch({ type: 'HYDRATE', data });
        }
      } catch {
        // Corrupt or unavailable storage — fall back to seed data.
      } finally {
        hydrated.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const data: PersistedState = {
      ideas: state.ideas,
      theme: state.theme,
      notifMorning: state.notifMorning,
      notifMorningTime: state.notifMorningTime,
      notifEvening: state.notifEvening,
      notifEveningTime: state.notifEveningTime,
      notifDue: state.notifDue,
      haptics: state.haptics,
      animations: state.animations,
      sound: state.sound,
    };
    // Debounce so rapid edits (typing a title/body) don't hammer storage.
    const handle = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
    }, 400);
    return () => clearTimeout(handle);
  }, [
    state.ideas,
    state.theme,
    state.notifMorning,
    state.notifMorningTime,
    state.notifEvening,
    state.notifEveningTime,
    state.notifDue,
    state.haptics,
    state.animations,
    state.sound,
  ]);

  // Keep the fail-safe feedback helpers in sync with the user's preferences.
  useEffect(() => {
    setHapticsEnabled(state.haptics);
  }, [state.haptics]);
  useEffect(() => {
    setAnimationsEnabled(state.animations);
  }, [state.animations]);
  useEffect(() => {
    setSoundEnabled(state.sound);
  }, [state.sound]);

  // Reconcile scheduled local notifications whenever the relevant settings or
  // due dates change. A signature of due dates avoids rescheduling on every edit.
  const dueSignature = state.notifDue
    ? state.ideas
        .filter(i => !i.archived && i.due)
        .map(i => `${i.id}:${i.due}`)
        .join(',')
    : '';
  useEffect(() => {
    if (!hydrated.current) return;
    syncNotifications(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.notifMorning,
    state.notifMorningTime,
    state.notifEvening,
    state.notifEveningTime,
    state.notifDue,
    dueSignature,
  ]);

  // Flush immediately when the app is backgrounded, so nothing in the debounce
  // window is lost if the OS suspends or kills the app.
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', next => {
      if ((next === 'background' || next === 'inactive') && hydrated.current && persistedRef.current) {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persistedRef.current)).catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const active = useCallback(() => state.ideas.filter(i => !i.archived), [state.ideas]);

  const byDay = useCallback((): Record<string, number> => {
    const map: Record<string, number> = {};
    for (const idea of state.ideas) {
      if (idea.archived) continue;
      const k = dayKey(idea.createdAt);
      map[k] = (map[k] || 0) + 1;
    }
    return map;
  }, [state.ideas]);

  const levelColor = useCallback(
    (count: number): string => {
      const rgb = themeAccentRGB[state.theme];
      const empty = themeGridEmpty[state.theme];
      if (count === 0) return empty;
      if (count === 1) return `rgba(${rgb},.28)`;
      if (count === 2) return `rgba(${rgb},.5)`;
      if (count === 3) return `rgba(${rgb},.72)`;
      return `rgba(${rgb},.94)`;
    },
    [state.theme]
  );

  const rgba = useCallback(
    (a: number): string => `rgba(${themeAccentRGB[state.theme]},${a})`,
    [state.theme]
  );

  const metaLine = useCallback((idea: Idea): string => {
    const parts: string[] = [];
    const open = idea.checklist.filter(c => !c.done).length;
    if (open > 0) parts.push(`${open} step${open === 1 ? '' : 's'} open`);
    if (idea.tags.length) parts.push(idea.tags.map(t => `#${t}`).join(' '));
    return parts.join('  ·  ');
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const openCapture = useCallback(() => dispatch({ type: 'OPEN_CAPTURE' }), []);
  const closeCapture = useCallback(() => dispatch({ type: 'CLOSE_CAPTURE' }), []);

  const saveCapture = useCallback(() => {
    const text = state.captureText.trim();
    if (!text) { dispatch({ type: 'CLOSE_CAPTURE' }); return; }
    const idea: Idea = {
      id: nextId(),
      title: text,
      body: '',
      tags: state.captureTags,
      project: null,
      due: null,
      archived: false,
      checklist: [],
      links: [],
      sketches: [],
      extras: {},
      createdAt: Date.now(),
    };
    dispatch({ type: 'SAVE_CAPTURE', idea });
  }, [state.captureText, state.captureTags]);

  const expandQuick = useCallback(() => {
    const text = state.captureText.trim();
    if (!text) {
      dispatch({ type: 'CLOSE_CAPTURE' });
      return;
    }
    const idea: Idea = {
      id: nextId(),
      title: text,
      body: '',
      tags: state.captureTags,
      project: null,
      due: null,
      archived: false,
      checklist: [],
      links: [],
      sketches: [],
      extras: {},
      createdAt: Date.now(),
    };
    dispatch({ type: 'SAVE_CAPTURE', idea });
    dispatch({ type: 'OPEN_NOTE', id: idea.id });
  }, [state.captureText, state.captureTags]);

  const openNote = useCallback((id: number) => dispatch({ type: 'OPEN_NOTE', id }), []);

  const closeNote = useCallback(() => dispatch({ type: 'CLOSE_NOTE' }), []);

  const openReader = useCallback((id: number) => dispatch({ type: 'OPEN_READER', id }), []);
  const closeReader = useCallback(() => dispatch({ type: 'CLOSE_READER' }), []);

  const editFromReader = useCallback(() => {
    if (state.readerId !== null) {
      const id = state.readerId;
      dispatch({ type: 'CLOSE_READER' });
      dispatch({ type: 'OPEN_NOTE', id });
    }
  }, [state.readerId]);

  const patch = useCallback(
    (id: number, changes: Partial<Idea>) =>
      dispatch({ type: 'PATCH_IDEA', id, changes }),
    []
  );

  const archiveIdea = useCallback(
    (id: number) => dispatch({ type: 'ARCHIVE_IDEA', id }),
    []
  );

  const deleteNote = useCallback(() => {
    if (state.noteId !== null) dispatch({ type: 'DELETE_IDEA', id: state.noteId });
  }, [state.noteId]);

  const archiveNote = useCallback(() => {
    if (state.noteId !== null) dispatch({ type: 'ARCHIVE_IDEA', id: state.noteId });
  }, [state.noteId]);

  const openBrowse = useCallback(
    (key: string) => dispatch({ type: 'OPEN_BROWSE', key }),
    []
  );
  const clearBrowse = useCallback(() => dispatch({ type: 'CLEAR_BROWSE' }), []);

  const setScreen = useCallback(
    (screen: Screen) => dispatch({ type: 'SET_SCREEN', screen }),
    []
  );
  const setTheme = useCallback(
    (theme: ThemeKey) => dispatch({ type: 'SET_THEME', theme }),
    []
  );

  const toggleNotifMorning = useCallback(
    () => dispatch({ type: 'TOGGLE_NOTIF_MORNING' }),
    []
  );
  const toggleNotifEvening = useCallback(
    () => dispatch({ type: 'TOGGLE_NOTIF_EVENING' }),
    []
  );
  const toggleNotifDue = useCallback(
    () => dispatch({ type: 'TOGGLE_NOTIF_DUE' }),
    []
  );
  const toggleHaptics = useCallback(() => dispatch({ type: 'TOGGLE_HAPTICS' }), []);
  const toggleAnimations = useCallback(() => dispatch({ type: 'TOGGLE_ANIMATIONS' }), []);
  const toggleSound = useCallback(() => dispatch({ type: 'TOGGLE_SOUND' }), []);

  const prevMonth = useCallback(() => dispatch({ type: 'PREV_MONTH' }), []);
  const nextMonth = useCallback(() => dispatch({ type: 'NEXT_MONTH' }), []);
  const selectDay = useCallback(
    (day: string) => dispatch({ type: 'SELECT_DAY', day }),
    []
  );

  const setTaskToday = useCallback(
    (ideaId: number, taskIdx: number, t: boolean) =>
      dispatch({ type: 'SET_TASK_TODAY', ideaId, taskIdx, today: t }),
    []
  );
  const toggleTaskDone = useCallback(
    (ideaId: number, taskIdx: number) =>
      dispatch({ type: 'TOGGLE_TASK_DONE', ideaId, taskIdx }),
    []
  );

  const openManage = useCallback(
    (kind: 'project' | 'tag', name: string) =>
      dispatch({ type: 'OPEN_MANAGE', kind, name }),
    []
  );
  const closeProjectMenu = useCallback(
    () => dispatch({ type: 'CLOSE_PROJECT_MENU' }),
    []
  );
  const startRename = useCallback(() => dispatch({ type: 'START_RENAME' }), []);
  const commitRename = useCallback(() => {
    if (state.projectMenuName && state.manageKind) {
      dispatch({
        type: 'COMMIT_RENAME',
        oldName: state.projectMenuName,
        newName: state.pmRenameText,
        kind: state.manageKind,
      });
    }
  }, [state.projectMenuName, state.manageKind, state.pmRenameText]);

  const deleteProject = useCallback(() => {
    if (!state.projectMenuName || !state.manageKind) return;
    if (state.manageKind === 'project') {
      dispatch({ type: 'DELETE_PROJECT', name: state.projectMenuName });
    } else {
      dispatch({ type: 'DELETE_TAG', name: state.projectMenuName });
    }
  }, [state.projectMenuName, state.manageKind]);

  const startNewProject = useCallback(
    () => dispatch({ type: 'START_NEW_PROJECT' }),
    []
  );
  const closeNewProject = useCallback(
    () => dispatch({ type: 'CLOSE_NEW_PROJECT' }),
    []
  );
  const commitNewProject = useCallback(() => {
    const name = state.newProjectText.trim();
    if (!name) {
      dispatch({ type: 'CLOSE_NEW_PROJECT' });
      return;
    }
    if (state.noteId !== null) {
      // Created from inside the editor — assign to the open note.
      dispatch({ type: 'PATCH_IDEA', id: state.noteId, changes: { project: name } });
      dispatch({ type: 'COMMIT_NEW_PROJECT' });
    } else {
      // Created from the Folders tab — start a fresh idea in the project and open it.
      const idea: Idea = {
        id: nextId(),
        title: '',
        body: '',
        tags: [],
        project: name,
        due: null,
        archived: false,
        checklist: [],
        links: [],
        sketches: [],
        extras: {},
        createdAt: Date.now(),
      };
      dispatch({ type: 'SAVE_CAPTURE', idea });
      dispatch({ type: 'COMMIT_NEW_PROJECT' });
      dispatch({ type: 'OPEN_NOTE', id: idea.id });
    }
  }, [state.newProjectText, state.noteId]);

  const setIdeasView = useCallback(
    (view: 'all' | 'folders') => dispatch({ type: 'SET_IDEAS_VIEW', view }),
    []
  );
  const cycleSort = useCallback(() => {
    const order: Array<'recent' | 'oldest' | 'due'> = ['recent', 'oldest', 'due'];
    const next = order[(order.indexOf(state.ideasSort) + 1) % order.length];
    dispatch({ type: 'SET_IDEAS_SORT', sort: next });
  }, [state.ideasSort]);
  const setIdeasFilter = useCallback(
    (filter: string | null) => dispatch({ type: 'SET_IDEAS_FILTER', filter }),
    []
  );
  const toggleCaptureTag = useCallback(
    (tag: string) => dispatch({ type: 'TOGGLE_CAPTURE_TAG', tag }),
    []
  );
  const openTaskPicker = useCallback(
    () => dispatch({ type: 'SET_TASK_PICKER', open: true }),
    []
  );
  const closeTaskPicker = useCallback(
    () => dispatch({ type: 'SET_TASK_PICKER', open: false }),
    []
  );
  const togglePlanLoose = useCallback(
    () => dispatch({ type: 'TOGGLE_PLAN_LOOSE' }),
    []
  );

  const addExtra = useCallback(
    (ideaId: number, kind: 'checklist' | 'sketch' | 'links') => {
      const idea = state.ideas.find(i => i.id === ideaId);
      if (!idea) return;
      dispatch({
        type: 'PATCH_IDEA',
        id: ideaId,
        changes: { extras: { ...idea.extras, [kind]: true } },
      });
    },
    [state.ideas]
  );

  const toggleChk = useCallback(
    (ideaId: number, idx: number) => {
      const idea = state.ideas.find(i => i.id === ideaId);
      if (!idea) return;
      const checklist = idea.checklist.map((c, i) =>
        i === idx ? { ...c, done: !c.done } : c
      );
      dispatch({ type: 'PATCH_IDEA', id: ideaId, changes: { checklist } });
    },
    [state.ideas]
  );

  const removeChk = useCallback(
    (ideaId: number, idx: number) => {
      const idea = state.ideas.find(i => i.id === ideaId);
      if (!idea) return;
      const checklist = idea.checklist.filter((_, i) => i !== idx);
      dispatch({ type: 'PATCH_IDEA', id: ideaId, changes: { checklist } });
    },
    [state.ideas]
  );

  const removeTag = useCallback(
    (ideaId: number, tag: string) => {
      const idea = state.ideas.find(i => i.id === ideaId);
      if (!idea) return;
      dispatch({
        type: 'PATCH_IDEA',
        id: ideaId,
        changes: { tags: idea.tags.filter(t => t !== tag) },
      });
    },
    [state.ideas]
  );

  const addTagToNote = useCallback(
    (ideaId: number, tag: string) => {
      const idea = state.ideas.find(i => i.id === ideaId);
      if (!idea || idea.tags.includes(tag)) return;
      dispatch({
        type: 'PATCH_IDEA',
        id: ideaId,
        changes: { tags: [...idea.tags, tag] },
      });
    },
    [state.ideas]
  );

  const setDue = useCallback(
    (ideaId: number, due: number | null) =>
      dispatch({ type: 'PATCH_IDEA', id: ideaId, changes: { due } }),
    []
  );

  const setProject = useCallback(
    (ideaId: number, project: string | null) =>
      dispatch({ type: 'PATCH_IDEA', id: ideaId, changes: { project } }),
    []
  );

  const removeLink = useCallback(
    (ideaId: number, idx: number) => {
      const idea = state.ideas.find(i => i.id === ideaId);
      if (!idea) return;
      dispatch({
        type: 'PATCH_IDEA',
        id: ideaId,
        changes: { links: idea.links.filter((_, i) => i !== idx) },
      });
    },
    [state.ideas]
  );

  const addSketch = useCallback(
    (ideaId: number, uri: string) => {
      const idea = state.ideas.find(i => i.id === ideaId);
      if (!idea) return;
      dispatch({
        type: 'PATCH_IDEA',
        id: ideaId,
        changes: {
          sketches: [...idea.sketches, uri],
          extras: { ...idea.extras, sketch: true },
        },
      });
    },
    [state.ideas]
  );

  const removeSketch = useCallback(
    (ideaId: number, idx: number) => {
      const idea = state.ideas.find(i => i.id === ideaId);
      if (!idea) return;
      dispatch({
        type: 'PATCH_IDEA',
        id: ideaId,
        changes: { sketches: idea.sketches.filter((_, i) => i !== idx) },
      });
    },
    [state.ideas]
  );

  const clearArchive = useCallback(() => dispatch({ type: 'CLEAR_ARCHIVE' }), []);

  const value: AppContextValue = {
    state,
    dispatch,
    dayKey,
    fmtShort,
    fmtFull,
    dueInfo,
    metaLine,
    active,
    byDay,
    levelColor,
    rgba,
    openCapture,
    closeCapture,
    saveCapture,
    expandQuick,
    openNote,
    closeNote,
    openReader,
    closeReader,
    editFromReader,
    patch,
    archiveIdea,
    deleteNote,
    archiveNote,
    openBrowse,
    clearBrowse,
    setScreen,
    setTheme,
    toggleNotifMorning,
    toggleNotifEvening,
    toggleNotifDue,
    toggleHaptics,
    toggleAnimations,
    toggleSound,
    prevMonth,
    nextMonth,
    selectDay,
    setTaskToday,
    toggleTaskDone,
    openManage,
    closeProjectMenu,
    startRename,
    commitRename,
    deleteProject,
    startNewProject,
    closeNewProject,
    commitNewProject,
    setIdeasView,
    cycleSort,
    setIdeasFilter,
    toggleCaptureTag,
    openTaskPicker,
    closeTaskPicker,
    togglePlanLoose,
    addExtra,
    toggleChk,
    removeChk,
    removeTag,
    addTagToNote,
    setDue,
    setProject,
    removeLink,
    addSketch,
    removeSketch,
    clearArchive,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
