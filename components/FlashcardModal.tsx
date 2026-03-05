'use client';

import { useEffect, useState } from 'react';
import type { Flashcard } from '@/lib/ai-help';
import {
  cardId,
  sm2,
  loadDeckState,
  saveCardState,
  type FlashcardWithId,
} from '@/lib/sm2';

const QUALITY_AGAIN = 2;   // < 3 → reset
const QUALITY_HARD = 3;
const QUALITY_GOOD = 4;
const QUALITY_EASY = 5;

export function FlashcardModal({
  open,
  cards,
  onClose,
  deckKey,
  loading = false,
  error = null,
}: {
  open: boolean;
  cards: Flashcard[];
  onClose: () => void;
  /** If set, use SM-2: only show due cards and rating buttons (Again / Hard / Good / Easy). */
  deckKey?: string;
  loading?: boolean;
  error?: string | null;
}) {
  const [sessionCards, setSessionCards] = useState<FlashcardWithId[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!open || !cards.length) return;
    const withId: FlashcardWithId[] = cards.map((c) => ({
      id: cardId(c.front, c.back),
      front: c.front,
      back: c.back,
    }));
    if (deckKey) {
      const state = loadDeckState(deckKey);
      withId.sort((a, b) => {
        const qA = state[a.id]?.lastQuality ?? 2;
        const qB = state[b.id]?.lastQuality ?? 2;
        return qA - qB; // Again (2) and Hard (3) first, then Good (4), Easy (5)
      });
    }
    setSessionCards(withId);
    setIndex(0);
    setFlipped(false);
  }, [open, cards, deckKey]);

  if (!open) return null;

  const card = sessionCards[index];
  const isLast = sessionCards.length === 0 || index >= sessionCards.length - 1;
  const useSm2 = !!deckKey;

  const next = () => {
    setFlipped(false);
    if (isLast) onClose();
    else setIndex((i) => i + 1);
  };

  const rate = (quality: number) => {
    if (!card || !deckKey) return;
    const state = loadDeckState(deckKey)[card.id] ?? null;
    const newState = sm2(quality, state);
    saveCardState(deckKey, card.id, { ...newState, lastQuality: quality });
    setFlipped(false);
    if (isLast) onClose();
    else setIndex((i) => i + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6">
        <p className="text-amber-400 font-medium mb-1">You didn&apos;t pass the quiz</p>
        <h2 className="text-xl font-semibold mb-4 text-gray-200">
          {useSm2 ? 'Spaced review — rate how well you knew it' : 'Quick review — then try again'}
        </h2>
        {sessionCards.length === 0 && (
          <>
            {loading && (
              <p className="text-gray-400">Generating flashcards…</p>
            )}
            {!loading && error && (
              <p className="text-red-400 text-sm mb-3">{error}</p>
            )}
            {!loading && !error && (
              <p className="text-gray-400">No cards to show.</p>
            )}
            {(error || (!loading && !sessionCards.length)) && (
              <button type="button" onClick={onClose} className="mt-4 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700">
                Done
              </button>
            )}
          </>
        )}
        {card && (
          <>
            <div
              className={`min-h-[120px] p-4 rounded-lg cursor-pointer ${flipped ? 'bg-emerald-900/60 border border-emerald-500/50' : 'bg-gray-700'}`}
              onClick={() => setFlipped((f) => !f)}
            >
              <p className={flipped ? 'text-emerald-100 font-bold' : 'text-gray-100'}>
                {flipped ? card.back : card.front}
              </p>
              <p className="text-sm text-gray-400 mt-2">Tap to flip</p>
            </div>

            {useSm2 ? (
              flipped ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => rate(QUALITY_AGAIN)}
                    className="py-2 px-3 rounded-lg bg-red-600/80 hover:bg-red-600 text-sm font-medium"
                  >
                    Again
                  </button>
                  <button
                    type="button"
                    onClick={() => rate(QUALITY_HARD)}
                    className="py-2 px-3 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-sm font-medium"
                  >
                    Hard
                  </button>
                  <button
                    type="button"
                    onClick={() => rate(QUALITY_GOOD)}
                    className="py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium"
                  >
                    Good
                  </button>
                  <button
                    type="button"
                    onClick={() => rate(QUALITY_EASY)}
                    className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-medium"
                  >
                    Easy
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-xs text-gray-500">Flip the card, then choose Again / Hard / Good / Easy</p>
              )
            ) : null}

            {!useSm2 && (
              <div className="mt-4 flex justify-between">
                <span className="text-sm text-gray-400">
                  {sessionCards.length > 0 ? `Card ${index + 1} of ${sessionCards.length}` : 'No cards'}
                </span>
                <button type="button" onClick={next} className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700">
                  {isLast ? 'Continue to retry quiz' : 'Next'}
                </button>
              </div>
            )}

            {useSm2 && flipped && (
              <p className="mt-2 text-xs text-gray-500">
                Card {index + 1} of {sessionCards.length}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
