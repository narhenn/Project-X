import { logger } from './logger';

const log = logger.child('GeminiAI');

function getGeminiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    ''
  ).trim();
}

const RETRY_DELAYS_MS = [2000]; // single retry for 429 → fail fast (~2–3s instead of 15–20s)
const MAX_RETRIES = 1;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(prompt: string, maxTokens = 1000): Promise<string> {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    throw new Error('Gemini is not configured. Add GEMINI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY to .env.local.');
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS_MS[attempt - 1] ?? 10000;
      log.info('Retrying Gemini after rate limit', { attempt, delayMs: delay });
      await sleep(delay);
    }

    log.debug('Calling Gemini API', { maxTokens, attempt: attempt + 1 });
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
      }),
      signal: AbortSignal.timeout(60000), // 60s server timeout
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      log.info('Gemini response received', { length: content.length });
      return content;
    }

    const e = await response.text();
    log.error('Gemini API error', { status: response.status, error: e });

    if (response.status === 429 && attempt < MAX_RETRIES) {
      lastError = new Error('Rate limit exceeded. Wait a moment and try again.');
      continue;
    }

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a minute and try again.');
    }
    throw new Error(`Gemini error: ${response.status}`);
  }

  throw lastError ?? new Error('Gemini request failed');
}

const MAX_SLIDES_CHARS = 4000;

/** Generate 5 quiz questions from segment slides text (Gemini). */
export async function generateSegmentQuizQuestions(
  segmentIndex: number,
  segmentSlides: string
): Promise<Array<{ id: string; question: string; options: string[]; correctIndex: number }>> {
  const truncated =
    segmentSlides.length > MAX_SLIDES_CHARS
      ? segmentSlides.slice(0, MAX_SLIDES_CHARS) + '\n\n[... content truncated ...]'
      : segmentSlides;
  log.info('Generating segment quiz from slides (Gemini)', { segmentIndex, contentLength: truncated.length });

  const prompt = `You are an expert educational assessor. Read the segment slides below and generate quiz questions based ONLY on that content.

Rules:
- Use ONLY information from the segment slides. Generate exactly 5 multiple-choice questions, each with exactly 4 options.
- Return ONLY a valid JSON array. No markdown, no code fences. Each object: "id" (string, e.g. "s0-q1"), "question" (string), "options" (array of 4 strings), "correctIndex" (number 0-3 for the correct option). Use ids s${segmentIndex}-q1, s${segmentIndex}-q2, ... s${segmentIndex}-q5.

--- SEGMENT SLIDES ---
${truncated}
--- END SLIDES ---

Return only the JSON array of 5 questions.`;

  const raw = await callGemini(prompt, 2500);
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    const questions = JSON.parse(cleaned);
    if (!Array.isArray(questions) || questions.length === 0) throw new Error('Invalid format');
    return questions.slice(0, 5).map((q: any, i: number) => ({
      id: q.id || `s${segmentIndex}-q${i + 1}`,
      question: q.question || '',
      options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
      correctIndex:
        typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4 ? q.correctIndex : 0,
    }));
  } catch (e) {
    log.error('Failed to parse Gemini quiz response', { preview: cleaned.substring(0, 300) });
    throw e;
  }
}

/** Generate flashcards from segment slides text (Gemini). */
export async function generateSegmentFlashcards(
  segmentIndex: number,
  segmentSlides: string,
  count = 6
): Promise<Array<{ front: string; back: string }>> {
  const truncated =
    segmentSlides.length > MAX_SLIDES_CHARS
      ? segmentSlides.slice(0, MAX_SLIDES_CHARS) + '\n\n[... content truncated ...]'
      : segmentSlides;
  log.info('Generating segment flashcards from slides (Gemini)', { segmentIndex, count });

  const prompt = `You are an expert tutor. Read the segment slides below and create ${count} review flashcards based ONLY on that content. Return ONLY a valid JSON array. No markdown, no code fences. Each object: "front" (question or term), "back" (short answer).

--- SEGMENT SLIDES ---
${truncated}
--- END SLIDES ---

Return only the JSON array.`;

  const raw = await callGemini(prompt, 1500);
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    const cards = JSON.parse(cleaned);
    if (!Array.isArray(cards)) throw new Error('Invalid format');
    return cards.slice(0, count).map((c: any) => ({
      front: c.front || '',
      back: c.back || '',
    }));
  } catch (e) {
    log.error('Failed to parse Gemini flashcards response', { preview: cleaned.substring(0, 300) });
    throw e;
  }
}

const LEARNER_TYPE_IDS = ['visual', 'kinesthetic', 'auditory', 'stress', 'ease', 'scribble', 'trust', 'teach', 'copy'];

