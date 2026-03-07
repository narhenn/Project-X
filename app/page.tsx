'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';

function FadeUp({
  children,
  delay = 0,
  y = 30,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function AmbientGlow({ progress }: { progress: MotionValue<number> }) {
  const y = useTransform(progress, [0, 1], [0, 180]);
  const scale = useTransform(progress, [0, 1], [1, 1.12]);
  const opacity = useTransform(progress, [0, 0.45, 1], [0.92, 0.72, 0.4]);

  return (
    <motion.div
      style={{ y, scale, opacity }}
      className="pointer-events-none absolute left-1/2 top-[280px] h-[820px] w-[1400px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(126,63,242,0.34)_0%,_rgba(73,21,138,0.28)_24%,_rgba(28,3,51,0.18)_48%,_rgba(0,0,0,0)_74%)] blur-[26px]"
    />
  );
}

export default function HomePage() {
  const router = useRouter();
  const aboutRef = useRef<HTMLElement | null>(null);
  const featuresRef = useRef<HTMLElement | null>(null);

  const { scrollYProgress } = useScroll();

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 22,
    mass: 0.28,
  });

  const heroScale = useTransform(smoothProgress, [0, 0.18], [1, 0.98]);
  const heroOpacity = useTransform(smoothProgress, [0, 0.2], [1, 0.82]);
  const heroY = useTransform(smoothProgress, [0, 0.2], [0, 44]);

  const scrollToAbout = () => {
    aboutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const featureCards = [
    {
      title: 'Smart Identity',
      text: 'University SSO-style access and role-based journeys for students.',
    },
    {
      title: 'Learner DNA Profile',
      text: 'Personality and study-style understanding that shapes the learning path.',
    },
    {
      title: 'Micro-Learning Engine',
      text: 'Segmented content, quiz gates, and AI flashcards for better retention.',
    },
    {
      title: 'Progress Tracking',
      text: 'Mastery dashboards, streaks, and inactivity recovery support.',
    },
    {
      title: 'Wellbeing Support',
      text: 'Burnout detection, reflective prompts, and balanced learning nudges.',
    },
    {
      title: 'Community Layer',
      text: 'Study groups, peer visibility, and more engaging collaborative learning.',
    },
  ];

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#06030b] text-white">
      {/* Violet page background */}
      <div className="fixed inset-0 -z-30 bg-[linear-gradient(180deg,#06030b_0%,#0a0611_26%,#0d0816_50%,#090512_74%,#040207_100%)]" />
      <div className="fixed inset-0 -z-20 bg-[radial-gradient(circle_at_50%_8%,rgba(150,95,245,0.18),transparent_16%),radial-gradient(circle_at_16%_24%,rgba(92,34,176,0.14),transparent_24%),radial-gradient(circle_at_84%_20%,rgba(92,34,176,0.14),transparent_24%),radial-gradient(circle_at_50%_48%,rgba(124,64,228,0.14),transparent_26%),radial-gradient(circle_at_50%_78%,rgba(84,30,155,0.14),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(46,14,86,0.24),transparent_32%)]" />
      <div className="fixed inset-0 z-[-15] bg-[radial-gradient(circle_at_50%_40%,rgba(138,74,232,0.12),transparent_62%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_44%,rgba(170,110,255,0.08),transparent_14%),radial-gradient(circle_at_50%_72%,rgba(112,44,214,0.1),transparent_22%)]" />
      <AmbientGlow progress={smoothProgress} />

      {/* Top bar */}
      <header className="fixed left-1/2 top-5 z-50 w-[calc(100%-28px)] max-w-6xl -translate-x-1/2 px-2">
        <div className="flex items-center justify-between rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-5 py-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_60px_rgba(12,4,25,0.28)] backdrop-blur-2xl md:px-8">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="font-sans text-[1.15rem] font-semibold uppercase tracking-[0.34em] text-white transition hover:opacity-85 md:text-[2rem]"
          >
            NTULEARN
          </button>

          <nav className="hidden items-center gap-7 md:flex">
            <button
              onClick={scrollToFeatures}
              className="text-base text-white/80 transition hover:text-white"
            >
              Features
            </button>
            <button
              onClick={scrollToAbout}
              className="text-base text-white/80 transition hover:text-white"
            >
              About
            </button>
            <button
              onClick={() => router.push('/login')}
              className="rounded-full border border-[#4b177f]/50 bg-[linear-gradient(180deg,#4b177f_0%,#1c0333_100%)] px-7 py-3 text-base font-semibold text-white shadow-[0_12px_34px_rgba(28,3,51,0.4)] transition hover:scale-[1.03]"
            >
              Login
            </button>
          </nav>

          <button
            onClick={() => router.push('/login')}
            className="rounded-full border border-[#4b177f]/50 bg-[linear-gradient(180deg,#4b177f_0%,#1c0333_100%)] px-5 py-2.5 text-sm font-semibold text-white md:hidden"
          >
            Login
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center px-6 pb-16 pt-44 md:px-10 md:pt-48">
        <motion.div
          style={{ scale: heroScale, opacity: heroOpacity, y: heroY }}
          className="mx-auto flex w-full max-w-6xl flex-col items-center text-center"
        >
          <FadeUp delay={0.08}>
            <h1 className="max-w-5xl font-['Plus_Jakarta_Sans',sans-serif] text-[52px] font-semibold leading-[0.96] tracking-[-0.06em] text-white sm:text-[74px] md:text-[104px] lg:text-[122px]">
              <span className="block">AI-powered</span>
              <span className="block">adaptive learning</span>
            </h1>
          </FadeUp>

          <FadeUp delay={0.16}>
            <p className="mt-7 max-w-5xl text-base leading-8 text-white/68 md:text-[1.1rem] md:leading-9">
              NTUlearn is an AI-driven student learning platform that understands each learner, adapts content to their study style,
              <br className="hidden md:block" />
              and makes learning more personalized, interactive, and effective.
            </p>
          </FadeUp>

          <FadeUp delay={0.24}>
            <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
              <button
                onClick={() => router.push('/login')}
                className="group inline-flex items-center overflow-hidden rounded-full border border-[#4b177f]/45 bg-[linear-gradient(180deg,#4b177f_0%,#1c0333_100%)] text-white shadow-[0_18px_60px_rgba(28,3,51,0.3)] transition hover:scale-[1.03]"
              >
                <span className="px-8 py-4 text-lg font-semibold md:text-2xl">Login</span>
                <span className="m-1 flex h-14 w-14 items-center justify-center rounded-full bg-black text-2xl text-white transition group-hover:translate-x-0.5">
                  →
                </span>
              </button>

              <button
                onClick={scrollToAbout}
                className="rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-8 py-4 text-lg text-white shadow-[0_10px_40px_rgba(12,4,25,0.18)] backdrop-blur-xl transition hover:scale-[1.03] hover:bg-white/[0.05]"
              >
                About project
              </button>
            </div>
          </FadeUp>
        </motion.div>
      </section>

      {/* Glass row */}
      <section className="relative px-6 pb-16 md:px-10">
        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <p className="mb-8 text-center text-sm uppercase tracking-[0.24em] text-white/30">
              Built around the future of student support
            </p>
          </FadeUp>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              'Personalized AI',
              'Smart Quizzes',
              'Micro Learning',
              'Learning Insights',
              'Study Support',
              'Adaptive Journeys',
            ].map((item, index) => (
              <FadeUp key={item} delay={index * 0.05}>
                <div className="flex h-20 items-center justify-center rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.018))] text-center text-sm font-medium text-white/80 shadow-[0_14px_50px_rgba(12,4,25,0.18)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-[#6b29b3]/45 hover:bg-[linear-gradient(180deg,rgba(120,54,220,0.12),rgba(255,255,255,0.03))] hover:text-white">
                  {item}
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section ref={featuresRef} className="relative px-6 py-14 md:px-10 md:py-22">
        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <div className="mb-6 inline-flex rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-4 py-2 text-sm text-[#cfb6ff] backdrop-blur-xl">
              Features
            </div>
          </FadeUp>

          <FadeUp delay={0.08}>
            <h2 className="max-w-5xl font-['Plus_Jakarta_Sans',sans-serif] text-4xl font-semibold leading-tight tracking-[-0.045em] text-white md:text-6xl">
              One platform that adapts to <span className="text-white/44">how every student learns best.</span>
            </h2>
          </FadeUp>

          <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-12">
            <FadeUp delay={0.06} className="lg:col-span-7">
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25 }}
                className="relative h-full min-h-[470px] overflow-hidden rounded-[34px] border border-white/12 bg-[linear-gradient(135deg,rgba(88,31,170,0.28),rgba(28,3,51,0.42)_34%,rgba(8,8,10,0.92)_100%)] p-8 shadow-[0_28px_110px_rgba(28,3,51,0.24)] backdrop-blur-xl md:p-9"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(126,63,242,0.2),transparent_24%),radial-gradient(circle_at_78%_80%,rgba(180,140,255,0.06),transparent_22%)]" />
                <div className="relative">
                  <p className="text-sm uppercase tracking-[0.24em] text-white/32">Core system</p>
                  <h3 className="mt-4 font-['Plus_Jakarta_Sans',sans-serif] text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
                    Learner-aware AI
                  </h3>
                  <p className="mt-5 max-w-2xl text-lg leading-8 text-white/65">
                    The platform studies how each student learns, then adapts explanations, quiz
                    difficulty, pacing, revision support, and recommendations based on their
                    learning behaviour and profile.
                  </p>

                  <div className="mt-10 grid gap-4 sm:grid-cols-2">
                    {[
                      'Learner DNA profile',
                      'Adaptive explanations',
                      'Personalized quiz flow',
                      'Study path recommendations',
                    ].map((point) => (
                      <div
                        key={point}
                        className="rounded-[22px] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-5 py-5 text-white/82 backdrop-blur-xl"
                      >
                        {point}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </FadeUp>

            <FadeUp delay={0.12} className="lg:col-span-5">
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25 }}
                className="h-full min-h-[470px] rounded-[34px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-8 shadow-[0_20px_80px_rgba(12,4,25,0.18)] backdrop-blur-xl md:p-9"
              >
                <p className="text-sm uppercase tracking-[0.24em] text-white/32">Impact</p>
                <h3 className="mt-4 font-['Plus_Jakarta_Sans',sans-serif] text-3xl font-semibold tracking-[-0.04em]">
                  Study smarter
                </h3>
                <p className="mt-5 text-lg leading-8 text-white/65">
                  From burnout detection to micro-learning and flashcards, NTUlearn makes studying
                  feel guided instead of overwhelming.
                </p>

                <div className="mt-10 space-y-4">
                  {[
                    'AI-powered tutor support',
                    'Smart flashcards and revision',
                    'Micro-learning videos with quiz gates',
                    'Progress insights and streak tracking',
                    'Student wellbeing check-ins',
                  ].map((item, i) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, x: 22 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: false, amount: 0.35 }}
                      transition={{ duration: 0.55, delay: i * 0.08 }}
                      className="flex items-center gap-3 rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-5 py-5 text-white/80 backdrop-blur-xl"
                    >
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#cda9ff]" />
                      <span>{item}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="relative px-6 py-8 md:px-10 md:py-16">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 xl:grid-cols-3">
          {featureCards.map((card, index) => (
            <FadeUp key={card.title} delay={index * 0.06}>
              <motion.div
                whileHover={{ y: -6, scale: 1.01 }}
                transition={{ duration: 0.22 }}
                className="rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-7 shadow-[0_18px_70px_rgba(12,4,25,0.16)] backdrop-blur-xl"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(75,23,127,0.45),rgba(120,80,170,0.08))] text-base font-semibold text-white">
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl font-semibold tracking-[-0.03em] text-white">
                      {card.title}
                    </h3>
                    <p className="mt-3 text-base leading-8 text-white/58">{card.text}</p>
                  </div>
                </div>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* About */}
      <section ref={aboutRef} className="relative scroll-mt-32 px-6 py-18 md:px-10 md:py-24">
        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <div className="mb-6 inline-flex rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-4 py-2 text-sm text-[#cfb6ff] backdrop-blur-xl">
              About
            </div>
          </FadeUp>

          <FadeUp delay={0.08}>
            <h2 className="max-w-4xl font-['Plus_Jakarta_Sans',sans-serif] text-4xl font-semibold leading-tight tracking-[-0.045em] md:text-6xl">
              Deep Learning Week 2026 <span className="block text-[#d8c2ff]">Microsoft Track</span>
            </h2>
          </FadeUp>

          <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-2">
            <FadeUp delay={0.12}>
              <div className="h-full min-h-[360px] rounded-[34px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-8 shadow-[0_20px_80px_rgba(12,4,25,0.16)] backdrop-blur-xl md:p-9">
                <p className="text-lg leading-9 text-white/82">
                  NTUlearn is an AI-powered adaptive learning platform built for the DLWeek 2026
                  Microsoft Track, designed to make learning more personalized, interactive, and
                  effective for university students.
                </p>

                <p className="mt-8 text-lg leading-9 text-white/60">
                  It combines intelligent content delivery, secure login access, OpenAI-powered
                  support, and micro-learning experiences into a modern platform that adapts to how
                  each student learns best.
                </p>
              </div>
            </FadeUp>

            <FadeUp delay={0.18}>
              <div className="h-full min-h-[360px] rounded-[34px] border border-white/12 bg-[linear-gradient(135deg,rgba(88,31,170,0.2),rgba(255,255,255,0.01)_30%,rgba(255,255,255,0.008)_100%)] p-8 shadow-[0_20px_80px_rgba(12,4,25,0.16)] backdrop-blur-xl md:p-9">
                <p className="font-['Plus_Jakarta_Sans',sans-serif] text-sm uppercase tracking-[0.24em] text-white/32">
                  Overview
                </p>

                <div className="mt-8 space-y-7 text-lg leading-9 text-white/64">
                  <p>Built as part of the Deep Learning Week 2026 Microsoft Track.</p>
                  <p>
                    Focused on AI-guided study support, smart quizzes, learning insights, and
                    adaptive digital learning journeys.
                  </p>
                  <p>
                    Created to make university study more engaging, accessible, and tailored to
                    each learner.
                  </p>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-6 pb-24 pt-6 md:px-10">
        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <div className="overflow-hidden rounded-[38px] border border-white/12 bg-[linear-gradient(135deg,rgba(75,23,127,0.36),rgba(16,6,28,0.92)_36%,rgba(28,3,51,0.32)_100%)] p-8 shadow-[0_30px_120px_rgba(28,3,51,0.18)] backdrop-blur-xl md:p-12">
              <div className="max-w-3xl">
                <p className="text-sm uppercase tracking-[0.24em] text-white/32">Start now</p>
                <h3 className="mt-4 font-['Plus_Jakarta_Sans',sans-serif] text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
                  Build a better study experience with AI.
                </h3>
                <p className="mt-5 text-lg leading-8 text-white/62">
                  Login to experience adaptive learning, AI-powered support, and a more personal
                  path to mastering your modules.
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <button
                    onClick={() => router.push('/login')}
                    className="rounded-full bg-white px-8 py-4 text-base font-semibold text-black transition hover:scale-[1.03]"
                  >
                    Go to login
                  </button>
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-8 py-4 text-base text-white backdrop-blur-xl transition hover:scale-[1.03]"
                  >
                    Back to top
                  </button>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
    </main>
  );
}
