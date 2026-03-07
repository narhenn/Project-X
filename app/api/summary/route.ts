import { NextRequest, NextResponse } from 'next/server';
import { generateSummary } from '@/lib/openai-ai';
import { logger } from '@/lib/logger';
import { verifyAuth } from '@/lib/api-auth';

const log = logger.child('API:Summary');

const summaryCache = new Map<string, { data: string; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour — same segment always gives same summary

/**
 * POST /api/summary
 * Generate simplified 3-sentence summary when student clicks "I'm Lost"
 * 
 * Body: { topic, segmentTitle, segmentContent, timestamp }
 * Returns: { summary: string }
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { topic, segmentTitle, segmentContent, timestamp } = await request.json();

    log.info('Summary requested', { topic, segmentTitle, timestamp });

    if (!topic || !segmentTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const cacheKey = `${topic}:${segmentTitle}`;
    const cached = summaryCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      log.info('Summary cache hit', { topic, segmentTitle });
      return NextResponse.json({ summary: cached.data });
    }

    const summary = await generateSummary(
      topic,
      segmentTitle,
      segmentContent || ''
    );

    summaryCache.set(cacheKey, { data: summary, ts: Date.now() });
    return NextResponse.json({ summary });
  } catch (error: any) {
    log.error('Summary generation failed', { error: error.message });
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