/** Learner DNA: generate personality traits + learner type(s) from quiz-derived profile (Gemini). */
export async function generatePersonaFromProfile(profile: {
  learningStyle: string;
  studyHoursPerDay: number;
  studyDaysPerWeek: number;
  examPrepWeek: number;
  preferredQuestionFormat: string;
  cognitiveScore: number;
  readinessScore?: number;
  rawAnswers?: Record<string, string>;
}): Promise<{ personalityTraits: string[]; learnerTypes: string[] }> {
  log.info('Generating persona from profile', { learningStyle: profile.learningStyle, readinessScore: profile.readinessScore });
  const summary = [
    `Learning readiness score (0–100, primary signal): ${profile.readinessScore ?? 'not provided'}`,
    `Learning style: ${profile.learningStyle}`,
    `Study hours per day: ${profile.studyHoursPerDay}`,
    `Study days per week: ${profile.studyDaysPerWeek}`,
    `Starts exam prep: ${profile.examPrepWeek} weeks before`,
    `Preferred question format: ${profile.preferredQuestionFormat}`,
    `Reasoning/cognitive score (0–100, light signal only): ${profile.cognitiveScore}`,
  ].join('. ');
  const prompt = `You are an expert educational psychologist. Interpret this learner profile and return a JSON object with two keys.

IMPORTANT: The primary signals are study consistency, time commitment, and planning horizon. The cognitive/reasoning score is a LIGHT signal only—do NOT infer intelligence or ability from it alone. A "good" profile means strong learning readiness (consistent, committed, plans ahead), not a high cognitive number.

1) "personalityTraits": array of 3–5 short hyphenated labels (e.g. consistent-learner, deadline-driven, self-directed). Be specific to their habits and readiness.

2) "learnerTypes": array of 1–3 IDs from this EXACT list: visual, kinesthetic, auditory, stress, ease, scribble, trust, teach, copy. Use these mappings so results vary by profile (do not default only to "ease"):
- short-term / cram / last-minute → stress
- long-term / calm / self-paced / gradual → ease
- preferred format short-answer or essay → scribble (they learn by writing)
- preferred format MCQ / likes structure → visual or trust (learn from materials or authority)
- study hours high + many days → kinesthetic (learn by doing) or teach (learn by teaching others)
- auditory = prefers lectures/discussions (if profile suggests listening)

Return ONLY valid JSON: {"personalityTraits":["...","..."],"learnerTypes":["id1","id2"]}. No markdown, no other text.

Learner profile:
${summary}`;
  const raw = await callGemini(prompt, 700);
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    const obj = JSON.parse(cleaned);
    const personalityTraits = Array.isArray(obj.personalityTraits)
      ? obj.personalityTraits.filter((t: unknown): t is string => typeof t === 'string').slice(0, 6)
      : [];
    const learnerTypes = Array.isArray(obj.learnerTypes)
      ? obj.learnerTypes.filter((id: unknown) => typeof id === 'string' && LEARNER_TYPE_IDS.includes(id))
      : [];
    return { personalityTraits, learnerTypes };
  } catch (e) {
    log.error('Failed to parse persona response', { preview: cleaned.substring(0, 200) });
    return { personalityTraits: [], learnerTypes: [] };
  }
}

/** @deprecated Use generatePersonaFromProfile. Kept for backward compatibility. */
export async function generatePersonalityTraits(profile: Parameters<typeof generatePersonaFromProfile>[0]): Promise<string[]> {
  const { personalityTraits } = await generatePersonaFromProfile(profile);
  return personalityTraits;
}

export async function generateFlashcards(topic, missedQuestions, learningStyle) {
  log.info('Generating flashcards', { topic, missedCount: missedQuestions.length });
  const prompt = `You are an expert tutor. A student studying "${topic}" missed: ${missedQuestions.join(', ')}. Style: ${learningStyle}. Generate 5 flashcards. Return ONLY valid JSON array, no backticks: [{"front":"...","back":"...","difficulty":"easy|medium|hard"}]`;
  const r = await callGemini(prompt, 1500);
  try { return JSON.parse(r.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim()); } catch { return [{ front: topic, back: 'Review this topic.', difficulty: 'medium' }]; }
}
export async function generateVideoSummary(topic, segmentTitle, segmentContent, timestamp) {
  log.info('Generating summary', { topic, segmentTitle });
  return await callGemini(`You are a patient tutor. Student watching "${topic}", segment "${segmentTitle}" clicked "I'm Lost" at ${timestamp}. Content: ${segmentContent}. Give a 3-sentence simplified summary. Start with "Don't worry! Here's the key idea:"`, 300);
}
export async function generatePracticePaper(moduleName, weakTopics, preferredFormat, questionCount = 10) {
  log.info('Generating practice paper', { moduleName, weakTopics });
  const prompt = `Create ${questionCount} ${preferredFormat} questions for "${moduleName}" targeting: ${weakTopics.join(', ')}. Return ONLY valid JSON array: [{"id":"q1","question":"...","type":"${preferredFormat}"${preferredFormat==='mcq'?',"options":["A. ...","B. ...","C. ...","D. ..."]':''},"correctAnswer":"...","explanation":"...","difficulty":"easy|medium|hard","topic":"..."}]`;
  const r = await callGemini(prompt, 3000);
  try { return JSON.parse(r.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim()); } catch { return []; }
}
export async function analyzeBurnoutRisk(studyData) {
  log.info('Analyzing burnout', { hours: studyData.totalHoursThisWeek });
  const signals = []; let riskScore = 0;
  if (studyData.totalHoursThisWeek > 35) { signals.push('Studying 35+ hours/week'); riskScore += 30; }
  if (studyData.avgSessionHour >= 23 || studyData.avgSessionHour <= 4) { signals.push('Late night studying'); riskScore += 20; }
  if (studyData.avgDurationMinutes > 180) { signals.push('Sessions exceed 3 hours'); riskScore += 15; }
  if (studyData.scoresTrend?.length >= 3) { const r = studyData.scoresTrend.slice(-3); if (r[2]<r[0]&&r[1]<r[0]) { signals.push('Declining scores'); riskScore += 25; } }
  if (studyData.streakDays > 14) { signals.push('No rest in 2+ weeks'); riskScore += 10; }
  const riskLevel = riskScore >= 50 ? 'high' : riskScore >= 25 ? 'moderate' : 'low';
  let recommendation = 'Your study patterns look healthy!';
  if (riskLevel !== 'low') { recommendation = await callGemini(`Student burnout signals: ${signals.join(', ')}. ${studyData.totalHoursThisWeek}hrs/week. Give 2-3 caring sentences of advice.`, 200); }
  return { riskLevel, riskScore: Math.min(100, riskScore), signals, recommendation };
}
