'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser, ensureUserDoc } from '@/lib/firebase';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await loginUser(email, password);

      if (result.success && result.user) {
        await ensureUserDoc(
          result.user.uid,
          result.user.email ?? '',
          result.user.displayName ?? undefined
        );

        window.sessionStorage.setItem('ntulearn_signed_in', '1');
        document.cookie =
          'ntulearn_logged_in=1; Path=/; SameSite=Lax; Max-Age=604800';

        router.push('/quiz');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative h-screen overflow-hidden bg-[#05030a] text-white">
      {/* Background */}
      <div className="fixed inset-0 -z-30 bg-[linear-gradient(180deg,#05030a_0%,#0a0414_18%,#120722_38%,#090411_60%,#040208_100%)]" />
      <div className="fixed inset-0 -z-20 bg-[radial-gradient(circle_at_50%_6%,rgba(143,84,255,0.22),transparent_16%),radial-gradient(circle_at_16%_24%,rgba(88,31,170,0.18),transparent_24%),radial-gradient(circle_at_84%_20%,rgba(88,31,170,0.18),transparent_24%),radial-gradient(circle_at_50%_48%,rgba(126,63,242,0.18),transparent_26%),radial-gradient(circle_at_50%_78%,rgba(79,25,150,0.18),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(39,10,74,0.32),transparent_32%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_44%,rgba(170,110,255,0.10),transparent_14%),radial-gradient(circle_at_50%_72%,rgba(112,44,214,0.12),transparent_22%)]" />

      {/* Ambient glows */}
      <div className="pointer-events-none absolute left-1/2 top-[18%] h-[520px] w-[980px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(126,63,242,0.22)_0%,_rgba(73,21,138,0.16)_28%,_rgba(28,3,51,0.10)_48%,_rgba(0,0,0,0)_74%)] blur-[34px]" />
      <div className="pointer-events-none absolute bottom-[-180px] left-1/2 h-[480px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(94,41,180,0.20)_0%,_rgba(39,10,74,0.16)_30%,_rgba(0,0,0,0)_74%)] blur-[28px]" />

      {/* Header */}
      <header className="fixed left-1/2 top-5 z-50 w-[calc(100%-28px)] max-w-6xl -translate-x-1/2 px-2">
        <div className="flex items-center justify-between rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-5 py-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_60px_rgba(12,4,25,0.28)] backdrop-blur-2xl md:px-8">
          <button
            onClick={() => router.push('/')}
            className="font-sans text-[1.15rem] font-semibold uppercase tracking-[0.34em] text-white transition hover:opacity-85 md:text-[2rem]"
          >
            NTULEARN
          </button>

          <button
            onClick={() => router.push('/')}
            className="rounded-full border border-[#4b177f]/50 bg-[linear-gradient(180deg,#4b177f_0%,#1c0333_100%)] px-7 py-3 text-base font-semibold text-white shadow-[0_12px_34px_rgba(28,3,51,0.4)] transition hover:scale-[1.03]"
          >
            Back
          </button>
        </div>
      </header>

      {/* Content */}
      <section className="relative flex h-screen items-center justify-center px-6 pb-8 pt-24 md:px-10 md:pb-10 md:pt-28">
        <div className="grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
          {/* Left text */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex min-h-[520px] items-start justify-start pt-10"
          >
            <div className="max-w-[560px] text-left">
              <div className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-4 py-2 text-sm text-[#cfb6ff] backdrop-blur-xl">
                Secure access to NTUlearn
              </div>

              <h1 className="text-5xl font-semibold leading-[0.95] tracking-[-0.05em] sm:text-6xl md:text-7xl">
                Login to your
                <span className="block bg-[linear-gradient(180deg,#ffffff_0%,#d8c2ff_100%)] bg-clip-text text-transparent">
                  adaptive learning space
                </span>
              </h1>
            </div>
          </motion.div>

          {/* Login card */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 flex w-full justify-center md:mt-5"
          >
            <div className="w-full max-w-[420px] rounded-[34px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] p-4 shadow-[0_20px_90px_rgba(12,4,25,0.22)] backdrop-blur-2xl md:p-5">
              <div className="mb-4 text-center">
                <p className="mb-2 text-xs uppercase tracking-[0.3em] text-white/45">
                  Login
                </p>

                <h2 className="text-[30px] font-semibold tracking-[-0.04em] md:text-[34px]">
                  Welcome to <span className="text-[#d8c2ff]">NTUlearn</span>
                </h2>

                <p className="mt-1.5 text-[15px] text-white/50">
                  Sign in to continue your learning experience
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[15px] text-white/80">
                    NTU Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@ntu.edu.sg"
                    required
                    autoComplete="email"
                    className="w-full rounded-[18px] border border-white/20 bg-white/[0.06] px-4 py-3 text-[15px] text-white placeholder:text-white/10 outline-none backdrop-blur-xl transition focus:border-white/35 focus:bg-white/[0.08]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[15px] text-white/80">
                    Password
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    autoComplete="current-password"
                    className="w-full rounded-[18px] border border-white/20 bg-white/[0.06] px-4 py-3 text-[15px] text-white placeholder:text-white/10 outline-none backdrop-blur-xl transition focus:border-white/35 focus:bg-white/[0.08]"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group mt-1 inline-flex w-full items-center justify-between rounded-full border border-[#4b177f]/45 bg-[linear-gradient(180deg,#4b177f_0%,#1c0333_100%)] px-2 py-1.5 shadow-[0_16px_50px_rgba(28,3,51,0.3)] transition hover:scale-[1.01] disabled:opacity-60"
                >
                  <span className="pl-5 text-[17px] font-semibold">
                    {loading ? 'Loading...' : 'Sign In'}
                  </span>

                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black">
                    →
                  </span>
                </button>
              </form>

              <div className="mt-4 rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-4 backdrop-blur-xl">
                <p className="mb-3 text-[16px] font-semibold text-white/85">
                  Demo Credentials
                </p>

                <p className="text-sm text-white/70">
                  Student: student@ntu.edu.sg / demo1234
                </p>
                <p className="text-sm text-white/70">
                  Professor: professor@ntu.edu.sg / demo1234
                </p>
                <p className="text-sm text-white/70">
                  Admin: admin@ntu.edu.sg / demo1234
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
