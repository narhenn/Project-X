'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getLearnerType } from '@/data/learnerTypes';
import { auth, savePersona } from '@/lib/firebase';
import type { LearnerPersona } from '@/lib/firebase';
import { authFetch } from '@/lib/api-client';

type QuestionOption = {
  value: string;
  label: string;
  correct?: boolean;
};

type Question = {
  id: string;
  question: string;
  options: QuestionOption[];
  key: string;
  type?: 'iq';
};

type ExplanationData = {
  whyWrong: string;
  whyCorrect: string;
  concept?: string;
  quickTip: string;
  confidenceBoost: string;
  similarMistake?: string;
};

type QuizPersona = {
  learningStyle: string;
  studyHoursPerDay: number;
  studyDaysPerWeek: number;
  examPrepWeek: number;
  preferredQuestionFormat: string;
  cognitiveScore: number;
  readinessScore: number;
  personalityTraits: string[];
  learnerTypes: string[];
};

const questions: Question[] = [
  {
    id: 'pq1',
    question: 'When preparing for an exam, I typically...',
    options: [
      { value: 'short-term-intensive', label: 'Cram intensively in the last few days' },
      { value: 'long-term-gradual', label: 'Study a little bit every day over weeks' },
    ],
    key: 'learningStyle',
  },
  {
    id: 'pq2',
    question: 'On average, how many hours do you study per day?',
    options: [
      { value: '1', label: 'Less than 1 hour' },
      { value: '2', label: '1-2 hours' },
      { value: '3', label: '2-4 hours' },
      { value: '5', label: 'More than 4 hours' },
    ],
    key: 'studyHoursPerDay',
  },
  {
    id: 'pq3',
    question: 'How many days per week do you study?',
    options: [
      { value: '2', label: '1-2 days' },
      { value: '4', label: '3-4 days' },
      { value: '6', label: '5-6 days' },
      { value: '7', label: 'Every day' },
    ],
    key: 'studyDaysPerWeek',
  },
  {
    id: 'pq4',
    question: 'How many weeks before exams do you start studying?',
    options: [
      { value: '1', label: 'The week of the exam' },
      { value: '2', label: '1-2 weeks before' },
      { value: '4', label: '3-4 weeks before' },
      { value: '6', label: 'From the start of semester' },
    ],
    key: 'examPrepWeek',
  },
  {
    id: 'pq5',
    question: 'Which question format do you prefer?',
    options: [
      { value: 'mcq', label: 'Multiple Choice (MCQ)' },
      { value: 'short-answer', label: 'Short Answer (1-3 sentences)' },
      { value: 'essay', label: 'Long-form / Essay' },
    ],
    key: 'preferredQuestionFormat',
  },
  {
    id: 'pq6',
    question: 'A farmer has 17 sheep. All but 9 die. How many sheep are left?',
    options: [
      { value: '8', label: '8 sheep' },
      { value: '9', label: '9 sheep', correct: true },
      { value: '17', label: '17 sheep' },
      { value: '0', label: '0 sheep' },
    ],
    key: 'cognitive1',
    type: 'iq',
  },
  {
    id: 'pq7',
    question: 'If you rearrange the letters "CIFAIPC", you get the name of a(n):',
    options: [
      { value: 'ocean', label: 'Ocean', correct: true },
      { value: 'city', label: 'City' },
      { value: 'animal', label: 'Animal' },
      { value: 'country', label: 'Country' },
    ],
    key: 'cognitive2',
    type: 'iq',
  },
  {
    id: 'pq8',
    question: 'What number comes next: 2, 4, 6, 8, ?',
    options: [
      { value: '9', label: '9' },
      { value: '10', label: '10', correct: true },
      { value: '12', label: '12' },
      { value: '14', label: '14' },
    ],
    key: 'cognitive3',
    type: 'iq',
  },
  {
    id: 'pq9',
    question: 'If all A are B, and all B are C, then all A are C. True or false?',
    options: [
      { value: 'true', label: 'True', correct: true },
      { value: 'false', label: 'False' },
    ],
    key: 'cognitive4',
    type: 'iq',
  },
  {
    id: 'pq10',
    question: 'An item is $50. With 20% off, the sale price is:',
    options: [
      { value: '45', label: '$45' },
      { value: '40', label: '$40', correct: true },
      { value: '30', label: '$30' },
      { value: '10', label: '$10' },
    ],
    key: 'cognitive5',
    type: 'iq',
  },
];

