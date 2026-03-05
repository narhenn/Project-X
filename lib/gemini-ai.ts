import { logger } from './logger';

const log = logger.child('GeminiAI');

const getKeys = (): string[] => {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_QUIZ,
    process.env.GEMINI_API_KEY_FLASHCARD,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY,
  ].filter((k): k is string => Boolean(k));
  // Dedupe so we rotate across unique keys only
  return Array.from(new Set(keys));
};

// Same model as working quiz copy (gemini-2.0-flash) for quiz + summary + segment flashcards.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

async function callGemini(prompt: string, retries = 8) {
  const keys = getKeys();
  if (keys.length === 0) {
    throw new Error(
      'Gemini is not configured: set GEMINI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY in .env.local and restart the dev server.'
    );
  }
  for (let attempt = 0; attempt < retries; attempt++) {
    const apiKey = keys[attempt % keys.length];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    log.debug('Calling Gemini', { attempt: attempt + 1, keyIndex: attempt % keys.length, keyCount: keys.length, model: GEMINI_MODEL });
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1500, temperature: 0.7 } }),
    });
    if (res.status === 429) {
      log.info('Rate limited, switching key', { attempt: attempt + 1, nextKey: (attempt + 1) % keys.length });
      await new Promise(r => setTimeout(r, 2500));
      continue;
    }
    if (!res.ok) {
      const errBody = await res.text();
      try {
        const errJson = JSON.parse(errBody);
        const msg = errJson?.error?.message ?? errBody?.slice(0, 300) ?? String(res.status);
        log.warn('Gemini API error', { status: res.status, message: msg });
        throw new Error(`Gemini error: ${res.status} - ${msg}`);
      } catch (e: unknown) {
        if (e instanceof Error && e.message.startsWith('Gemini error:')) throw e;
        log.warn('Gemini API error', { status: res.status, bodyPreview: errBody?.slice(0, 300) });
        throw new Error(`Gemini error: ${res.status}`);
      }
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  throw new Error('All Gemini keys rate limited');
}

