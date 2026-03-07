'use client';

import { useRouter } from 'next/navigation';

export default function AboutPage() {
  const router = useRouter();

  return (
    <main className="relative h-screen overflow-hidden bg-black text-white">
      {/* Gradient background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-yellow-400/10 blur-[160px]" />
        <div className="absolute bottom-[-200px] left-1/3 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[140px]" />
      </div>

      {/* Soft vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.65))]" />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col px-8 py-8 md:px-12">
        {/* Header */}
        <header className="flex items-center justify-between">
          <button
            onClick={() => router.push('/course')}
            className="text-xl font-semibold tracking-[0.38em] uppercase text-white md:text-2xl"
          >
            NTUlearn
          </button>

          <button
            onClick={() => router.push('/')}
            className="rounded-full bg-white px-6 py-3 text-base font-semibold text-black transition hover:scale-[1.02]"
          >
            Back
          </button>
        </header>

        {/* Main Section */}
        <section className="flex flex-1 items-start justify-center pt-24">
          <div className="w-full max-w-[980px]">
            {/* Title + Login */}
            <div className="mb-8 grid grid-cols-[1fr_auto] items-center gap-6">
              <div>
                <h1 className="text-[46px] font-semibold leading-[1.02] tracking-[-0.04em] text-white md:text-[54px]">
                  Deep Learning Week 2026
                  <span className="mt-1 block text-[#f4d468]">
                    Microsoft Track
                  </span>
                </h1>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => router.push('/login')}
                  className="group inline-flex items-center overflow-hidden rounded-full bg-[#f4d468] text-black transition hover:scale-[1.02]"
                >
                  <span className="px-6 py-3 text-lg font-semibold">Login</span>
                  <span className="m-1 flex h-11 w-11 items-center justify-center rounded-full bg-black text-lg text-white">
                    →
                  </span>
                </button>
              </div>
            </div>

            {/* Main Box */}
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] backdrop-blur-sm">
              <div className="grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="p-6 md:p-7">
                  <div className="space-y-4 text-[15px] leading-7 text-white/78">
                    <p>
                      NTUlearn is an AI-powered adaptive learning platform built for
                      the DLWeek 2026 Microsoft Track, designed to make learning more
                      personalized, interactive, and effective for university students.
                    </p>

                    <p>
                      It combines intelligent content delivery, NTU SSO-style access,
                      OpenAI-powered support, and micro-learning experiences into a
                      modern platform that adapts to how each student learns best.
                    </p>
                  </div>
                </div>

                <div className="border-t border-white/10 p-6 md:p-7 lg:border-l lg:border-t-0">
                  <p className="mb-4 text-sm uppercase tracking-[0.22em] text-white/40">
                    Overview
                  </p>

                  <div className="space-y-4 text-[15px] leading-7 text-white/70">
                    <p>
                      Built as part of the Deep Learning Week 2026 Microsoft Track.
                    </p>

                    <p>
                      Focused on AI-guided study support, smart quizzes, learning
                      insights, and adaptive digital learning journeys.
                    </p>

                    <p>
                      Created to make university study more engaging, accessible,
                      and tailored to each learner.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-20 md:h-24" />
          </div>
        </section>
      </div>
    </main>
  );
}