const COGNITIVE_QUESTIONS = [
  { key: 'cognitive1', correct: '9' },
  { key: 'cognitive2', correct: 'ocean' },
  { key: 'cognitive3', correct: '10' },
  { key: 'cognitive4', correct: 'true' },
  { key: 'cognitive5', correct: '40' },
];

const COGNITIVE_MAX = 100;
const PTS_PER_COGNITIVE = COGNITIVE_MAX / COGNITIVE_QUESTIONS.length;
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

function computeCognitiveScore(answers: Record<string, string>): number {
  let raw = 0;
  COGNITIVE_QUESTIONS.forEach(({ key, correct }) => {
    if (answers[key] === correct) raw += PTS_PER_COGNITIVE;
  });
  return Math.round(Math.min(COGNITIVE_MAX, raw));
}

function computeReadinessScore(profile: {
  studyDaysPerWeek: number;
  studyHoursPerDay: number;
  examPrepWeek: number;
  cognitiveScore: number;
}): number {
  const consistency = Math.min(100, (profile.studyDaysPerWeek / 7) * 100);
  const timeInvestment =
    profile.studyHoursPerDay >= 5
      ? 100
      : profile.studyHoursPerDay >= 3
        ? 75
        : profile.studyHoursPerDay >= 2
          ? 50
          : 25;
  const planning =
    profile.examPrepWeek >= 6
      ? 100
      : profile.examPrepWeek >= 4
        ? 70
        : profile.examPrepWeek >= 2
          ? 40
          : 20;
  const cognitive = profile.cognitiveScore;
  const readiness =
    0.35 * consistency + 0.3 * timeInvestment + 0.2 * planning + 0.15 * cognitive;
  return Math.round(Math.min(100, Math.max(0, readiness)));
}

function PageBackground() {
  return (
    <>
      <div className="fixed inset-0 -z-30 bg-[linear-gradient(180deg,#05030a_0%,#0a0414_18%,#120722_38%,#090411_60%,#040208_100%)]" />
      <div className="fixed inset-0 -z-20 bg-[radial-gradient(circle_at_50%_6%,rgba(143,84,255,0.18),transparent_16%),radial-gradient(circle_at_16%_24%,rgba(88,31,170,0.16),transparent_24%),radial-gradient(circle_at_84%_20%,rgba(88,31,170,0.16),transparent_24%),radial-gradient(circle_at_50%_48%,rgba(126,63,242,0.16),transparent_26%),radial-gradient(circle_at_50%_78%,rgba(79,25,150,0.16),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(39,10,74,0.3),transparent_32%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_44%,rgba(170,110,255,0.08),transparent_14%),radial-gradient(circle_at_50%_72%,rgba(112,44,214,0.1),transparent_22%)]" />
      <div className="pointer-events-none absolute left-1/2 top-[18%] h-[520px] w-[980px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(126,63,242,0.22)_0%,_rgba(73,21,138,0.16)_28%,_rgba(28,3,51,0.10)_48%,_rgba(0,0,0,0)_74%)] blur-[34px]" />
      <div className="pointer-events-none absolute bottom-[-180px] left-1/2 h-[480px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(94,41,180,0.20)_0%,_rgba(39,10,74,0.16)_30%,_rgba(0,0,0,0)_74%)] blur-[28px]" />
    </>
  );
}

