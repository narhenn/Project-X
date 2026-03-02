'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { AppSidebar } from '@/components/AppSidebar';

type StudyPost = {
  id: string;
  topic: string;
  place: string;
  date: string;
  time: string;
  note?: string;
  author: string;
  authorInitial: string;
  joined: string[]; // user ids or names who joined
  createdAt: number;
};

const MOCK_POSTS: StudyPost[] = [
  {
    id: '1',
    topic: 'Format strings & printf (Computer Security)',
    place: 'Library Level 4, Study Booth B',
    date: '2025-03-05',
    time: '14:00',
    note: 'Going through lecture 3 and practice problems.',
    author: 'Wei Ming',
    authorInitial: 'W',
    joined: ['Sarah L.'],
    createdAt: Date.now() - 3600000,
  },
  {
    id: '2',
    topic: 'Introduction to Databases – SQL queries',
    place: 'North Spine NS4-02-12',
    date: '2025-03-06',
    time: '10:00',
    author: 'Priya K.',
    authorInitial: 'P',
    joined: [],
    createdAt: Date.now() - 7200000,
  },
  {
    id: '3',
    topic: 'Software Security – Buffer overflows',
    place: 'The Hive, Quiet Zone',
    date: '2025-03-07',
    time: '16:00',
    note: 'Bring laptop for demo.',
    author: 'James T.',
    authorInitial: 'J',
    joined: ['Alex', 'Nurul'],
    createdAt: Date.now() - 86400000,
  },
];

const CURRENT_USER = 'You';

export default function CommunityPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<StudyPost[]>(MOCK_POSTS);
  const [topic, setTopic] = useState('');
  const [place, setPlace] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');

  const handleSignOut = () => router.push('/');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !place.trim() || !date.trim() || !time.trim()) return;
    const newPost: StudyPost = {
      id: String(Date.now()),
      topic: topic.trim(),
      place: place.trim(),
      date: date.trim(),
      time: time.trim(),
      note: note.trim() || undefined,
      author: CURRENT_USER,
      authorInitial: 'A',
      joined: [],
      createdAt: Date.now(),
    };
    setPosts((prev) => [newPost, ...prev]);
    setTopic('');
    setPlace('');
    setDate('');
    setTime('');
    setNote('');
  };

  const handleJoin = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, joined: p.joined.includes(CURRENT_USER) ? p.joined.filter((x) => x !== CURRENT_USER) : [...p.joined, CURRENT_USER] }
          : p
      )
    );
  };

  const isJoined = (post: StudyPost) => post.joined.includes(CURRENT_USER);
  const isAuthor = (post: StudyPost) => post.author === CURRENT_USER;

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(165deg, #f8fafc 0%, #f1f5f9 35%, #e2e8f0 100%)' }}>
      <AppSidebar currentPath="/community" onSignOut={handleSignOut} />

      <main className="flex-1 overflow-auto">
        <div className="min-h-full">
          <div className="max-w-3xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-8">
              <p className="font-medium text-indigo-600 text-sm uppercase tracking-widest mb-1">Communities</p>
              <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                Study together
              </h1>
              <p className="text-slate-500 text-sm mt-1.5">Post when and where you&apos;re studying — others can join you.</p>
            </div>

            {/* Post a study session */}
            <div
              className="mb-8 rounded-2xl border border-slate-200/80 p-6 shadow-md overflow-hidden"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)' }}
            >
              <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-lg font-semibold text-slate-900 mb-4">Post a study session</h2>
              <p className="text-sm text-slate-500 mb-4">Say &quot;I&apos;m going to study this topic at this place at this time&quot; and others can accept and join.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="topic" className="block text-sm font-medium text-slate-700 mb-1.5">Topic</label>
                  <input
                    id="topic"
                    type="text"
                    placeholder="e.g. Computer Security – Format strings"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="place" className="block text-sm font-medium text-slate-700 mb-1.5">Place</label>
                    <input
                      id="place"
                      type="text"
                      placeholder="e.g. Library Level 4"
                      value={place}
                      onChange={(e) => setPlace(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                    <input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="time" className="block text-sm font-medium text-slate-700 mb-1.5">Time</label>
                    <input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="note" className="block text-sm font-medium text-slate-700 mb-1.5">Note (optional)</label>
                    <input
                      id="note"
                      type="text"
                      placeholder="e.g. Bring laptop"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all duration-200"
                >
                  Post request
                </button>
              </form>
            </div>

            {/* Feed of study sessions */}
            <div className="space-y-4">
              <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-lg font-semibold text-slate-900">Study sessions</h2>
              {posts.length === 0 ? (
                <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-8 text-center text-slate-500 text-sm">
                  No study sessions yet. Be the first to post one.
                </div>
              ) : (
                posts.map((post) => (
                  <article
                    key={post.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300/80 transition-all duration-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-900 mb-2">{post.topic}</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-slate-400">📍</span> {post.place}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-slate-400">📅</span> {post.date}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-slate-400">🕐</span> {post.time}
                          </span>
                        </div>
                        {post.note && <p className="mt-2 text-sm text-slate-500">{post.note}</p>}
                        <div className="mt-3 flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold">
                            {post.authorInitial}
                          </span>
                          <span className="text-sm text-slate-600">{post.author}</span>
                          {post.joined.length > 0 && (
                            <span className="text-sm text-slate-500">
                              · {post.joined.length} joining {post.joined.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      {!isAuthor(post) && (
                        <button
                          type="button"
                          onClick={() => handleJoin(post.id)}
                          className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            isJoined(post)
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/80'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20'
                          }`}
                        >
                          {isJoined(post) ? 'Joined' : 'Join'}
                        </button>
                      )}
                      {isAuthor(post) && (
                        <span className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
                          Your post
                        </span>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
