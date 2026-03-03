import { NextRequest, NextResponse } from 'next/server';
import { generateSegmentFlashcards } from '@/lib/gemini-ai';
import { getSegmentFlashcards } from '@/data/segmentFlashcards';
import { logger } from '@/lib/logger';

const log = logger.child('API:SegmentFlashcards');

declare global {
  // eslint-disable-next-line no-var
  var __flashcardCache: Map<string, { data: any; ts: number }> | undefined;
}
const cache = globalThis.__flashcardCache ?? (globalThis.__flashcardCache = new Map());
const TTL_MS = 1000 * 60 * 60 * 24;

export async function POST(request: NextRequest) {
  let segmentIndex = 0;
  try {
    const body = await request.json();
    segmentIndex = body.segmentIndex;
    const slides = typeof body.segmentSlides === 'string' ? body.segmentSlides.trim() : '';
    const count = typeof body.count === 'number' ? body.count : 8;

    if (typeof segmentIndex !== 'number' || segmentIndex < 0) {
      return NextResponse.json({ error: 'Invalid segmentIndex' }, { status: 400 });
    }

    // Check cache first
    const key = `fc-${segmentIndex}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < TTL_MS) {
      log.info('Flashcard cache hit', { segmentIndex });
      return NextResponse.json({ flashcards: cached.data, cached: true });
    }

    // No slides — return hardcoded fallback
    if (!slides.length) {
      const fallback = getSegmentFlashcards(segmentIndex);
      return NextResponse.json({ flashcards: fallback, fallback: true });
    }

    // Generate with Gemini
    log.info('Generating AI flashcards', { segmentIndex, count });
    const flashcards = await generateSegmentFlashcards(segmentIndex, slides, count);
    cache.set(key, { data: flashcards, ts: Date.now() });
    return NextResponse.json({ flashcards, cached: false });
  } catch (error: any) {
    log.error('Flashcard generation failed', { error: error?.message });
    // Fallback to hardcoded on any failure
    const fallback = getSegmentFlashcards(segmentIndex);
    if (fallback.length > 0) {
      log.info('Serving hardcoded fallback flashcards', { segmentIndex });
      return NextResponse.json({ flashcards: fallback, fallback: true });
    }
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