export default function QuizPage() {
  const router = useRouter();

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [persona, setPersona] = useState<QuizPersona | null>(null);
  const [personaLoading, setPersonaLoading] = useState(false);

  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState<ExplanationData | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [wasWrong, setWasWrong] = useState(false);

  const progress = (current / questions.length) * 100;
  const q = questions[current];

  const getFallbackLearnerTypes = (p: {
    learningStyle: string;
    preferredQuestionFormat: string;
    studyDaysPerWeek: number;
    studyHoursPerDay: number;
  }): string[] => {
    const types: string[] = [];
    if (p.learningStyle === 'short-term-intensive') types.push('stress');
    else types.push('ease');
    if (p.preferredQuestionFormat === 'short-answer' || p.preferredQuestionFormat === 'essay') {
      types.push('scribble');
    }
    if (p.studyDaysPerWeek >= 6 && p.studyHoursPerDay >= 3) types.push('teach');
    if (p.preferredQuestionFormat === 'mcq') types.push('visual');
    return types.slice(0, 3);
  };

  const getFallbackTraits = (p: {
    learningStyle: string;
    studyHoursPerDay: number;
    readinessScore: number;
  }) => {
    const traits: string[] = [];
    if (p.readinessScore >= 80) traits.push('high-discipline', 'self-directed');
    if (p.readinessScore >= 60) traits.push('consistent-learner');
    if (p.learningStyle === 'short-term-intensive') traits.push('focused-learner', 'deadline-driven');
    else traits.push('self-paced');
    if (p.studyHoursPerDay >= 3) traits.push('dedicated');
    return traits.length > 0 ? traits : ['reflective-learner'];
  };

  const fetchExplanation = async (
    question: string,
    userAnswer: string,
    correctAnswer: string,
    topic: string,
    allOptions: string[],
  ) => {
    setExplanationLoading(true);
    try {
      const res = await authFetch('/api/quiz-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, userAnswer, correctAnswer, topic, allOptions }),
      });

      const data = (await res.json()) as ExplanationData;
      setExplanation(data);
    } catch {
      setExplanation({
        whyWrong: 'Could not load explanation.',
        whyCorrect: `The correct answer is "${correctAnswer}".`,
        concept: topic,
        quickTip: 'Read the question carefully and consider all options.',
        confidenceBoost: 'Keep going — every mistake is a learning opportunity!',
      });
    }
    setExplanationLoading(false);
    setShowExplanation(true);
  };

  const finishQuiz = async (newAnswers: Record<string, string>) => {
    let cognitiveScore = computeCognitiveScore(newAnswers);
    const learningStyle = newAnswers.learningStyle || 'long-term-gradual';
    const studyHoursPerDay = parseInt(newAnswers.studyHoursPerDay) || 2;
    const studyDaysPerWeek = parseInt(newAnswers.studyDaysPerWeek) || 4;
    const examPrepWeek = parseInt(newAnswers.examPrepWeek) || 2;
    const preferredQuestionFormat = newAnswers.preferredQuestionFormat || 'mcq';

    const p: QuizPersona = {
      learningStyle,
      studyHoursPerDay,
      studyDaysPerWeek,
      examPrepWeek,
      preferredQuestionFormat,
      cognitiveScore,
      readinessScore: 0,
      personalityTraits: [],
      learnerTypes: [],
    };

    p.readinessScore = computeReadinessScore({
      studyDaysPerWeek: p.studyDaysPerWeek,
      studyHoursPerDay: p.studyHoursPerDay,
      examPrepWeek: p.examPrepWeek,
      cognitiveScore: p.cognitiveScore,
    });

    if (DEMO_MODE) {
      p.cognitiveScore = Math.max(p.cognitiveScore, 70);
      p.readinessScore = Math.max(p.readinessScore, 72);
    }

    setPersonaLoading(true);

    try {
      const res = await authFetch('/api/generate-persona-traits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learningStyle: p.learningStyle,
          studyHoursPerDay: p.studyHoursPerDay,
          studyDaysPerWeek: p.studyDaysPerWeek,
          examPrepWeek: p.examPrepWeek,
          preferredQuestionFormat: p.preferredQuestionFormat,
          cognitiveScore: p.cognitiveScore,
          readinessScore: p.readinessScore,
          rawAnswers: newAnswers,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        personalityTraits?: string[];
        learnerTypes?: string[];
      };

      if (Array.isArray(data.personalityTraits) && data.personalityTraits.length > 0) {
        p.personalityTraits = data.personalityTraits;
      } else {
        p.personalityTraits = getFallbackTraits(p);
      }

      if (Array.isArray(data.learnerTypes) && data.learnerTypes.length > 0) {
        p.learnerTypes = data.learnerTypes.filter((id) => getLearnerType(id));
      } else {
        p.learnerTypes = getFallbackLearnerTypes(p);
      }
    } catch {
      p.personalityTraits = getFallbackTraits(p);
      p.learnerTypes = getFallbackLearnerTypes(p);
    } finally {
      setPersonaLoading(false);
    }

    setPersona(p);
    setShowResults(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ntulearn_quiz_completed', '1');
    }

    if (auth.currentUser) {
      const toSave: LearnerPersona = {
        learningStyle: p.learningStyle as LearnerPersona['learningStyle'],
        studyHoursPerDay: p.studyHoursPerDay,
        studyDaysPerWeek: p.studyDaysPerWeek,
        examPrepWeek: p.examPrepWeek,
        preferredQuestionFormat: p.preferredQuestionFormat as LearnerPersona['preferredQuestionFormat'],
        cognitiveScore: p.cognitiveScore,
        readinessScore: p.readinessScore,
        personalityTraits: p.personalityTraits,
        learnerTypes: p.learnerTypes,
      };

      savePersona(auth.currentUser.uid, toSave).catch((e) => {
        console.error('Failed to save persona', e);
      });
    }
  };

  const handleNext = async () => {
    if (!selected) return;

    if (showExplanation) {
      setShowExplanation(false);
      setExplanation(null);
      setWasWrong(false);

      if (current < questions.length - 1) {
        setCurrent(current + 1);
        setSelected(null);
      }
      return;
    }

    const newAnswers: Record<string, string> = { ...answers, [q.key]: selected };
    setAnswers(newAnswers);

    if (q.type === 'iq') {
      const correctOption = q.options.find((o) => o.correct);
      if (correctOption && selected !== correctOption.value) {
        setWasWrong(true);

        const userLabel = q.options.find((o) => o.value === selected)?.label || selected;
        const correctLabel = correctOption.label;

        await fetchExplanation(
          q.question,
          userLabel,
          correctLabel,
          'Cognitive Reasoning',
          q.options.map((o) => o.label),
        );
        return;
      }
    }

    setSelected(null);

    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      await finishQuiz(newAnswers);
    }
  };

  const handleSkipExplanation = () => {
    setShowExplanation(false);
    setExplanation(null);
    setWasWrong(false);

    const finalAnswers = selected ? { ...answers, [q.key]: selected } : answers;
    setSelected(null);

    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      void finishQuiz(finalAnswers);
    }
  };

  if (personaLoading) {
    return (
      <main className="relative h-screen overflow-hidden bg-[#05030a] text-white">
        <PageBackground />

        <section className="relative z-10 flex h-screen items-center justify-center px-6 pb-8 md:pb-10">
          <div className="w-full max-w-[460px] rounded-[34px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] p-8 text-center shadow-[0_20px_90px_rgba(12,4,25,0.22)] backdrop-blur-2xl md:p-10">
            <div className="mb-4 text-4xl">🧬</div>
            <h1 className="text-[34px] font-semibold tracking-[-0.04em] text-white">
              Generating your Learner DNA
            </h1>
            <p className="mt-3 text-[15px] leading-7 text-white/55">
              AI is reading your answers and inferring your learning personality...
            </p>

            <div className="mx-auto mt-7 h-2 w-full max-w-[260px] overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7b3df2] to-[#4f46e5] animate-pulse"
                style={{ width: '60%' }}
              />
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (showResults && persona) {
    return (
      <main className="relative h-screen overflow-hidden bg-[#05030a] text-white">
        <PageBackground />

        <section className="relative z-10 flex h-screen items-center justify-center px-6 pb-8 md:px-10 md:pb-10">
          <div className="w-full max-w-[1140px]">
            <div className="mb-4 text-center">
              <div className="mb-2 text-3xl">🧬</div>
              <h1 className="text-[34px] font-semibold tracking-[-0.04em] text-white md:text-[42px]">
                Your Learner DNA
              </h1>
              <p className="mt-2 text-[14px] text-white/50">
                Your personalized learning profile has been created
              </p>
            </div>

            <div className="rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] shadow-[0_20px_90px_rgba(12,4,25,0.22)] backdrop-blur-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-3 p-5 md:p-6">
                  <div className="flex items-center justify-between rounded-[16px] border border-violet-500/20 bg-violet-500/10 px-4 py-3">
                    <span className="text-[14px] text-white/70">Learning Style</span>
                    <span className="text-[14px] font-semibold text-violet-300">
                      {persona.learningStyle === 'short-term-intensive'
                        ? '⚡ Short-term Intensive'
                        : '📅 Long-term Gradual'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-[16px] border border-blue-500/20 bg-blue-500/10 px-4 py-3">
                    <span className="text-[14px] text-white/70">Study Hours/Day</span>
                    <span className="text-[14px] font-semibold text-blue-300">
                      {persona.studyHoursPerDay} hours
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-[16px] border border-green-500/20 bg-green-500/10 px-4 py-3">
                    <span className="text-[14px] text-white/70">Study Days/Week</span>
                    <span className="text-[14px] font-semibold text-green-300">
                      {persona.studyDaysPerWeek} days
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-[16px] border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                    <span className="text-[14px] text-white/70">Exam Prep Starts</span>
                    <span className="text-[14px] font-semibold text-amber-300">
                      {persona.examPrepWeek} weeks before
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-[16px] border border-rose-500/20 bg-rose-500/10 px-4 py-3">
                    <span className="text-[14px] text-white/70">Preferred Format</span>
                    <span className="text-[14px] font-semibold text-rose-300">
                      {persona.preferredQuestionFormat.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-[16px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                    <span className="text-[14px] text-white/70">Learning Readiness</span>
                    <span className="text-[14px] font-semibold text-emerald-300">
                      {persona.readinessScore ?? 0}/100
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-[16px] border border-teal-500/20 bg-teal-500/10 px-4 py-3">
                    <span className="text-[14px] text-white/70">Reasoning (cognitive)</span>
                    <span className="text-[14px] font-semibold text-teal-300">
                      {persona.cognitiveScore}/100
                    </span>
                  </div>
                </div>

                <div className="border-t border-white/10 p-5 md:p-6 lg:border-l lg:border-t-0">
                  {(persona.learnerTypes?.length ?? 0) > 0 && (
                    <div className="mb-5">
                      <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-white/38">
                        Learner Types
                      </p>
                      <div className="space-y-2.5">
                        {(persona.learnerTypes || []).map((id) => {
                          const t = getLearnerType(id);
                          if (!t) return null;

                          return (
                            <div
                              key={t.id}
                              className="flex items-center gap-3 rounded-[16px] border border-indigo-500/20 bg-indigo-500/10 p-3"
                            >
                              <span className="text-base">{t.icon}</span>
                              <div>
                                <p className="text-[14px] font-semibold text-white">{t.label}</p>
                                <p className="text-[12px] leading-5 text-white/55">{t.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-white/38">
                      Personality Traits
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {persona.personalityTraits.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-white/70"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[18px] border border-blue-500/20 bg-blue-500/10 p-4">
              <p className="text-[14px] leading-6 text-blue-200">
                {persona.learningStyle === 'short-term-intensive'
                  ? '⚡ Your content will be delivered in focused, intensive bursts with rapid checkpoints.'
                  : '📅 Your content will be spaced over time with daily nudges and gradual progression.'}
              </p>
            </div>

            <div className="mt-4 flex justify-center">
              <button
                onClick={() => router.push('/course')}
                className="group inline-flex w-full items-center justify-between rounded-full border border-[#4b177f]/45 bg-[linear-gradient(180deg,#4b177f_0%,#1c0333_100%)] px-2 py-2 text-white transition hover:scale-[1.01] md:max-w-[360px]"
              >
                <span className="pl-6 text-[18px] font-semibold">Start Learning</span>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-lg text-white">
                  →
                </span>
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const quizScrollable = showExplanation || explanationLoading;

  return (
    <main className="relative h-screen overflow-hidden bg-[#05030a] text-white">
      <PageBackground />

      <section
        className={`relative z-10 flex justify-center px-6 md:px-10 ${
          quizScrollable
            ? 'h-screen items-start overflow-y-auto overflow-x-hidden pb-10 pt-16 md:pt-20'
            : 'h-screen items-center pb-8'
        }`}
      >
        <div className="w-full max-w-[760px]">
          <div className="mb-5 text-center">
            <h1 className="text-[34px] font-semibold tracking-[-0.04em] text-white md:text-[40px]">
              NTU<span className="text-[#d8c2ff]">learn</span>
            </h1>
            <p className="mt-2 text-[12px] uppercase tracking-[0.24em] text-white/45">
              Learner DNA Assessment
            </p>
          </div>

          <div className="mb-5">
            <div className="mb-2 flex justify-between text-[12px] text-white/50">
              <span>
                Question {current + 1} of {questions.length}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7b3df2] to-[#4f46e5] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] p-6 shadow-[0_20px_90px_rgba(12,4,25,0.22)] backdrop-blur-2xl md:p-7">
            {q.type === 'iq' && (
              <div className="mb-4 inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-[11px] font-semibold text-amber-300">
                🧠 Cognitive Challenge
              </div>
            )}

            <h2 className="mb-5 text-[24px] font-semibold leading-[1.15] tracking-[-0.03em] text-white md:text-[30px]">
              {q.question}
            </h2>

            <div className="space-y-3">
              {q.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    if (!showExplanation) setSelected(opt.value);
                  }}
                  className={`w-full rounded-[18px] border px-5 py-3.5 text-left transition-all ${
                    showExplanation && wasWrong
                      ? opt.correct
                        ? 'border-green-500/40 bg-green-500/10'
                        : selected === opt.value
                          ? 'border-red-500/40 bg-red-500/10'
                          : 'border-white/10 bg-white/[0.03] opacity-50'
                      : selected === opt.value
                        ? 'border-[#7b3df2]/40 bg-[#7b3df2]/10'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span
                      className={`text-[15px] ${
                        showExplanation && wasWrong
                          ? opt.correct
                            ? 'font-semibold text-green-300'
                            : selected === opt.value
                              ? 'text-red-300 line-through'
                              : 'text-white/35'
                          : selected === opt.value
                            ? 'font-medium text-[#d8c2ff]'
                            : 'text-white/72'
                      }`}
                    >
                      {opt.label}
                    </span>

                    {showExplanation && wasWrong && opt.correct && (
                      <span className="text-[11px] font-bold text-green-400">✓ Correct</span>
                    )}

                    {showExplanation && wasWrong && selected === opt.value && !opt.correct && (
                      <span className="text-[11px] font-bold text-red-400">✗ Your answer</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {showExplanation && explanation && (
              <div className="mt-5 rounded-[20px] border border-violet-500/20 bg-violet-500/10 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-base">🤖</span>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-300">
                    Guardian AI Explains
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="mb-1 text-[11px] font-bold text-red-400">
                      ❌ Why your answer was wrong:
                    </p>
                    <p className="text-[14px] leading-6 text-white/72">{explanation.whyWrong}</p>
                  </div>

                  <div>
                    <p className="mb-1 text-[11px] font-bold text-green-400">
                      ✅ Why the correct answer is right:
                    </p>
                    <p className="text-[14px] leading-6 text-white/72">{explanation.whyCorrect}</p>
                  </div>

                  <div className="rounded-[16px] border border-blue-500/20 bg-blue-500/10 p-3.5">
                    <p className="text-[13px] leading-6 text-blue-200">
                      💡 <span className="font-semibold">Quick Tip:</span> {explanation.quickTip}
                    </p>
                  </div>

                  {explanation.similarMistake && (
                    <div className="rounded-[16px] border border-amber-500/20 bg-amber-500/10 p-3.5">
                      <p className="text-[13px] leading-6 text-amber-200">
                        ⚠️ <span className="font-semibold">Watch out:</span> {explanation.similarMistake}
                      </p>
                    </div>
                  )}

                  <p className="text-[12px] italic text-green-400">{explanation.confidenceBoost}</p>
                </div>
              </div>
            )}

            {explanationLoading && (
              <div className="mt-5 rounded-[20px] border border-violet-500/20 bg-violet-500/10 p-4">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 animate-spin text-violet-400" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <p className="text-[14px] text-violet-300">
                    Guardian AI is analyzing your answer...
                  </p>
                </div>
              </div>
            )}

            {showExplanation ? (
              <button
                onClick={handleSkipExplanation}
                className="group mt-5 inline-flex w-full items-center justify-between rounded-full border border-[#4b177f]/45 bg-[linear-gradient(180deg,#f4d468_0%,#e9cc59_100%)] px-2 py-2 text-black transition hover:scale-[1.01]"
              >
                <span className="pl-6 text-[17px] font-semibold">
                  {current === questions.length - 1 ? 'View My Learner DNA' : 'Got it! Next Question'}
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-lg text-white">
                  →
                </span>
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!selected}
                className={`mt-5 inline-flex w-full items-center justify-center rounded-full px-6 py-4 text-[17px] font-semibold transition ${
                  selected
                    ? 'border border-[#4b177f]/45 bg-[linear-gradient(180deg,#4b177f_0%,#1c0333_100%)] text-white hover:scale-[1.01]'
                    : 'cursor-not-allowed bg-white/5 text-white/30'
                }`}
              >
                {current === questions.length - 1 ? 'View My Learner DNA →' : 'Next Question →'}
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
} 
