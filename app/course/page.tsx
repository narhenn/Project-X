'use client';

import AuthGuard from '@/components/AuthGuard';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { AppSidebar } from '@/components/AppSidebar';

const MOCK_COURSES = [
  { id: '1', code: '2552-CC0006-LEC-LE', title: 'SUSTAINABILITY: SOC, ECON, ENV', status: 'Open', instructor: 'Multiple Instructors', image: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=400&h=220&fit=crop' },
  { id: '2', code: '2552-SC2207-CZ2007', title: 'INTRODUCTION TO DATABASES', status: 'Open', instructor: 'CCDS W. K. Ng', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=220&fit=crop' },
  { id: '3', code: '2552-SC2207-CZ2007', title: 'INTRODUCTION TO DATABASES (LAB)', status: 'Open', instructor: 'CCDS Zhang Tianwei', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=220&fit=crop' },
  { id: '4', code: '2552-SC2207-CZ2007', title: 'INTRODUCTION TO DATABASES (TUT)', status: 'Open', instructor: 'CCDS Zhang Tianwei', image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=220&fit=crop' },
  { id: '5', code: '2552-SC3010', title: 'COMPUTER SECURITY', watchTopic: 'Software Security II', status: 'Open', instructor: 'CCDS LI YI', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=220&fit=crop' },
  { id: '6', code: '2552-SC3099', title: 'CAPSTONE PROJECT', status: 'Open', instructor: 'Multiple Instructors', image: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&h=220&fit=crop' },
  { id: '7', code: '2552-SC4012', title: 'SOFTWARE SECURITY', status: 'Open', instructor: 'CCDS W. K. Ng', image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=220&fit=crop' },
  { id: '8', code: '2552-CC0006-LEC-ALL', title: 'SUSTAINABILITY: SOC, ECON & ENVT (LEC-ALL) AY2025/26 SEM 2', status: 'Open', instructor: 'Multiple Instructors', image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=220&fit=crop' },
];

type Course = {
  id: string;
  code: string;
  title: string;
  status: string;
  instructor: string;
  image: string;
  watchTopic?: string;
};

export default function CoursePage() {
  const router = useRouter();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All courses');
  const [perPage, setPerPage] = useState(25);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const handleSignOut = () => router.push('/');

  const filtered = MOCK_COURSES.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );
  const count = filtered.length;

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AuthGuard>
      <div className="relative flex min-h-screen overflow-hidden bg-[#05030a] text-white">
        <div className="pointer-events-none fixed inset-0 -z-30 bg-[#05030a]" />
        <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(1200px_700px_at_15%_0%,rgba(139,92,246,0.24),transparent_58%),radial-gradient(900px_600px_at_85%_90%,rgba(88,31,170,0.20),transparent_62%)]" />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(150deg,rgba(2,6,23,0.96)_0%,rgba(7,5,20,0.95)_56%,rgba(18,8,38,0.9)_100%)]" />
        <AppSidebar currentPath="/course" onSignOut={handleSignOut} />

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="min-h-full">
            <div className="max-w-5xl mx-auto px-6 py-8">
              {/* Header */}
              <div className="mb-8 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] p-5 shadow-[0_12px_40px_rgba(6,2,14,0.36)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <p className="text-xl md:text-2xl font-semibold uppercase tracking-[0.26em] text-white">NTULEARN</p>
                    <span className="text-white/35">|</span>
                    <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-xl font-semibold tracking-wide text-violet-200">
                      Courses
                    </h1>
                  </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-6 py-2.5 text-sm font-semibold text-white/90 shadow-[0_12px_30px_rgba(0,0,0,0.22)] transition-all duration-200 hover:bg-white/[0.1]"
                  >
                    <span className="text-lg">←</span>
                    Dashboard
                  </Link>
                  <Link
                    href="/course"
                    className="flex items-center gap-2 rounded-full border border-violet-300/20 bg-gradient-to-r from-violet-500/85 to-indigo-500/85 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/35 transition-all duration-200 hover:from-violet-500 hover:to-indigo-500"
                  >
                    <span className="text-lg">📚</span>
                    Course
                  </Link>
                </div>
              </div>
                <p className="mt-2 text-sm text-white/60">Browse and manage your courses</p>
              </div>

              {/* Toolbar */}
              <div
                className="mb-8 flex flex-wrap items-center gap-3 overflow-hidden rounded-2xl border border-white/10 p-4"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.085) 0%, rgba(148,163,184,0.05) 100%)',
                  boxShadow: '0 18px 45px rgba(2,6,23,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-center gap-0.5 rounded-xl bg-white/[0.06] p-1">
                  <button
                    onClick={() => setView('grid')}
                    className={`p-2.5 rounded-lg transition-all duration-200 ${
                      view === 'grid'
                        ? 'bg-white/90 text-slate-900 shadow-sm ring-1 ring-white/35'
                        : 'text-white/60 hover:text-white'
                    }`}
                    title="Grid view"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setView('list')}
                    className={`p-2.5 rounded-lg transition-all duration-200 ${
                      view === 'list'
                        ? 'bg-white/90 text-slate-900 shadow-sm ring-1 ring-white/35'
                        : 'text-white/60 hover:text-white'
                    }`}
                    title="List view"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 5a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V9zm0 5a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
                <span className="text-sm font-medium text-white/70">{count} results</span>

                <div className="flex-1 min-w-[220px] max-w-md">
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45 transition-colors group-focus-within:text-violet-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </span>
                    <input
                      type="search"
                      placeholder="Search your courses"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-black/20 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/40 transition-all duration-200 focus:border-violet-300/45 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                    />
                  </div>
                </div>

                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="cursor-pointer rounded-xl border border-white/15 bg-black/20 px-4 py-2.5 text-sm text-white/90 transition-all focus:border-violet-300/45 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                >
                  <option>All courses</option>
                  <option>Enrolled</option>
                  <option>Past</option>
                </select>

                <select
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                  className="cursor-pointer rounded-xl border border-white/15 bg-black/20 px-4 py-2.5 text-sm text-white/90 transition-all focus:border-violet-300/45 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>

              {/* Course grid */}
              <div
                className={
                  view === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'
                    : 'flex flex-col gap-4'
                }
              >
                {filtered.slice(0, perPage).map((course: Course) => {
                  const isComputerSecurity = course.id === '5';

                  const articleEl = (
                    <article
                      key={course.id}
                      className={`group overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-b from-violet-500/[0.16] via-white/[0.05] to-white/[0.03] shadow-[0_18px_45px_rgba(2,6,23,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300/30 hover:shadow-[0_24px_58px_rgba(76,29,149,0.34)] ${
                        isComputerSecurity ? 'cursor-pointer' : ''
                      } ${view === 'list' ? 'flex gap-5 p-5' : ''}`}
                      style={{
                        boxShadow:
                          '0 12px 26px rgba(2,6,23,0.28), inset 0 1px 0 rgba(255,255,255,0.06)',
                      }}
                    >
                      <div
                        className={`relative overflow-hidden bg-slate-800 ${
                          view === 'grid' ? 'h-44' : 'w-48 h-36 shrink-0 rounded-xl'
                        }`}
                      >
                        <img
                          src={course.image}
                          alt=""
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {view === 'grid' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleFavorite(course.id);
                            }}
                            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-slate-400 hover:text-amber-500 hover:scale-110 transition-all duration-200 backdrop-blur-sm border border-white/50"
                            aria-label="Toggle favorite"
                          >
                            {favorites.has(course.id) ? (
                              <svg className="w-5 h-5 fill-amber-500 text-amber-500" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>

                      <div className="p-5 flex flex-col min-w-0">
                        <p className="mb-1.5 truncate font-mono text-xs tracking-tight text-white/50">{course.code}</p>
                        <h2 className="mb-2 line-clamp-2 font-['Plus_Jakarta_Sans',sans-serif] text-sm font-semibold leading-snug text-white transition-colors group-hover:text-violet-200">
                          {course.title}
                        </h2>
                        <span className="mb-3 inline-flex w-fit rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300 shadow-sm">
                          {course.status}
                        </span>

                        {isComputerSecurity ? (
                          <span className="truncate text-xs font-medium text-violet-200">{course.instructor}</span>
                        ) : (
                          <a
                            href="#"
                            className="truncate text-xs font-medium text-violet-200 transition-colors hover:text-violet-100"
                          >
                            {course.instructor}
                          </a>
                        )}

                        {view === 'list' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleFavorite(course.id);
                            }}
                            className="mt-3 self-start rounded-full p-2 text-white/45 transition-all duration-200 hover:bg-amber-50/10 hover:text-amber-400"
                            aria-label="Toggle favorite"
                          >
                            {favorites.has(course.id) ? (
                              <svg className="w-5 h-5 fill-amber-500" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </article>
                  );

                  return isComputerSecurity ? (
                    <Link
                      href={`/watch?moduleId=${encodeURIComponent(course.code)}&topic=${encodeURIComponent(
                        course.watchTopic ?? course.title
                      )}`}
                      className="block"
                      key={course.id}
                    >
                      {articleEl}
                    </Link>
                  ) : (
                    articleEl
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

