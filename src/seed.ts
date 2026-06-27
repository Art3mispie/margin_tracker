import type { Idea } from './types';

const now = Date.now();

// A single welcome note that doubles as a quick tutorial. New users start with
// just this — no pretend tags or projects cluttering their first impression.
// They can archive or delete it once they've found their footing.
const welcome: Idea = {
  id: 1,
  title: 'Welcome to Margin 👋',
  body:
    "This is your space for half-formed ideas — capture first, tidy later.\n\nA few things to try:\n\n• Tap the + button to jot something down. Swipe up on that sheet for the full editor.\n• Open a note and add a Checklist, Sketch, or Link from the bottom. Tap the × on a section to remove it.\n• On a card in your Ideas list: swipe left to archive, swipe right to flag it as important.\n• Press and hold a card to select several at once and manage them together.\n• Flag the things that matter, then plan your day from the Today tab.\n\nWhen you're ready, archive or delete this note — you've got the gist.",
  tags: [],
  project: null,
  due: null,
  archived: false,
  important: false,
  createdAt: now,
  extras: { checklist: true },
  checklist: [
    { text: 'Capture your first idea', done: false, today: true },
    { text: 'Try swiping a card left to archive', done: false },
    { text: 'Flag something as important', done: false },
  ],
  links: [],
  sketches: [],
};

export const seedIdeas: Idea[] = [welcome];
