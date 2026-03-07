import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { logger } from '@/lib/logger';

import { retrieveRelevantChunks } from '@/lib/rag';
import { verifyAuth } from '@/lib/api-auth';

const log = logger.child('API:AITutor');

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY_TUTOR || process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OpenAI is not configured');
  return new OpenAI({ apiKey: key, maxRetries: 2, timeout: 30_000 });
}

function analyzePerformance(history: number[]): { prediction: number | null; status: string } {
  if (!history || history.length < 2) {
    return { prediction: null, status: 'Not enough data' };
  }
  const n = history.length;
  const xMean = (n - 1) / 2;
  const yMean = history.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (history[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  const prediction = Math.round((slope * n + intercept) * 10) / 10;
  let status = 'Stable';
  if (slope < 0) status = 'Burnout Risk';
  else if (slope > 2) status = 'Accelerated Growth';
  return { prediction, status };
}

async function getStudentData(studentId = 'student_1'): Promise<Record<string, any> | null> {
  try {
    const { adminDb } = await import('@/lib/firebase-admin');
    if (adminDb) {
      const doc = await (adminDb as any).collection('students').doc(studentId).get();
      if (doc.exists) {
        log.info('Student data from Firestore');
        return doc.data();
      }
    }
  } catch (err: any) {
    log.debug('Firestore unavailable', { reason: err.message });
  }
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const raw = await fs.readFile(path.join(process.cwd(), 'data', 'student_data.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed?.students?.[studentId]) {
      log.info('Student data from local JSON');
      return parsed.students[studentId];
    }
  } catch (err: any) {
    log.error('Local JSON failed too', { error: err.message });
  }
  return null;
}

async function callTutorAI(prompt: string): Promise<string | null> {
  try {
    const openai = getOpenAI();
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.7,
    });
    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch (err: unknown) {
    log.error('OpenAI exception', { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

export async function POST(request: Request) {
  const authResult = await verifyAuth(request);
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { question, image, learningContext, conversationHistory } = await request.json() as {
      question?: string;
      image?: string;
      learningContext?: any;
      conversationHistory?: Array<{ role: string; content: string }>;
    };

    const hasImage = typeof image === 'string' && image.startsWith('data:image');
    if (!question && !hasImage) {
      return NextResponse.json({ answer: 'Please ask a question or attach an image!' }, { status: 400 });
    }
    const questionText = question || 'The student shared an image. Extract any text, doubt, or question from the image and answer it.';

    log.info('Tutor query', { question: questionText.slice(0, 80), hasImage, hasLearningContext: !!learningContext });

    // ── Step 1: Get student data ──
    const studentData = await getStudentData(authResult.uid);

    // ── Step 2: Extract fields ──
    const topics: Record<string, any> = studentData?.moduleData || {};
    const history: Record<string, number> = studentData?.history || {};
    const dna: Record<string, any> = studentData?.dna || {};
    const confidence: Record<string, number> = {};

    for (const t of Object.keys(topics)) {
      confidence[t] = topics[t].confidence;
    }

    const historyScores = Object.values(history);
    const { prediction: pred, status } = analyzePerformance(historyScores);

    // ── Step 2.5: Trim data to reduce token usage ──
    const topTopics = Object.entries(topics)
      .sort(([, a]: any, [, b]: any) => a.confidence - b.confidence)
      .slice(0, 6);

    const recentQuizDetails = Object.entries(studentData?.quizDetails || {})
      .slice(-2);

    // ── Step 2.6: RAG — only for concept questions ──
    const isPerformanceQuestion = /\b(strong|weak|topic|score|quiz|mistake|confidence|retention|how am i|progress|what should|study today|focus|predict|plan)\b/i.test(questionText);
    const relevantChunks = isPerformanceQuestion
      ? []
      : await retrieveRelevantChunks(questionText, 3);

    const courseContext = relevantChunks.length > 0
      ? `\nRelevant course material:\n${relevantChunks.map((c: any, i: number) =>
          `[${i + 1}] (${c.similarity}% match | ${c.topic})\n${c.content}`
        ).join('\n\n')}`
      : '';

    // ── Step 2.7: Conversation history context ──
    const conversationContext = conversationHistory && conversationHistory.length > 1
      ? `\nPrevious conversation:\n${conversationHistory.slice(-6, -1).map((m: any) =>
          `${m.role === 'user' ? 'Student' : 'Guardian'}: ${m.content}`
        ).join('\n')}`
      : '';

    // ── Step 2.8: Build live learning analytics context ──
    const lc = learningContext || {};
    const analyticsContext = learningContext ? `
LIVE LEARNING ANALYTICS (real-time from Firebase):
- Overall Memory Retention: ${lc.overallRetention ?? 'N/A'}%
- Cognitive Load: ${lc.cognitiveLoad?.load ?? 'N/A'}% (${lc.cognitiveLoad?.level ?? 'unknown'}, trend: ${lc.cognitiveLoad?.trend ?? 'stable'})
- Learning Velocity: ${lc.learningVelocity?.velocity ?? 0} pts/quiz (${lc.learningVelocity?.trend ?? 'steady'})
- Predicted Next Score: ${lc.predictedScore?.predicted ?? 'N/A'}% (confidence: ${Math.round((lc.predictedScore?.confidence ?? 0) * 100)}%)
- Weak Topics: ${(lc.weakTopics || []).join(', ') || 'None identified'}
- Strong Topics: ${(lc.strongTopics || []).join(', ') || 'None identified'}
- Memory Retention by Topic:
${(lc.retentionRates || []).map((r: any) => `  * ${r.topic}: ${r.retention}% retention (${r.urgency}, ${r.daysSinceStudied}d ago)`).join('\n') || '  No data'}
- Optimal Study Times:
${(lc.optimalStudyTime || []).map((t: any) => `  * ${t.label}: ${t.avgScore}% avg (${t.performance})`).join('\n') || '  No data'}
- This Week: ${lc.weeklyReport?.quizzesCompleted ?? 0} quizzes, avg ${lc.weeklyReport?.avgScore ?? 0}%, improvement ${lc.weeklyReport?.improvement >= 0 ? '+' : ''}${lc.weeklyReport?.improvement ?? 0}%
- Knowledge Map: ${(lc.knowledgeMap || []).map((n: any) => `${n.topic}:${n.mastery}%(${n.status})`).join(', ') || 'No data'}
- AI Goal Suggestion: ${lc.weeklyReport?.goalSuggestion || 'N/A'}
` : '';

    // ── Step 3: Build prompt ──
    const prompt = `
You are Guardian, this student's dedicated personal tutor for SC3010 Computer Security at NTU.
You have complete knowledge of their learning history, mistakes, cognitive state, and actual lecture material.
You are NOT a dashboard or a report generator. You are a tutor. You respond to what the student actually asked — nothing more.

STUDENT PROFILE:
Learning style: ${dna.learningStyle || 'unknown'} | Cognitive score: ${dna.cognitiveScore || 'unknown'}/10
Personality: ${(dna.personalityTraits || []).join(', ')}
Peak focus: ${studentData?.studyPatterns?.peakFocusTime || 'unknown'} | Best day: ${studentData?.studyPatterns?.bestDayOfWeek || 'unknown'} | Worst day: ${studentData?.studyPatterns?.worstDayOfWeek || 'unknown'}
Preferred session: ${studentData?.studyPatterns?.preferredSessionLengthMinutes || 45} minutes
${analyticsContext}

TOPIC MASTERY (weakest first):
${topTopics.map(([k, v]: any) =>
  `${v.name}: ${Math.round((v.confidence || 0) * 100)}% confidence | ${Math.round((v.memoryRetentionRate || 0) * 100)}% retention | ${v.mistakesMade || 0} mistakes | ${v.timeTakenMinutes || 0}min via ${v.studyMethod} | completed: ${v.completed}`
).join('\n')}

TOPICS NEEDING URGENT ATTENTION:
${JSON.stringify(studentData?.predictions?.topicsToFocusNext || [])}
Hardest topics: ${JSON.stringify(studentData?.topicInsights?.hardestTopics || [])}

QUIZ MISTAKE HISTORY (recent):
${recentQuizDetails.map(([quiz, d]: any) =>
  `${quiz} — ${d.topic} (${d.score}/${d.totalQuestions}):
${d.wrongQuestions?.map((q: any) =>
  `  ✗ "${q.question}" → answered "${q.studentAnswer}" | correct: "${q.correctAnswer}" | type: ${q.mistakeType}`
).join('\n')}`
).join('\n\n')}

SCORE HISTORY: ${JSON.stringify(historyScores)} → trend: ${status}
${courseContext}
${conversationContext}

STUDENT QUESTION: ${questionText}${hasImage ? ' (The student attached an image — read it and address any doubt or question shown.)' : ''}

═══════════════════════════════════════════════
HOW TO RESPOND — READ THIS CAREFULLY
═══════════════════════════════════════════════

GOLDEN RULE: Answer ONLY what was asked. Do not volunteer extra information.

CLASSIFY THE QUESTION FIRST, THEN RESPOND:

TYPE 1 — Concept question (what is X, explain Y, how does Z work)
→ Explain the concept clearly using lecture material as your source
→ One concrete example from the notes
→ Only mention student data if they got this exact concept wrong in a quiz — make it feel natural
→ End with one specific question that tests deeper understanding
→ Length: 2-3 paragraphs max

TYPE 2 — Personal performance question ("why do I keep failing", "what are my weak areas", "how am I doing", "my strong topics", "my weak topics", "what quizzes did I complete")
→ Use their data — specific scores, confidence percentages, mistake counts
→ Answer ONLY what was asked — strong topics = talk about strong topics only, do NOT pivot to weak areas or study recommendations
→ Be precise with numbers: "your confidence in Threat Modeling is 70%, retention 75%"
→ One specific observation about the pattern you notice
→ End with one question that goes deeper on what they asked — not a pivot to something else
→ Length: 2 paragraphs max

TYPE 3 — Study guidance (what should I study today, I have 1 hour, what to focus on)
→ ONE recommendation only — not three topics
→ Factor in cognitive load, peak focus time, retention urgency, SM-2 due cards if available
→ Explain WHY this specific thing today
→ End with one immediate action
→ Length: 2 paragraphs max

TYPE 4 — Emotional/casual (I'm stressed, I give up, I don't understand anything)
→ One warm acknowledgement sentence first
→ Pick the single easiest win available right now
→ Keep it short and human — no data dump
→ Length: 2 paragraphs max

TYPE 5 — Follow-up (explain again, what about X, why)
→ Build on the conversation — don't re-establish context
→ Be concise
→ Length: 1-2 paragraphs max

STRICT RULES — NEVER BREAK THESE:
- Flowing prose only — no headers, no bullets, no numbered lists, no markdown
- Maximum 3 paragraphs for any response
- Never say: "great question", "certainly!", "of course!", "keep up the great work", "I hope this helps", "feel free to ask"
- Never start your response with "I"
- End with EITHER a follow-up question OR one immediate action — never both, never neither
- Use actual numbers naturally in sentences — not in lists
- Never mention topics irrelevant to the question asked
- If cognitive load is high — keep response shorter and more focused

WHEN TO USE STUDENT DATA:
- Type 1 questions: only mention data if they specifically got this concept wrong in a quiz
- Type 2-3 questions: use data extensively and specifically
- Type 4-5 questions: use data sparingly, only when it helps

WHEN TO USE LECTURE MATERIAL:
- Always use it for Type 1 questions — weave it naturally, don't quote it robotically
- Type 2 performance questions — only if the question mentions a specific concept
- If the question is purely about scores, topics, progress, or personal data — ignore lecture material completely
- Never force lecture content into Type 2-5 questions where it's not relevant

PERSONALITY:
- You know this student well — warm, direct, and precise
- You notice patterns they don't see: "you went from 6 to 9 between quiz 3 and 4 — that's the worked examples paying off"
- You challenge gently when they're wrong
- You never pad responses with filler — every sentence earns its place
`;

    // ── Step 4: Call OpenAI (vision when image attached) ──
    let response: string | null = null;
    if (hasImage && image) {
      try {
        const openai = getOpenAI();
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        const completion = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: image } },
              ],
            },
          ],
          max_tokens: 2048,
          temperature: 0.7,
        });
        response = completion.choices[0]?.message?.content?.trim() ?? null;
      } catch (err: unknown) {
        log.error('OpenAI vision exception', { error: err instanceof Error ? err.message : String(err) });
      }
    }

    if (!response) {
      response = await callTutorAI(prompt);
    }

    if (response) {
      return NextResponse.json({
        answer: response,
        ragSources: relevantChunks.map((c: any) => ({
          topic: c.topic,
          similarity: c.similarity,
          source: c.source,
          preview: c.content?.slice(0, 80) + '...',
        })),
      });
    }

    return NextResponse.json({ error: 'AI is currently unavailable. Please try again in a moment.' }, { status: 503 });

  } catch (error: any) {
    log.error('Tutor crashed', { error: error.message });
    return NextResponse.json({ answer: `Tutor is resting 😴 Error: ${error.message}` }, { status: 200 });
  }
}