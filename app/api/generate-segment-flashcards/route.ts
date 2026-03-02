import { NextRequest, NextResponse } from 'next/server';
import { generateSegmentFlashcards } from '@/lib/gemini-ai';
import { logger } from '@/lib/logger';

const log = logger.child('API:GenerateSegmentFlashcards');

/**
 * POST /api/generate-segment-flashcards
 * Generate AI flashcards from the segment's slides document (review after quiz fail).
 * Body: { segmentIndex: number, segmentSlides: string, count?: number }
 * Returns: { flashcards: { front: string, back: string }[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { segmentIndex, segmentSlides, count = 6 } = body;

    if (typeof segmentIndex !== 'number' || segmentIndex < 0) {
      return NextResponse.json({ error: 'Invalid segmentIndex' }, { status: 400 });
    }
    if (!segmentSlides || typeof segmentSlides !== 'string' || segmentSlides.trim().length === 0) {
      return NextResponse.json({ error: 'Missing or empty segmentSlides' }, { status: 400 });
    }

    log.info('Segment flashcards requested from slides', { segmentIndex });

    const flashcards = await generateSegmentFlashcards(
      segmentIndex,
      segmentSlides.trim(),
      typeof count === 'number' && count > 0 ? Math.min(count, 10) : 6
    );

    return NextResponse.json({ flashcards });
  } catch (error: any) {
    const message = error?.message ?? 'Failed to generate flashcards';
    log.error('Segment flashcards generation failed', { error: message });
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
