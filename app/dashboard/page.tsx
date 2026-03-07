'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { useStudentData, detectPhase } from '@/lib/useStudentData';
import {
  auth,
  saveStudyGoal,
  getStudyGoals,
  updateStudyGoal,
  deleteStudyGoal,
} from '@/lib/firebase';
import { authFetch } from '@/lib/api-client';

type GlowCardProps = {
  children: React.ReactNode;
  className?: string;
  glowClassName?: string;
};

function GlowCard({
  children,
  className = '',
  glowClassName = 'from-fuchsia-500/20 via-violet-500/10 to-cyan-400/20',
}: GlowCardProps) {
  const [style, setStyle] = useState({
    transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)',
  });
  const [glow, setGlow] = useState({
    background:
      'radial-gradient(circle at 50% 50%, rgba(168,85,247,0.16), transparent 42%)',
    opacity: 0,
  });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    const rotateY = (px - 0.5) * 12;
    const rotateX = (0.5 - py) * 12;

    setStyle({
      transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.012)`,
    });

    setGlow({
      background: `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(167,139,250,0.26), rgba(59,130,246,0.12) 24%, transparent 54%)`,
      opacity: 1,
    });
  };

  const handleLeave = () => {
    setStyle({
      transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)',
    });
    setGlow((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] shadow-[0_10px_50px_rgba(15,23,42,0.22)] backdrop-blur-2xl transition duration-300 will-change-transform ${className}`}
      style={style}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{ ...glow }}
      />
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${glowClassName} opacity-0 blur-2xl transition duration-300 group-hover:opacity-100`}
      />
      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/10" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  subtext,
  barValue,
}: {
  label: string;
  value: string | number;
  icon: string;
  accent: string;
  subtext?: string;
  barValue?: number;
}) {
  return (
    <GlowCard className="p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br ${accent} text-lg shadow-[0_10px_30px_rgba(0,0,0,0.22)]`}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/45">
            {label}
          </p>
        </div>
      </div>

      <p className="text-2xl font-bold text-white sm:text-3xl">{value}</p>
      {subtext && <p className="mt-1 text-xs text-white/55">{subtext}</p>}

      {typeof barValue === 'number' && (
        <div className="mt-4 h-2 rounded-full bg-white/10">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${accent} transition-all duration-700`}
            style={{ width: `${Math.max(0, Math.min(100, barValue))}%` }}
          />
        </div>
      )}
    </GlowCard>
  );
}

function BarChart({
  data,
  maxVal,
  colorClass = 'from-cyan-400 via-blue-500 to-violet-500',
}: {
  data: { label: string; value: number }[];
  maxVal?: number;
  colorClass?: string;
}) {
  const max = maxVal || Math.max(...data.map((d) => d.value), 1);
  const BAR_MAX_PX = 150;

  return (
    <div className="flex items-end gap-3">
      {data.map((d, i) => {
        const barH = max > 0 ? Math.round((d.value / max) * BAR_MAX_PX) : 0;

        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-xs text-white/55">{d.value}</span>
            <div
              className="flex w-full items-end rounded-2xl bg-white/[0.04] p-1"
              style={{ height: `${BAR_MAX_PX + 10}px` }}
            >
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(barH, d.value > 0 ? 10 : 0)}px` }}
                transition={{ duration: 0.65, delay: i * 0.04 }}
                className={`w-full rounded-[14px] bg-gradient-to-t ${colorClass} shadow-[0_12px_30px_rgba(59,130,246,0.22)]`}
              />
            </div>
            <span className="w-full truncate text-center text-xs text-white/45">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { dashboardData, studentData, loading: dataLoading, isRealData } =
    useStudentData();

  const data = dashboardData;
  const [burnout, setBurnout] = useState<any>(data.burnout);
  const [burnoutLoading, setBurnoutLoading] = useState(false);
  const [burnoutChecked, setBurnoutChecked] = useState(false);
  const [peerCompare, setPeerCompare] = useState(
    () =>
      typeof window !== 'undefined' &&
      localStorage.getItem('peerCompare') === 'true'
  );

  useEffect(() => {
    setBurnout(data.burnout);
  }, [data.burnout]);

  const { phase } = detectPhase(studentData);

  const totalHours = data.weeklyHours.reduce(
    (sum: number, d: any) => sum + d.hours,
    0
  );

  const checkBurnout = async () => {
    setBurnoutLoading(true);
    try {
      const res = await authFetch('/api/burnout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionsThisWeek: data.weeklyHours.filter((d: any) => d.hours > 0)
            .length,
          avgDurationMinutes: studentData.avgSessionMinutes || 60,
          avgSessionHour: new Date().getHours(),
          scoresTrend: data.quizScores.slice(-5).map((q: any) => q.score),
          streakDays: data.student.streak || 0,
          totalHoursThisWeek: totalHours,
        }),
      });

      const result = await res.json();
      const b = result || {};

      setBurnout({
        riskLevel: b.riskLevel || 'low',
        riskScore: b.riskScore || 0,
        signals: b.signals || [],
        breakdown: b.breakdown || [],
        recommendation: b.recommendation || 'Your study patterns look healthy!',
        schedule: b.schedule || null,
        weeklyTip: b.weeklyTip || '',
        mentalHealthResources: b.mentalHealthResources || [],
      });
    } catch {
      setBurnout({
        riskLevel: 'moderate',
        riskScore: 45,
        signals: ['Late night studying', 'Declining scores'],
        breakdown: [],
        recommendation: 'Consider taking a break.',
        schedule: null,
        weeklyTip: 'Try sleeping before midnight tonight.',
        mentalHealthResources: [],
      });
    }
    setBurnoutLoading(false);
  };

  const checkBurnoutRef = useRef(checkBurnout);
  checkBurnoutRef.current = checkBurnout;

  useEffect(() => {
    if (isRealData && !burnoutChecked && !dataLoading) {
      setBurnoutChecked(true);
      checkBurnoutRef.current();
    }
  }, [isRealData, burnoutChecked, dataLoading]);

  const overallProgress =
    data.modules.length > 0
      ? Math.round(
          data.modules.reduce((sum, m) => sum + m.progress, 0) /
            data.modules.length
        )
      : 0;

  const overallRetention = studentData.overallRetention ?? 0;
  const retentionRates = studentData.retentionRates ?? [];
  const learningVelocity = studentData.learningVelocity ?? {
    velocity: 0,
    trend: 'steady',
  };
  const predictedScore = studentData.predictedScore ?? {
    predicted: 0,
    confidence: 0,
    trend: 'stable',
  };
  const reviewDueTopics = studentData.reviewDueTopics ?? [];

  const optimalStudyTime = studentData.optimalStudyTime ?? [];
  const currentCognitiveLoad = studentData.currentCognitiveLoad ?? {
    load: 0,
    level: 'optimal',
    trend: 'stable',
  };
  const weeklyReport = studentData.weeklyReport ?? {
    weekNumber: 1,
    totalHours: 0,
    quizzesCompleted: 0,
    avgScore: 0,
    topicsStudied: [],
    improvement: 0,
    retentionAlerts: 0,
    cognitiveLoad: 0,
    highlights: [],
    concerns: [],
    goalSuggestion: '',
  };
  const knowledgeMap = studentData.knowledgeMap ?? [];
  const peakTime =
    optimalStudyTime.find((t: any) => t.performance === 'peak') ||
    optimalStudyTime.find((t: any) => t.sessionCount > 0) ||
    null;

  const [goals, setGoals] = useState<any[]>([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({
    goalType: 'score' as 'score' | 'hours' | 'streak' | 'topic-mastery',
    targetValue: 80,
    description: '',
    topic: '',
  });

  const loadGoals = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const g = await getStudyGoals(user.uid);
      setGoals(g);
    } catch {
      //
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) loadGoals();
    });
    return () => unsub();
  }, [loadGoals]);

  const handleAddGoal = async () => {
    const user = auth.currentUser;
    if (!user || !goalForm.description.trim()) return;

    try {
      await saveStudyGoal(user.uid, goalForm);
      setShowGoalForm(false);
      setGoalForm({
        goalType: 'score',
        targetValue: 80,
        description: '',
        topic: '',
      });
      await loadGoals();
    } catch (e: any) {
      console.error('Failed to save goal:', e.message);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteStudyGoal(goalId);
      await loadGoals();
    } catch (e: any) {
      console.error('Failed to delete goal:', e.message);
    }
  };

  const handleCompleteGoal = async (goalId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateStudyGoal(user.uid, goalId, {
        status: 'completed',
        progress: 100,
      });
      await loadGoals();
    } catch (e: any) {
      console.error('Failed to complete goal:', e.message);
    }
  };

  const retentionColor =
    overallRetention >= 75
      ? 'text-emerald-300'
      : overallRetention >= 50
      ? 'text-amber-300'
      : 'text-rose-300';

  const trendArrow =
    learningVelocity.trend === 'accelerating'
      ? '↑'
      : learningVelocity.trend === 'decelerating'
      ? '↓'
      : '→';

  const trendColor =
    learningVelocity.trend === 'accelerating'
      ? 'text-emerald-300'
      : learningVelocity.trend === 'decelerating'
      ? 'text-rose-300'
      : 'text-white/55';

  const cogLoadColor =
    currentCognitiveLoad.level === 'optimal'
      ? 'text-emerald-300'
      : currentCognitiveLoad.level === 'moderate'
      ? 'text-amber-300'
      : 'text-rose-300';

  const firstName = data.student.name.split(' ')[0];
  const daysSince = studentData.daysSinceLogin || 0;

  let greeting = `Welcome back, ${firstName}! 👋`;
  let greetingSub = '';

  if (phase === 'inactive' && daysSince > 7) {
    greeting = `Welcome back, ${firstName}! It's been ${daysSince} days.`;
    greetingSub = "Here's a quick review of where you left off.";
  } else if (phase === 'accelerating') {
    greeting = `You're on fire, ${firstName}! 🔥`;
    greetingSub = 'Ready for a harder challenge?';
  } else if (phase === 'declining') {
    greeting = `Let's get back on track, ${firstName} 💪`;
    greetingSub = 'A focused session could help turn things around.';
  }

  if (dataLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05030a] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#05030a_0%,#0a0414_18%,#120722_38%,#090411_60%,#040208_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(59,130,246,0.16),transparent_24%),radial-gradient(circle_at_82%_14%,rgba(168,85,247,0.18),transparent_22%),radial-gradient(circle_at_50%_70%,rgba(34,211,238,0.12),transparent_30%)]" />
        <div className="relative z-10 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-violet-400" />
          <p className="text-lg font-medium text-white/80">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05030a] text-white">
      <div className="fixed inset-0 -z-30 bg-[linear-gradient(180deg,#05030a_0%,#0a0414_18%,#120722_38%,#090411_60%,#040208_100%)]" />
      <div className="fixed inset-0 -z-20 bg-[radial-gradient(circle_at_16%_18%,rgba(59,130,246,0.18),transparent_20%),radial-gradient(circle_at_82%_14%,rgba(168,85,247,0.20),transparent_22%),radial-gradient(circle_at_80%_40%,rgba(236,72,153,0.12),transparent_20%),radial-gradient(circle_at_25%_72%,rgba(34,211,238,0.14),transparent_22%),radial-gradient(circle_at_50%_86%,rgba(124,58,237,0.20),transparent_30%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(circle_at_center,black,transparent_88%)] opacity-25" />

      <div className="pointer-events-none absolute left-1/2 top-[10%] h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(126,63,242,0.26)_0%,_rgba(59,130,246,0.14)_28%,_rgba(0,0,0,0)_74%)] blur-[36px]" />
      <div className="pointer-events-none absolute bottom-[-160px] left-[25%] h-[320px] w-[560px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.22)_0%,_rgba(0,0,0,0)_70%)] blur-[40px]" />
      <div className="pointer-events-none absolute right-[8%] top-[18%] h-[260px] w-[260px] rounded-full bg-fuchsia-500/10 blur-[90px]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/course')}
            className="font-sans text-[1.15rem] font-semibold uppercase tracking-[0.34em] text-white md:text-[2rem]"
          >
            NTULEARN
          </motion.button>

          <div className="flex items-center gap-2 sm:gap-3">
            <motion.button
              whileHover={{ y: -2 }}
              onClick={() => router.push('/course')}
              className="hidden rounded-full border border-cyan-400/30 bg-[linear-gradient(180deg,rgba(34,211,238,0.28),rgba(37,99,235,0.22))] px-5 py-2.5 text-sm font-semibold text-cyan-100 shadow-[0_12px_30px_rgba(34,211,238,0.2)] transition hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(34,211,238,0.36),rgba(37,99,235,0.3))] sm:block"
            >
              Courses
            </motion.button>

            <motion.button
              whileHover={{ y: -2 }}
              onClick={() => router.push('/insights')}
              className="rounded-full border border-violet-400/30 bg-[linear-gradient(180deg,rgba(139,92,246,0.9),rgba(76,29,149,0.9))] px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_30px_rgba(124,58,237,0.28)] sm:text-sm"
            >
              🧠 Insights
            </motion.button>

            <motion.button
              whileHover={{ y: -2 }}
              onClick={() => router.push('/community')}
              className="hidden rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-400/15 sm:block"
            >
              💬 Community
            </motion.button>

            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-2 py-1.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(180deg,#7c3aed_0%,#2563eb_100%)] text-sm font-bold text-white">
                {data.student.name.charAt(0)}
              </div>
              <span className="hidden pr-2 text-sm text-white/75 sm:inline">
                {data.student.name}
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className={`mb-5 rounded-full border px-4 py-2 text-xs font-medium shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl ${
            isRealData
              ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
              : 'border-amber-400/20 bg-amber-400/10 text-amber-200'
          }`}
        >
          {isRealData
            ? '🟢 Live data from your Firestore learning history'
            : '🟡 Demo data — complete quizzes to see your real progress'}
        </motion.div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
          >
            <GlowCard className="p-6 sm:p-7">
              <div className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs uppercase tracking-[0.25em] text-violet-200">
                Adaptive dashboard
              </div>

              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                {greeting}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
                {greetingSub && (
                  <span className="mr-2 text-cyan-300">{greetingSub}</span>
                )}
                Learner DNA:{' '}
                <span className="font-medium text-fuchsia-200">
                  {data.student.persona}
                </span>
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <motion.button
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push('/watch')}
                  className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-cyan-100 shadow-[0_10px_30px_rgba(34,211,238,0.15)]"
                >
                  ▶ Resume Learning
                </motion.button>

                <motion.button
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push('/practice-paper')}
                  className="rounded-full border border-violet-400/30 bg-[linear-gradient(180deg,rgba(139,92,246,0.95),rgba(76,29,149,0.95))] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_34px_rgba(124,58,237,0.28)]"
                >
                  ✨ Generate Practice Paper
                </motion.button>
              </div>
            </GlowCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
          >
            <GlowCard className="h-full p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm uppercase tracking-[0.24em] text-white/45">
                  Quick Snapshot
                </p>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                  {overallProgress}% overall
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-white/60">Module Progress</span>
                    <span className="font-semibold text-white">
                      {overallProgress}%
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#3b82f6,#8b5cf6,#ec4899)] transition-all duration-700"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                      Streak
                    </p>
                    <p className="mt-2 text-3xl font-bold text-amber-300">
                      {data.student.streak}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                      Study Hours
                    </p>
                    <p className="mt-2 text-3xl font-bold text-cyan-300">
                      {totalHours.toFixed(1)}h
                    </p>
                  </div>
                </div>
              </div>
            </GlowCard>
          </motion.div>
        </div>

        {phase === 'inactive' && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <GlowCard className="p-4">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <p className="text-sm text-amber-100">
                  💤 You&apos;ve been away for a while. A quick 15-minute review
                  session can rebuild momentum.
                </p>
                <button
                  onClick={() => router.push('/watch')}
                  className="rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-600"
                >
                  Quick Review
                </button>
              </div>
            </GlowCard>
          </motion.div>
        )}

        {phase === 'accelerating' && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <GlowCard className="p-4">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <p className="text-sm text-emerald-100">
                  ⚡ Your scores are climbing fast! Try a practice paper to push
                  your limits.
                </p>
                <button
                  onClick={() => router.push('/practice-paper')}
                  className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600"
                >
                  Take Challenge
                </button>
              </div>
            </GlowCard>
          </motion.div>
        )}

        {phase === 'declining' && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <GlowCard className="p-4">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <p className="text-sm text-rose-100">
                  📉 Your recent scores have dipped. A focused session on weak
                  topics can help reverse the trend.
                </p>
                <button
                  onClick={() => router.push('/insights')}
                  className="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-600"
                >
                  View Insights
                </button>
              </div>
            </GlowCard>
          </motion.div>
        )}

        {reviewDueTopics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <GlowCard className="p-4">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <p className="text-sm text-rose-100">
                  {reviewDueTopics.length} topic
                  {reviewDueTopics.length > 1 ? 's' : ''} need
                  {reviewDueTopics.length === 1 ? 's' : ''} review — your memory
                  of{' '}
                  <span className="font-semibold text-white">
                    {reviewDueTopics[0].topic}
                  </span>{' '}
                  is at {reviewDueTopics[0].retention}%
                </p>
                <button
                  onClick={() => router.push('/watch')}
                  className="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-600"
                >
                  Review Now
                </button>
              </div>
            </GlowCard>
          </motion.div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
          <StatCard
            label="Memory Retention"
            value={`${overallRetention}%`}
            icon="🧠"
            accent="from-fuchsia-500 via-violet-500 to-purple-700"
            subtext="What you still remember"
            barValue={overallRetention}
          />
          <StatCard
            label="Learning Velocity"
            value={`${learningVelocity.velocity > 0 ? '+' : ''}${learningVelocity.velocity}`}
            icon="📈"
            accent="from-cyan-400 via-blue-500 to-violet-500"
            subtext={`pts/quiz ${trendArrow}`}
          />
          <StatCard
            label="Cognitive Load"
            value={`${currentCognitiveLoad.load}%`}
            icon="🧩"
            accent="from-emerald-400 via-cyan-400 to-blue-500"
            subtext={currentCognitiveLoad.level}
            barValue={currentCognitiveLoad.load}
          />
          <StatCard
            label="Day Streak"
            value={`${data.student.streak} days`}
            icon="🔥"
            accent="from-amber-400 via-orange-500 to-rose-500"
            subtext="Consistency matters"
          />
          <StatCard
            label="Hours This Week"
            value={`${totalHours.toFixed(1)}h`}
            icon="⏱️"
            accent="from-sky-400 via-cyan-500 to-blue-600"
            subtext="Tracked learning time"
          />
          <StatCard
            label="Practice Qs"
            value={data.practiceQuestionsAttempted}
            icon="📝"
            accent="from-pink-500 via-fuchsia-500 to-violet-600"
            subtext="Questions attempted"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}>
              <GlowCard className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">
                    📚 Module Progress
                  </h3>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/60">
                    Interactive overview
                  </span>
                </div>

                <div className="space-y-4">
                  {data.modules.map((m, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ y: -3, scale: 1.01 }}
                      className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white/90">
                          {m.name}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] ${
                            m.status === 'completed'
                              ? 'bg-emerald-400/15 text-emerald-200'
                              : 'bg-cyan-400/15 text-cyan-200'
                          }`}
                        >
                          {m.status === 'completed'
                            ? '✅ Complete'
                            : '📖 In Progress'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${m.progress}%` }}
                            transition={{ duration: 0.8, delay: i * 0.08 }}
                            className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#3b82f6,#8b5cf6,#ec4899)]"
                          />
                        </div>
                        <span className="w-12 text-right text-sm font-bold text-white">
                          {m.progress}%
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/45">
                        <span>
                          Segments: {m.segments.completed}/{m.segments.total}
                        </span>
                        <span>Quiz Avg: {m.quizAvg}%</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlowCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}>
              <GlowCard className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">
                    ⏱️ Study Hours This Week
                  </h3>
                  <span className="text-xs text-white/45">
                    Total {totalHours.toFixed(1)} hours
                  </span>
                </div>

                <BarChart
                  data={data.weeklyHours.map((d) => ({
                    label: d.day,
                    value: d.hours,
                  }))}
                  maxVal={5}
                />
              </GlowCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}>
              <GlowCard className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">
                    📈 Quiz Score Trend
                  </h3>
                  <span className="text-xs text-white/45">
                    Animated performance graph
                  </span>
                </div>

                {(() => {
                  const scores = data.quizScores.map((d: any) => d.score);
                  const labels = data.quizScores.map((d: any) => d.quiz);
                  const W = 600;
                  const H = 220;
                  const PAD_L = 35;
                  const PAD_R = 15;
                  const PAD_T = 24;
                  const PAD_B = 55;
                  const chartW = W - PAD_L - PAD_R;
                  const chartH = H - PAD_T - PAD_B;
                  const step = scores.length > 1 ? chartW / (scores.length - 1) : 0;

                  const pts = scores.map((s: number, i: number) => ({
                    x: PAD_L + i * step,
                    y: PAD_T + (1 - s / 100) * chartH,
                  }));

                  const line = pts.map((p: any) => `${p.x},${p.y}`).join(' ');
                  const area = `${pts[0]?.x ?? PAD_L},${PAD_T + chartH} ${line} ${
                    pts[pts.length - 1]?.x ?? PAD_L
                  },${PAD_T + chartH}`;

                  return (
                    <svg
                      viewBox={`0 0 ${W} ${H}`}
                      className="w-full"
                      style={{ height: '220px' }}
                    >
                      {[0, 25, 50, 75, 100].map((v) => {
                        const y = PAD_T + (1 - v / 100) * chartH;
                        return (
                          <g key={v}>
                            <line
                              x1={PAD_L}
                              x2={W - PAD_R}
                              y1={y}
                              y2={y}
                              stroke="rgba(255,255,255,0.08)"
                              strokeWidth="1"
                            />
                            <text
                              x={PAD_L - 6}
                              y={y + 4}
                              textAnchor="end"
                              fill="#94a3b8"
                              fontSize="10"
                            >
                              {v}
                            </text>
                          </g>
                        );
                      })}

                      <defs>
                        <linearGradient id="quizLineGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#22d3ee" />
                          <stop offset="50%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                        <linearGradient id="quizAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>

                      <polygon points={area} fill="url(#quizAreaGrad)" />
                      <polyline
                        points={line}
                        fill="none"
                        stroke="url(#quizLineGrad)"
                        strokeWidth="3"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />

                      {pts.map((p: any, i: number) => (
                        <g key={i}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="5"
                            fill="#8b5cf6"
                            stroke="#05030a"
                            strokeWidth="2"
                          />
                          <text
                            x={p.x}
                            y={p.y - 12}
                            textAnchor="middle"
                            fill={
                              scores[i] >= 80
                                ? '#4ade80'
                                : scores[i] >= 70
                                ? '#fbbf24'
                                : '#fb7185'
                            }
                            fontSize="11"
                            fontWeight="bold"
                          >
                            {scores[i]}%
                          </text>
                          <text
                            x={p.x}
                            y={PAD_T + chartH + 18}
                            textAnchor="middle"
                            fill="#94a3b8"
                            fontSize="10"
                          >
                            {labels[i]}
                          </text>
                        </g>
                      ))}
                    </svg>
                  );
                })()}

                {predictedScore.predicted > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-white/55">Predicted next score:</span>
                    <span
                      className={`font-bold ${
                        predictedScore.trend === 'improving'
                          ? 'text-emerald-300'
                          : predictedScore.trend === 'declining'
                          ? 'text-rose-300'
                          : 'text-cyan-300'
                      }`}
                    >
                      {predictedScore.predicted}%
                    </span>
                    <span className="text-xs text-white/40">
                      (confidence: {Math.round(predictedScore.confidence * 100)}%)
                    </span>
                  </div>
                )}
              </GlowCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}>
              <GlowCard className="p-6">
                <h3 className="mb-5 text-xl font-semibold tracking-[-0.03em] text-white">
                  📊 Weekly Progress Report
                </h3>

                <div className="mb-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-center">
                    <p className="text-2xl font-bold text-cyan-300">
                      {weeklyReport.quizzesCompleted}
                    </p>
                    <p className="text-xs text-white/45">Quizzes</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-center">
                    <p
                      className={`text-2xl font-bold ${
                        weeklyReport.avgScore >= 80
                          ? 'text-emerald-300'
                          : weeklyReport.avgScore >= 60
                          ? 'text-amber-300'
                          : 'text-rose-300'
                      }`}
                    >
                      {weeklyReport.avgScore}%
                    </p>
                    <p className="text-xs text-white/45">Avg Score</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-center">
                    <p
                      className={`text-2xl font-bold ${
                        weeklyReport.improvement >= 0
                          ? 'text-emerald-300'
                          : 'text-rose-300'
                      }`}
                    >
                      {weeklyReport.improvement >= 0 ? '+' : ''}
                      {weeklyReport.improvement}%
                    </p>
                    <p className="text-xs text-white/45">vs Last Week</p>
                  </div>
                </div>

                {weeklyReport.highlights.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
                      Highlights
                    </p>
                    {weeklyReport.highlights.map((h: string, i: number) => (
                      <p
                        key={i}
                        className="mb-1 flex items-start gap-2 text-sm text-white/72"
                      >
                        <span className="mt-0.5 text-emerald-300">✦</span>
                        {h}
                      </p>
                    ))}
                  </div>
                )}

                {weeklyReport.concerns.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-amber-300">
                      Areas to Watch
                    </p>
                    {weeklyReport.concerns.map((c: string, i: number) => (
                      <p
                        key={i}
                        className="mb-1 flex items-start gap-2 text-sm text-white/72"
                      >
                        <span className="mt-0.5 text-amber-300">⚠</span>
                        {c}
                      </p>
                    ))}
                  </div>
                )}
              </GlowCard>
            </motion.div>

            {knowledgeMap.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}>
                <GlowCard className="p-6">
                  <h3 className="mb-5 text-xl font-semibold tracking-[-0.03em] text-white">
                    🗺️ Knowledge Map
                  </h3>

                  <div className="flex flex-wrap justify-center gap-4">
                    {knowledgeMap.map((node: any) => {
                      const size = Math.max(
                        72,
                        Math.min(112, 50 + node.attempts * 15)
                      );
                      const bgClass =
                        node.status === 'mastered'
                          ? 'from-emerald-400/25 to-emerald-700/10 border-emerald-400/30 text-emerald-200'
                          : node.status === 'developing'
                          ? 'from-cyan-400/25 to-blue-700/10 border-cyan-400/30 text-cyan-200'
                          : node.status === 'struggling'
                          ? 'from-rose-400/25 to-rose-700/10 border-rose-400/30 text-rose-200'
                          : 'from-white/10 to-white/5 border-white/10 text-white/65';

                      return (
                        <motion.div
                          key={node.topic}
                          whileHover={{ scale: 1.08, y: -4 }}
                          className={`flex flex-col items-center justify-center rounded-[24px] border bg-gradient-to-br p-3 text-center shadow-[0_10px_30px_rgba(0,0,0,0.18)] ${bgClass}`}
                          style={{ width: `${size}px`, height: `${size}px` }}
                        >
                          <span className="text-xs font-semibold leading-tight">
                            {node.topic.length > 12
                              ? `${node.topic.slice(0, 10)}..`
                              : node.topic}
                          </span>
                          <span className="mt-1 text-xs opacity-85">
                            {node.mastery}%
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-white/45">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
                      Mastered
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-cyan-400/70" />
                      Developing
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-rose-400/70" />
                      Struggling
                    </span>
                  </div>
                </GlowCard>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}>
              <GlowCard className="p-6">
                <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">
                      📝 AI Practice Paper Generator
                    </h3>
                    <p className="mt-2 text-sm text-white/55">
                      Full mock exams with MCQ + short answer — generated from
                      your course topics.
                    </p>
                  </div>

                  <motion.button
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push('/practice-paper')}
                    className="rounded-full border border-violet-400/30 bg-[linear-gradient(180deg,#8b5cf6_0%,#4c1d95_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(124,58,237,0.28)]"
                  >
                    ✨ Generate Practice Paper
                  </motion.button>
                </div>
              </GlowCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}>
              <GlowCard className="p-6">
                <h3 className="mb-4 text-center text-xl font-semibold tracking-[-0.03em] text-white">
                  Study Streak
                </h3>

                <div className="text-center">
                  <motion.div
                    animate={{
                      scale: [1, 1.04, 1],
                      rotate: [0, 1.5, -1.5, 0],
                    }}
                    transition={{ duration: 2.2, repeat: Infinity }}
                    className="mb-3 inline-block"
                    style={{
                      transformOrigin: 'bottom center',
                    }}
                  >
                    <div
                      className="relative mx-auto"
                      style={{
                        transform: `scale(${Math.min(
                          2,
                          0.78 + data.student.streak * 0.1
                        )})`,
                      }}
                    >
                      <svg width="64" height="72" viewBox="0 0 64 72">
                        <defs>
                          <linearGradient id="fireGrad1" x1="0.5" y1="1" x2="0.5" y2="0">
                            <stop offset="0%" stopColor="#f59e0b" />
                            <stop offset="50%" stopColor="#ef4444" />
                            <stop offset="100%" stopColor="#fbbf24" />
                          </linearGradient>
                          <linearGradient id="fireGrad2" x1="0.5" y1="1" x2="0.5" y2="0">
                            <stop offset="0%" stopColor="#fbbf24" />
                            <stop offset="100%" stopColor="#fef08a" />
                          </linearGradient>
                        </defs>

                        <path
                          d="M32 4 C32 4, 8 28, 8 46 C8 60, 18 68, 32 68 C46 68, 56 60, 56 46 C56 28, 32 4, 32 4Z"
                          fill="url(#fireGrad1)"
                        />
                        <path
                          d="M32 28 C32 28, 18 42, 18 52 C18 60, 24 64, 32 64 C40 64, 46 60, 46 52 C46 42, 32 28, 32 28Z"
                          fill="url(#fireGrad2)"
                        />
                        <ellipse
                          cx="32"
                          cy="68"
                          rx="18"
                          ry="3"
                          fill="#f59e0b"
                          opacity="0.25"
                        />
                      </svg>
                    </div>
                  </motion.div>

                  <div className="bg-[linear-gradient(180deg,#ffd66b_0%,#f59e0b_100%)] bg-clip-text text-6xl font-extrabold text-transparent">
                    {data.student.streak}
                  </div>
                  <p className="mt-2 text-sm text-white/45">consecutive days</p>
                </div>

                <div className="mt-5 flex justify-center gap-1.5">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                    <div
                      key={i}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold ${
                        i < (data.student.streak % 7) || data.student.streak >= 7
                          ? 'bg-amber-400/20 text-amber-200 ring-1 ring-amber-300/20'
                          : 'bg-white/[0.05] text-white/35'
                      }`}
                    >
                      {d}
                    </div>
                  ))}
                </div>
              </GlowCard>
            </motion.div>
          </div>

          <div className="space-y-6">
            {retentionRates.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}>
                <GlowCard className="p-6">
                  <h3 className="mb-5 text-xl font-semibold tracking-[-0.03em] text-white">
                    🧠 Memory Retention by Topic
                  </h3>

                  <div className="space-y-3">
                    {retentionRates
                      .sort((a: any, b: any) => a.retention - b.retention)
                      .map((r: any) => {
                        const barClass =
                          r.retention >= 75
                            ? 'from-emerald-400 to-emerald-600'
                            : r.retention >= 50
                            ? 'from-amber-400 to-orange-500'
                            : 'from-rose-400 to-red-500';

                        const urgencyBadge =
                          r.urgency === 'critical'
                            ? 'bg-rose-400/15 text-rose-200'
                            : r.urgency === 'review-soon'
                            ? 'bg-amber-400/15 text-amber-200'
                            : r.urgency === 'fading'
                            ? 'bg-yellow-400/15 text-yellow-200'
                            : 'bg-emerald-400/15 text-emerald-200';

                        return (
                          <motion.div
                            key={r.topic}
                            whileHover={{ y: -2, scale: 1.01 }}
                            className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"
                          >
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <span className="flex-1 truncate text-sm text-white/85">
                                {r.topic}
                              </span>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-1 text-[10px] uppercase ${urgencyBadge}`}
                                >
                                  {r.urgency}
                                </span>
                                <span className="w-10 text-right text-sm font-bold text-white">
                                  {r.retention}%
                                </span>
                              </div>
                            </div>

                            <div className="mb-2 h-2.5 rounded-full bg-white/10">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${barClass} transition-all duration-700`}
                                style={{ width: `${r.retention}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-white/40">
                                {r.daysSinceStudied}d ago · was {r.originalScore}%
                              </span>
                              {(r.urgency === 'critical' ||
                                r.urgency === 'review-soon') && (
                                <button
                                  onClick={() => router.push('/watch')}
                                  className="text-xs font-medium text-rose-300 hover:text-rose-200"
                                >
                                  Review Now
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                </GlowCard>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}>
              <GlowCard className="p-6">
                <h3 className="mb-5 text-xl font-semibold tracking-[-0.03em] text-white">
                  🕐 Optimal Study Time
                </h3>

                {peakTime ? (
                  <div className="mb-4 rounded-[22px] border border-emerald-400/20 bg-emerald-400/10 p-4">
                    <p className="text-sm font-medium text-emerald-200">
                      Peak: {peakTime.label}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      Avg score: {peakTime.avgScore}% across {peakTime.sessionCount}{' '}
                      sessions
                    </p>
                  </div>
                ) : (
                  <p className="mb-4 text-xs text-white/50">
                    Complete more study sessions to discover your peak time.
                  </p>
                )}

                <div className="space-y-3">
                  {optimalStudyTime.map((t: any) => {
                    const perfClass =
                      t.performance === 'peak'
                        ? 'from-emerald-400 to-emerald-600'
                        : t.performance === 'good'
                        ? 'from-cyan-400 to-blue-500'
                        : t.performance === 'low'
                        ? 'from-rose-400 to-red-500'
                        : 'from-slate-500 to-slate-600';

                    const perfBadge =
                      t.performance === 'peak'
                        ? 'bg-emerald-400/15 text-emerald-200'
                        : t.performance === 'good'
                        ? 'bg-cyan-400/15 text-cyan-200'
                        : t.performance === 'low'
                        ? 'bg-rose-400/15 text-rose-200'
                        : 'bg-white/10 text-white/45';

                    return (
                      <div key={t.label} className="flex items-center gap-3">
                        <span className="w-28 truncate text-xs text-white/55">
                          {t.label}
                        </span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${perfClass}`}
                            style={{ width: `${t.avgScore || 0}%` }}
                          />
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[11px] ${perfBadge}`}>
                          {t.avgScore ? `${t.avgScore}%` : '--'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </GlowCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}>
              <GlowCard className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">
                    🎯 Study Goals
                  </h3>
                  <button
                    onClick={() => setShowGoalForm(!showGoalForm)}
                    className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-200 transition hover:bg-cyan-400/15"
                  >
                    {showGoalForm ? 'Cancel' : '+ New Goal'}
                  </button>
                </div>

                {showGoalForm && (
                  <div className="mb-4 space-y-3 rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                    <select
                      value={goalForm.goalType}
                      onChange={(e) =>
                        setGoalForm((f) => ({
                          ...f,
                          goalType: e.target.value as any,
                        }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3 text-sm text-white outline-none"
                    >
                      <option value="score">Target Score</option>
                      <option value="hours">Study Hours</option>
                      <option value="streak">Day Streak</option>
                      <option value="topic-mastery">Topic Mastery</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Goal description..."
                      value={goalForm.description}
                      onChange={(e) =>
                        setGoalForm((f) => ({ ...f, description: e.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3 text-sm text-white placeholder:text-white/30 outline-none"
                    />

                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Target"
                        value={goalForm.targetValue}
                        onChange={(e) =>
                          setGoalForm((f) => ({
                            ...f,
                            targetValue: Number(e.target.value),
                          }))
                        }
                        className="flex-1 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3 text-sm text-white outline-none"
                      />

                      {goalForm.goalType === 'topic-mastery' && (
                        <input
                          type="text"
                          placeholder="Topic"
                          value={goalForm.topic}
                          onChange={(e) =>
                            setGoalForm((f) => ({ ...f, topic: e.target.value }))
                          }
                          className="flex-1 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3 text-sm text-white placeholder:text-white/30 outline-none"
                        />
                      )}
                    </div>

                    <button
                      onClick={handleAddGoal}
                      className="w-full rounded-full border border-violet-400/30 bg-[linear-gradient(180deg,#8b5cf6_0%,#4c1d95_100%)] py-3 text-sm font-semibold text-white shadow-[0_12px_36px_rgba(124,58,237,0.22)]"
                    >
                      Save Goal
                    </button>
                  </div>
                )}

                {goals.length > 0 ? (
                  <div className="space-y-3">
                    {goals.slice(0, 5).map((g: any) => {
                      const isComplete = g.status === 'completed';

                      return (
                        <div
                          key={g.id}
                          className={`rounded-[22px] border p-4 ${
                            isComplete
                              ? 'border-emerald-400/20 bg-emerald-400/10'
                              : 'border-white/10 bg-white/[0.04]'
                          }`}
                        >
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <span
                              className={`text-sm ${
                                isComplete
                                  ? 'text-emerald-200 line-through'
                                  : 'text-white/85'
                              }`}
                            >
                              {g.description}
                            </span>

                            <div className="flex items-center gap-1">
                              {!isComplete && (
                                <button
                                  onClick={() => handleCompleteGoal(g.id)}
                                  className="text-xs text-emerald-300 hover:text-emerald-200"
                                >
                                  Done
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteGoal(g.id)}
                                className="text-xs text-white/40 hover:text-rose-300"
                              >
                                ×
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-white/45">
                            <span className="rounded-full bg-white/[0.06] px-2 py-1">
                              {g.goalType}
                            </span>
                            <span>Target: {g.targetValue}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-4 text-center text-xs text-white/50">
                    No goals set yet. Create one to track your progress!
                  </p>
                )}
              </GlowCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}>
              <GlowCard className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">
                    👥 Anonymous Peer Comparison
                  </h3>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/45">
                      {peerCompare ? 'On' : 'Off'}
                    </span>
                    <button
                      onClick={() => {
                        const next = !peerCompare;
                        setPeerCompare(next);
                        localStorage.setItem('peerCompare', String(next));
                      }}
                      className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
                        peerCompare ? 'bg-violet-500' : 'bg-white/15'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                          peerCompare ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {peerCompare &&
                  (data.peerComparison.cohortAvg == null ||
                  data.peerComparison.top10 == null ? (
                    <div className="py-4 text-center">
                      <p className="text-sm text-white/55">
                        Not enough cohort data yet.
                      </p>
                      <p className="mt-1 text-xs text-white/35">
                        Peer comparison will appear once more students complete
                        quizzes.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[
                        {
                          label: 'Your Score',
                          value: data.peerComparison.you,
                          color: 'from-cyan-400 to-blue-500',
                        },
                        {
                          label: 'Cohort Average',
                          value: data.peerComparison.cohortAvg,
                          color: 'from-slate-400 to-slate-500',
                        },
                        {
                          label: 'Top 10%',
                          value: data.peerComparison.top10,
                          color: 'from-emerald-400 to-emerald-600',
                        },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="text-white/70">{item.label}</span>
                            <span className="font-bold text-white">
                              {item.value}%
                            </span>
                          </div>
                          <div className="h-3 rounded-full bg-white/10">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                              style={{ width: `${item.value}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                <p className="mt-4 text-xs text-white/35">
                  📊 All comparisons are anonymous. No individual data is shared.
                </p>
              </GlowCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}>
              <GlowCard className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">
                    🧘 AI Burnout Analysis
                  </h3>
                  <button
                    onClick={checkBurnout}
                    disabled={burnoutLoading}
                    className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/85 transition hover:bg-white/[0.1]"
                  >
                    {burnoutLoading ? '⏳ AI analyzing...' : '🔄 Check Now'}
                  </button>
                </div>

                {burnoutLoading || !burnout ? (
                  <div className="py-6 text-center">
                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-violet-400" />
                    <p className="text-sm text-violet-200">
                      AI is analyzing your study patterns...
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      className={`mb-4 rounded-[24px] border p-4 ${
                        burnout.riskLevel === 'low'
                          ? 'border-emerald-400/20 bg-emerald-400/10'
                          : burnout.riskLevel === 'moderate'
                          ? 'border-amber-400/20 bg-amber-400/10'
                          : 'border-rose-400/20 bg-rose-400/10'
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-lg">
                          {burnout.riskLevel === 'low'
                            ? '😊'
                            : burnout.riskLevel === 'moderate'
                            ? '😐'
                            : '😰'}
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            burnout.riskLevel === 'low'
                              ? 'text-emerald-200'
                              : burnout.riskLevel === 'moderate'
                              ? 'text-amber-200'
                              : 'text-rose-200'
                          }`}
                        >
                          {(burnout.riskLevel || 'low').charAt(0).toUpperCase() +
                            (burnout.riskLevel || 'low').slice(1)}{' '}
                          Risk
                        </span>
                        <span className="ml-auto text-xs text-white/45">
                          Score: {burnout.riskScore || 0}/100
                        </span>
                      </div>

                      <div className="mb-3 h-2.5 rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${burnout.riskScore || 0}%`,
                            background:
                              burnout.riskLevel === 'low'
                                ? 'linear-gradient(90deg,#4ade80,#16a34a)'
                                : burnout.riskLevel === 'moderate'
                                ? 'linear-gradient(90deg,#fbbf24,#f59e0b)'
                                : 'linear-gradient(90deg,#fb7185,#ef4444)',
                          }}
                        />
                      </div>

                      <p className="text-sm leading-6 text-white/72">
                        {burnout.recommendation}
                      </p>
                    </div>

                    {burnout.breakdown && burnout.breakdown.length > 0 && (
                      <div className="mb-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-white/45">
                          Signal Breakdown
                        </p>
                        <div className="space-y-2">
                          {burnout.breakdown.map((b: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${
                                    b.status === 'healthy'
                                      ? 'bg-emerald-400'
                                      : b.status === 'warning'
                                      ? 'bg-amber-400'
                                      : 'bg-rose-400'
                                  }`}
                                />
                                <span className="text-xs text-white/72">
                                  {b.signal}
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-xs text-white/45">
                                  {b.value}
                                </span>
                                {b.points > 0 && (
                                  <span className="text-xs text-rose-300">
                                    +{b.points}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {burnout.schedule && (
                      <div className="mb-4 rounded-[24px] border border-violet-400/20 bg-violet-400/10 p-4">
                        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-violet-200">
                          AI-Suggested Schedule
                        </p>
                        <div className="space-y-2">
                          {[
                            { icon: '🌅', label: 'Morning', value: burnout.schedule.morning },
                            { icon: '☀️', label: 'Afternoon', value: burnout.schedule.afternoon },
                            { icon: '🌆', label: 'Evening', value: burnout.schedule.evening },
                            { icon: '🌙', label: 'Night', value: burnout.schedule.night },
                          ].map((s) => (
                            <div key={s.label} className="flex items-start gap-2">
                              <span>{s.icon}</span>
                              <p className="text-xs leading-5 text-white/72">
                                <span className="font-medium text-white/88">
                                  {s.label}:{' '}
                                </span>
                                {s.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {burnout.weeklyTip && (
                      <div className="mb-4 rounded-[22px] border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
                        💡 <span className="font-medium">Tip:</span>{' '}
                        {burnout.weeklyTip}
                      </div>
                    )}

                    {burnout.mentalHealthResources &&
                      burnout.mentalHealthResources.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-white/45">
                            NTU Support Resources
                          </p>
                          <div className="space-y-2">
                            {burnout.mentalHealthResources.map((r: any, i: number) => (
                              <div
                                key={i}
                                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                              >
                                <div>
                                  <p className="text-xs text-white/78">{r.name}</p>
                                  <p className="text-xs text-white/35">{r.type}</p>
                                </div>
                                <span className="text-xs text-cyan-300">
                                  {r.contact}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </>
                )}
              </GlowCard>
            </motion.div>

          </div>
        </div>

        <div className="mt-6 text-center text-xs text-white/30">
          Interactive glass dashboard · hover over cards for depth and glow
        </div>
      </section>
    </main>
  );
}
