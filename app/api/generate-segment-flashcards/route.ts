import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { generateSegmentFlashcards, generateFlashcardsForSegmentByTopic } from '@/lib/openai-ai';
import { logger } from '@/lib/logger';

const log = logger.child('API:GenerateSegmentFlashcards');

const CACHE_FILE = path.join(process.cwd(), '.cache', 'flashcards.json');

function readCache(): Record<string, Array<{ front: string; back: string }>> {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {};
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeCache(data: Record<string, Array<{ front: string; back: string }>>) {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
}

/**
 * POST /api/generate-segment-flashcards
 * Generate AI flashcards (from slides when available, otherwise from topic). No hardcoded fallbacks.
 * Body: { segmentIndex: number, segmentSlides?: string, topic?: string, count?: number }
 * Returns: { flashcards: { front: string, back: string }[] }
 */
export async function POST(request: NextRequest) {
  let segmentIndex = 0;
  try {
    const body = await request.json();
    segmentIndex = body.segmentIndex;
    const slides = typeof body.segmentSlides === 'string' ? body.segmentSlides.trim() : '';
    const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
    const count = typeof body.count === 'number' && body.count > 0 ? Math.min(body.count, 10) : 6;

    if (typeof segmentIndex !== 'number' || segmentIndex < 0)
      return NextResponse.json({ error: 'Invalid segmentIndex' }, { status: 400 });

    const cache = readCache();
    const cacheKey = slides.length ? `segment-${segmentIndex}` : `segment-${segmentIndex}-topic-${topic || 'unknown'}`;

    if (cache[cacheKey]) {
      log.info('Returning cached flashcards', { segmentIndex });
      return NextResponse.json({ flashcards: cache[cacheKey] });
    }

    let flashcards: Array<{ front: string; back: string }>;

    if (slides.length > 0) {
      log.info('Segment flashcards requested from slides', { segmentIndex });
      flashcards = await generateSegmentFlashcards(segmentIndex, slides, count);
    } else if (topic.length > 0) {
      log.info('Segment flashcards requested from topic (no slides)', { segmentIndex, topic });
      flashcards = await generateFlashcardsForSegmentByTopic(segmentIndex, topic, count);
    } else {
      return NextResponse.json(
        { error: 'Provide segmentSlides or topic to generate flashcards.' },
        { status: 400 }
      );
    }

    cache[cacheKey] = flashcards;
    writeCache(cache);

    return NextResponse.json({ flashcards });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate flashcards';
    log.error('Segment flashcards generation failed', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
