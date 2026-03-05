/**
 * SM-2 spaced repetition algorithm.
 * Quality 0–5: 0–2 = forget (reset), 3–5 = remember (update interval & EF).
 */

export interface SM2State {
  interval: number;   // days until next review
  repetition: number; // successful reviews in a row
  easeFactor: number;
  nextReviewAt: number; // timestamp (start of day UTC or local)
  /** Last rating (2=Again, 3=Hard, 4=Good, 5=Easy) for sorting deck: hard first, easy last. */
  lastQuality?: number;
}

const INITIAL_EF = 2.5;
const MIN_EF = 1.3;

/** One-way hash for card id from content (deterministic). */
export function cardId(front: string, back: string): string {
  const s = front + '\0' + back;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

/**
 * SM-2 step: given quality (0–5) and current state, return new state.
 * Quality < 3 → reset (repetition 0, interval 1).
 * Quality >= 3 → increase repetition, compute next interval, update EF.
 */
export function sm2(quality: number, state: SM2State | null): SM2State {
  const prev = state ?? {
    interval: 0,
    repetition: 0,
    easeFactor: INITIAL_EF,
    nextReviewAt: 0,
  };

  if (quality < 3) {
    return {
      interval: 1,
      repetition: 0,
      easeFactor: prev.easeFactor,
      nextReviewAt: startOfTomorrow(),
    };
  }

  const repetition = prev.repetition + 1;
  let interval: number;
  if (repetition === 1) interval = 1;
  else if (repetition === 2) interval = 6;
  else interval = Math.round(prev.interval * prev.easeFactor);

  const efDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  const easeFactor = Math.max(MIN_EF, prev.easeFactor + efDelta);

  const nextReviewAt = addDays(interval);

  return {
    interval,
    repetition,
    easeFactor,
    nextReviewAt,
  };
}

function startOfTomorrow(): number {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function addDays(days: number): number {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const STORAGE_KEY_PREFIX = 'ntulearn_sm2_';

export function loadDeckState(deckKey: string): Record<string, SM2State> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + deckKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as Record<string, SM2State>;
  } catch {
    return {};
  }
}

export function saveCardState(deckKey: string, id: string, state: SM2State): void {
  if (typeof window === 'undefined') return;
  try {
    const all = loadDeckState(deckKey);
    all[id] = state;
    localStorage.setItem(STORAGE_KEY_PREFIX + deckKey, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export interface FlashcardWithId {
  id: string;
  front: string;
  back: string;
}

/**
 * Return cards that are due for review (nextReviewAt <= now) or never seen, in order.
 * Cards not due are excluded for this session.
 */
export function getDueCards(
  cards: Array<{ front: string; back: string }>,
  deckKey: string
): FlashcardWithId[] {
  const state = loadDeckState(deckKey);
  const now = Date.now();
  const withId: FlashcardWithId[] = cards.map((c) => ({
    id: cardId(c.front, c.back),
    front: c.front,
    back: c.back,
  }));
  return withId.filter((c) => {
    const s = state[c.id];
    if (!s) return true; // new card
    return s.nextReviewAt <= now;
  });
}
