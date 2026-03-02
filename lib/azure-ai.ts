/**
 * Azure OpenAI Service
 * ====================
 * All AI-powered features for StudySphere.
 * This runs SERVER-SIDE only (API routes) to protect the API key.
 * 
 * Features:
 *   - Flashcard generation (on quiz fail)
 *   - "I'm Lost" video summary
 *   - Practice paper generation
 *   - Burnout detection analysis
 */

import { logger } from './logger';

const log = logger.child('AzureAI');

interface AzureConfig {
  apiKey: string;
  endpoint: string;
  deployment: string;
  apiVersion: string;
}

function getConfig(): AzureConfig {
  return {
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-06-01',
  };
}

function ensureAzureConfigured(): void {
  const config = getConfig();
  if (!config.apiKey?.trim()) {
    throw new Error('Azure OpenAI is not configured. Add AZURE_OPENAI_API_KEY to .env.local.');
  }
  if (!config.endpoint?.trim()) {
    throw new Error('Azure OpenAI is not configured. Add AZURE_OPENAI_ENDPOINT to .env.local.');
  }
}

async function callAzureOpenAI(systemPrompt: string, userPrompt: string, maxTokens: number = 1000): Promise<string> {
  ensureAzureConfigured();
  const config = getConfig();
  const url = `${config.endpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=${config.apiVersion}`;

  log.debug('Calling Azure OpenAI', { deployment: config.deployment, maxTokens });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error('Azure OpenAI API error', { status: response.status, error: errorText });
      throw new Error(`Azure OpenAI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    log.info('Azure OpenAI response received', { tokens: data.usage?.total_tokens });
    return content;
  } catch (error: any) {
    log.error('Azure OpenAI call failed', { error: error.message });
    throw error;
  }
}

// ============================================================
// FEATURE 1: AI Flashcard Generator
// ============================================================

export interface Flashcard {
  front: string;  // Question or concept
  back: string;   // Answer or explanation
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * Generate personalized flashcards based on missed quiz questions.
 * Called when a student fails a segment quiz twice.
 */
export async function generateFlashcards(
  topic: string,
  missedQuestions: string[],
  learningStyle: string
): Promise<Flashcard[]> {
  log.info('Generating flashcards', { topic, missedCount: missedQuestions.length, learningStyle });

  const systemPrompt = `You are an expert educational AI tutor for university students.
Generate flashcards that help students understand concepts they got wrong.
Adapt your explanations to the student's learning style: ${learningStyle}.
Return ONLY valid JSON array, no markdown, no backticks.`;

  const userPrompt = `Topic: ${topic}

The student missed these questions:
${missedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Generate 5 flashcards to help them understand these concepts.
Each flashcard should have:
- "front": A clear question or concept prompt
- "back": A concise, easy-to-understand explanation
- "difficulty": "easy", "medium", or "hard"

Return as JSON array: [{"front":"...","back":"...","difficulty":"..."}]`;

  const response = await callAzureOpenAI(systemPrompt, userPrompt, 1500);
  
  try {
    const flashcards: Flashcard[] = JSON.parse(response);
    log.info('Flashcards generated successfully', { count: flashcards.length });
    return flashcards;
  } catch {
    log.error('Failed to parse flashcard response', { response: response.substring(0, 200) });
    // Return fallback flashcards
    return [{
      front: `What is the key concept in: ${topic}?`,
      back: 'Please review the lecture material for this segment.',
      difficulty: 'medium',
    }];
  }
}

// ============================================================
// FEATURE 1b: Segment Quiz Questions (AI-generated per segment)
// ============================================================

export interface QuizQuestionForAI {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

/**
 * Generate 5 multiple-choice quiz questions by reading the segment's slides document.
 * Questions are generated ONLY from the provided segmentSlides text; the AI must not use external knowledge.
 */
const MAX_SLIDES_CHARS = 12000;

export async function generateSegmentQuizQuestions(
  segmentIndex: number,
  segmentSlides: string
): Promise<QuizQuestionForAI[]> {
  const truncated = segmentSlides.length > MAX_SLIDES_CHARS
    ? segmentSlides.slice(0, MAX_SLIDES_CHARS) + '\n\n[... content truncated for length ...]'
    : segmentSlides;
  if (segmentSlides.length > MAX_SLIDES_CHARS) {
    log.warn('Segment slides truncated for API', { segmentIndex, original: segmentSlides.length, max: MAX_SLIDES_CHARS });
  }
  log.info('Generating segment quiz questions from slides', { segmentIndex, contentLength: truncated.length });

  const systemPrompt = `You are an expert educational assessor. Your task is to read the provided segment slides document and generate quiz questions based ONLY on that content.

Rules:
- Use ONLY information explicitly stated or clearly implied in the segment slides. Do not add facts from general knowledge.
- Generate exactly 5 multiple-choice questions. Each question must have exactly 4 options.
- Return ONLY a valid JSON array. No markdown, no code fences, no explanation.
- Each object: "id" (string, e.g. "s0-q1"), "question" (string), "options" (array of 4 strings), "correctIndex" (number 0-3 for the correct option).`;

  const userPrompt = `Below is the slides document for segment ${segmentIndex + 1}. Read it carefully and generate 5 multiple-choice questions that test understanding of this material. Base every question and the correct answer only on this text. Use ids s${segmentIndex}-q1, s${segmentIndex}-q2, ... s${segmentIndex}-q5.

--- SEGMENT SLIDES ---
${truncated}
--- END SLIDES ---

Return only the JSON array of 5 questions.`;

  const response = await callAzureOpenAI(systemPrompt, userPrompt, 2500);
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    const questions: QuizQuestionForAI[] = JSON.parse(cleaned);
    if (!Array.isArray(questions) || questions.length === 0) throw new Error('Invalid format');
    return questions.slice(0, 5).map((q, i) => ({
      id: q.id || `s${segmentIndex}-q${i + 1}`,
      question: q.question || '',
      options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
      correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4 ? q.correctIndex : 0,
    }));
  } catch (e) {
    log.error('Failed to parse segment quiz response', { response: cleaned.substring(0, 300) });
    throw e;
  }
}

// ============================================================
// FEATURE 1c: Segment Flashcards (AI-generated for segment review)
// ============================================================

export type SegmentFlashcard = { front: string; back: string };

/**
 * Generate flashcards for a video segment from the segment slides document (for review after failing quiz).
 */
export async function generateSegmentFlashcards(
  segmentIndex: number,
  segmentSlides: string,
  count: number = 6
): Promise<SegmentFlashcard[]> {
  log.info('Generating segment flashcards from slides', { segmentIndex, contentLength: segmentSlides.length, count });

  const systemPrompt = `You are an expert tutor. Read the provided segment slides and create concise review flashcards based ONLY on that content.
Return ONLY a valid JSON array. No markdown, no code fences. Each object: "front" (question or key term), "back" (short answer from the slides).`;

  const userPrompt = `Below is the slides document for segment ${segmentIndex + 1}. Generate ${count} flashcards to help the student review. Base every front/back only on this text. Return only the JSON array.

--- SEGMENT SLIDES ---
${segmentSlides}
--- END SLIDES ---`;

  const response = await callAzureOpenAI(systemPrompt, userPrompt, 1500);
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    const cards: SegmentFlashcard[] = JSON.parse(cleaned);
    if (!Array.isArray(cards)) throw new Error('Invalid format');
    return cards.slice(0, count).map((c) => ({
      front: c.front || '',
      back: c.back || '',
    }));
  } catch (e) {
    log.error('Failed to parse segment flashcards response', { response: cleaned.substring(0, 300) });
    throw e;
  }
}

// ============================================================
// FEATURE 2: "I'm Lost" Video Summary
// ============================================================

/**
 * Generate a simplified 3-sentence summary of a video segment.
 * Called when student clicks "I'm Lost" button during video.
 */
export async function generateVideoSummary(
  topic: string,
  segmentTitle: string,
  segmentContent: string,
  timestamp: string
): Promise<string> {
  log.info('Generating video summary', { topic, segmentTitle, timestamp });

  const systemPrompt = `You are a patient, encouraging tutor who simplifies complex concepts.
Your goal is to explain the concept in exactly 3 sentences that a confused student can understand.
Use simple language, analogies, and real-world examples. Be warm and supportive.`;

  const userPrompt = `The student is watching a lecture on "${topic}" and clicked "I'm Lost" during the segment: "${segmentTitle}"

The segment covers: ${segmentContent}

The student is at timestamp: ${timestamp}

Please provide a simplified 3-sentence summary that helps them understand this concept. Start with "Don't worry! Here's the key idea:"`;

  return await callAzureOpenAI(systemPrompt, userPrompt, 300);
}

// ============================================================
// FEATURE 3: Practice Paper Generator
// ============================================================

export interface PracticeQuestion {
  id: string;
  question: string;
  type: 'mcq' | 'short-answer' | 'essay';
  options?: string[];      // For MCQ
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

/**
 * Generate a personalized practice paper at end of module.
 * Targets weak areas in student's preferred question format.
 */
export async function generatePracticePaper(
  moduleName: string,
  weakTopics: string[],
  preferredFormat: 'mcq' | 'short-answer' | 'essay',
  questionCount: number = 10
): Promise<PracticeQuestion[]> {
  log.info('Generating practice paper', { moduleName, weakTopics, preferredFormat, questionCount });

  const formatInstructions = {
    'mcq': 'multiple choice questions with 4 options (A, B, C, D). Include "options" array and "correctAnswer" as the letter.',
    'short-answer': 'short answer questions requiring 1-3 sentence responses. Set "correctAnswer" to a model answer.',
    'essay': 'essay-style questions requiring detailed analysis. Set "correctAnswer" to key points that should be covered.',
  };

  const systemPrompt = `You are an expert exam paper creator for university courses.
Create challenging but fair questions that test deep understanding, not just memorization.
Focus questions on the student's weak areas to help them improve.
Return ONLY valid JSON array, no markdown, no backticks.`;

  const userPrompt = `Module: ${moduleName}
Student's weak topics: ${weakTopics.join(', ')}
Question format: ${formatInstructions[preferredFormat]}
Number of questions: ${questionCount}

Generate a practice paper. Each question must have:
- "id": unique string (q1, q2, etc)
- "question": the question text
- "type": "${preferredFormat}"
${preferredFormat === 'mcq' ? '- "options": ["A. ...", "B. ...", "C. ...", "D. ..."]' : ''}
- "correctAnswer": the correct answer
- "explanation": why this is the correct answer (2-3 sentences)
- "difficulty": "easy", "medium", or "hard"
- "topic": which weak topic this targets

Return as JSON array.`;

  const response = await callAzureOpenAI(systemPrompt, userPrompt, 3000);

  try {
    const questions: PracticeQuestion[] = JSON.parse(response);
    log.info('Practice paper generated', { questionCount: questions.length });
    return questions;
  } catch {
    log.error('Failed to parse practice paper response');
    return [];
  }
}

// ============================================================
// FEATURE 4: Burnout Detection
// ============================================================

export interface BurnoutAnalysis {
  riskLevel: 'low' | 'moderate' | 'high';
  riskScore: number;           // 0-100
  signals: string[];           // Detected warning signs
  recommendation: string;      // What the student should do
  suggestedSchedule?: string;  // Alternative study plan
}

/**
 * Analyze study patterns to detect burnout risk.
 * Looks at: session frequency, duration, time-of-day, score trends.
 */
export async function analyzeBurnoutRisk(
  studyData: {
    sessionsThisWeek: number;
    avgDurationMinutes: number;
    avgSessionHour: number;     // 0-23, average time of day
    scoresTrend: number[];      // Last 5 quiz scores
    streakDays: number;
    totalHoursThisWeek: number;
  }
): Promise<BurnoutAnalysis> {
  log.info('Analyzing burnout risk', { 
    sessions: studyData.sessionsThisWeek, 
    hours: studyData.totalHoursThisWeek 
  });

  // Rule-based quick check first (fast, no API call needed)
  const signals: string[] = [];
  let riskScore = 0;

  if (studyData.totalHoursThisWeek > 35) {
    signals.push('Studying more than 35 hours this week');
    riskScore += 30;
  }
  if (studyData.avgSessionHour >= 23 || studyData.avgSessionHour <= 4) {
    signals.push('Frequently studying late at night');
    riskScore += 20;
  }
  if (studyData.avgDurationMinutes > 180) {
    signals.push('Average session exceeds 3 hours without breaks');
    riskScore += 15;
  }
  if (studyData.scoresTrend.length >= 3) {
    const recent = studyData.scoresTrend.slice(-3);
    if (recent[2] < recent[0] && recent[1] < recent[0]) {
      signals.push('Quiz scores declining despite continued studying');
      riskScore += 25;
    }
  }
  if (studyData.streakDays > 14) {
    signals.push('No rest days in over 2 weeks');
    riskScore += 10;
  }

  const riskLevel = riskScore >= 50 ? 'high' : riskScore >= 25 ? 'moderate' : 'low';

  // If moderate/high risk, get AI recommendation
  let recommendation = 'Your study patterns look healthy. Keep it up!';
  let suggestedSchedule: string | undefined;

  if (riskLevel !== 'low') {
    const systemPrompt = `You are a caring student wellbeing advisor. 
Be warm, non-judgmental, and practical. Keep responses brief (2-3 sentences).`;

    const userPrompt = `A student shows these burnout signals:
${signals.map(s => `- ${s}`).join('\n')}

Their study data:
- ${studyData.totalHoursThisWeek} hours this week
- Average session: ${studyData.avgDurationMinutes} minutes
- Usually studies at ${studyData.avgSessionHour}:00
- Recent scores: ${studyData.scoresTrend.join(', ')}

Give a brief, caring recommendation. Then suggest a healthier daily schedule in 1-2 sentences.`;

    const aiResponse = await callAzureOpenAI(systemPrompt, userPrompt, 300);
    recommendation = aiResponse;
  }

  const analysis: BurnoutAnalysis = {
    riskLevel,
    riskScore: Math.min(100, riskScore),
    signals,
    recommendation,
    suggestedSchedule,
  };

  log.info('Burnout analysis complete', { riskLevel, riskScore });
  return analysis;
}