export async function generateFlashcards(topic: string, weakAreas: string[]) {
  const prompt = `Generate 5 flashcards for a university student studying ${topic}. Focus on: ${weakAreas.join(', ')}. Return ONLY valid JSON array: [{"front":"question","back":"answer","difficulty":"easy|medium|hard"}]`;
  const response = await callGemini(prompt);
  return JSON.parse(response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
}

export async function generateSummary(topic: string, segmentTitle: string, segmentContent: string) {
  const prompt = `A student is confused about "${segmentTitle}" in ${topic}. Content: ${segmentContent}. Explain this concept simply in 3-4 sentences like you're talking to a friend. Use analogies. Be encouraging.`;
  const response = await callGemini(prompt);
  return response;
}

export async function generatePracticeQuestions(moduleName: string, weakTopics: string[], format: string, count: number) {
  const prompt = `Generate ${count} ${format} practice questions for ${moduleName}. Focus on weak topics: ${weakTopics.join(', ')}. Return ONLY valid JSON array: [{"question":"...","options":["A","B","C","D"],"correctAnswer":0,"explanation":"...","topic":"...","difficulty":"easy|medium|hard"}]`;
  const response = await callGemini(prompt);
  return JSON.parse(response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
}

/** Alias for practice paper generation (same as generatePracticeQuestions). */
export async function generatePracticePaper(
  moduleName: string,
  weakTopics: string[],
  preferredFormat: string,
  questionCount: number
) {
  return generatePracticeQuestions(moduleName, weakTopics, preferredFormat, questionCount);
}

export async function detectBurnout(studyData: any) {
  const prompt = `Analyze student burnout risk. Data: ${JSON.stringify(studyData)}. Return ONLY JSON: {"riskLevel":"low|moderate|high","riskScore":0-100,"signals":["..."],"recommendation":"..."}`;
  const response = await callGemini(prompt);
  return JSON.parse(response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
}

export type PersonaProfile = {
  learningStyle?: string;
  studyHoursPerDay?: number;
  studyDaysPerWeek?: number;
  examPrepWeek?: number;
  preferredQuestionFormat?: string;
  cognitiveScore?: number;
  readinessScore?: number;
  rawAnswers?: Record<string, unknown>;
};

export async function generatePersonaFromProfile(profile: PersonaProfile): Promise<{
  personalityTraits: string[];
  learnerTypes: string[];
}> {
  const prompt = `You are a learning profile analyst. Based on this student profile, generate personality traits and learner types.

PROFILE:
${JSON.stringify(profile, null, 2)}

Return ONLY valid JSON with exactly this shape, no other text:
{"personalityTraits":["trait1","trait2",...],"learnerTypes":["type1","type2",...]}

Rules:
- personalityTraits: 3-6 short labels (e.g. "visual learner", "night owl", "goal-oriented")
- learnerTypes: 1-3 broader types (e.g. "deep learner", "strategic", "surface")`;

  const response = await callGemini(prompt);
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned) as { personalityTraits?: unknown; learnerTypes?: unknown };
  return {
    personalityTraits: Array.isArray(parsed.personalityTraits) ? parsed.personalityTraits.filter((t): t is string => typeof t === 'string') : [],
    learnerTypes: Array.isArray(parsed.learnerTypes) ? parsed.learnerTypes.filter((t): t is string => typeof t === 'string') : [],
  };
}

export async function generateSegmentQuizQuestions(segmentIndex: number, slides: string) {
  const prompt = `You are a university quiz generator. Based on the following lecture slides for Segment ${segmentIndex + 1}, generate 5 multiple-choice questions that test understanding of the key concepts.

LECTURE SLIDES:
${slides}

Return ONLY a valid JSON array with exactly this format, no other text:
[
  {
    "id": "s${segmentIndex}-q1",
    "question": "The question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0
  }
]

Rules:
- Generate exactly 5 questions
- Each question must have exactly 4 options
- correctIndex is 0-3 indicating the correct option
- Questions must reference specific concepts from the slides
- Mix difficulty: 2 easy, 2 medium, 1 hard
- IDs must follow pattern s${segmentIndex}-q1 through s${segmentIndex}-q5`;

  const response = await callGemini(prompt);
  const parsed = JSON.parse(response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
  
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Invalid quiz response from Gemini');
  }

  return parsed.map((q: any, i: number) => ({
    id: q.id ?? `s${segmentIndex}-q${i + 1}`,
    question: q.question ?? '',
    options: Array.isArray(q.options) ? q.options.slice(0, 4) : ['A', 'B', 'C', 'D'],
    correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4 ? q.correctIndex : 0,
  }));
}

const MAX_SLIDES_CHARS = 4000;

export async function generateSegmentFlashcards(
  segmentIndex: number,
  segmentSlides: string,
  count = 6
): Promise<Array<{ front: string; back: string }>> {
  const truncated =
    segmentSlides.length > MAX_SLIDES_CHARS
      ? segmentSlides.slice(0, MAX_SLIDES_CHARS) + '\n\n[... content truncated ...]'
      : segmentSlides;
  log.info('Generating segment flashcards from slides', { segmentIndex, count });
  const prompt = `You are generating study flashcards. Read the segment slides below and create flashcards based ONLY on that content.
Rules:
- Use ONLY information from the segment slides. Each flashcard: "front" (question or key term), "back" (short answer from the slides).
- Return ONLY a valid JSON array. No markdown, no prose before or after.

--- SEGMENT SLIDES ---
${truncated}
--- END SLIDES ---

Generate ${count} flashcards. Return only the JSON array.`;

  const response = await callGemini(prompt);
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array found in Gemini response');
  const parsed = JSON.parse(match[0]) as unknown[];
  if (!Array.isArray(parsed)) throw new Error('Gemini did not return an array');

  return parsed.slice(0, count).map((c: unknown) => {
    const o = c && typeof c === 'object' && 'front' in c && 'back' in c ? (c as { front?: unknown; back?: unknown }) : {};
    return {
      front: typeof o.front === 'string' ? o.front : '',
      back: typeof o.back === 'string' ? o.back : '',
    };
  });
}