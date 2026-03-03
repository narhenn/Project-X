import { logger } from './logger';

const log = logger.child('GeminiAI');

const getKeys = () => [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(Boolean);

async function callGemini(prompt: string, retries = 4) {
  const keys = getKeys();
  for (let attempt = 0; attempt < retries; attempt++) {
    const apiKey = keys[attempt % keys.length];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    log.debug('Calling Gemini', { attempt: attempt + 1, keyIndex: attempt % keys.length });
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1500, temperature: 0.7 } }),
    });
    if (res.status === 429) {
      log.info('Rate limited, switching key', { attempt: attempt + 1 });
      await new Promise(r => setTimeout(r, 1500));
      continue;
    }
    if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
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

export async function detectBurnout(studyData: any) {
  const prompt = `Analyze student burnout risk. Data: ${JSON.stringify(studyData)}. Return ONLY JSON: {"riskLevel":"low|moderate|high","riskScore":0-100,"signals":["..."],"recommendation":"..."}`;
  const response = await callGemini(prompt);
  return JSON.parse(response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
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

export async function generateSegmentFlashcards(segmentIndex: number, slides: string) {
  const prompt = `You are a university tutor. Based on the following lecture slides for Segment ${segmentIndex + 1}, generate 8 flashcards that help students memorize and understand the key concepts.

LECTURE SLIDES:
${slides}

Return ONLY a valid JSON array with exactly this format, no other text:
[
  { "front": "A concise question or prompt", "back": "A clear, complete answer" }
]

Rules:
- Generate exactly 8 flashcards
- Questions should test core concepts, definitions, and relationships
- Answers should be concise but complete (1-2 sentences max)
- Cover the most important topics from the slides
- Mix difficulty: some definitional, some conceptual, some application-level
- Reference specific terms and examples from the slides`;

  const response = await callGemini(prompt);
  const parsed = JSON.parse(response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Invalid flashcard response from Gemini');
  }

  return parsed.map((fc: any) => ({
    front: fc.front ?? '',
    back: fc.back ?? '',
  }));
}