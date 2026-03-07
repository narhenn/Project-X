'use client';

import AuthGuard from '@/components/AuthGuard';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentData } from '@/lib/useStudentData';
import { authFetch } from '@/lib/api-client';
import { auth, saveStudyProfile, getStudyProfile, findStudyMatches, getCommunityPosts, createCommunityPost, addPostReply, votePost } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

const SEED_POSTS = [
  {
    id: 'seed-1',
    title: 'How do nested if-else statements work?',
    body: 'I keep getting confused with the indentation and which else belongs to which if. Can someone explain with a simple example?',
    author: 'Anonymous Owl',
    anonymous: true,
    module: 'SC1003',
    topic: 'Control Structures',
    upvotes: 12,
    downvotes: 1,
    replies: [
      { id: 'r1', author: 'Arun M.', body: 'Think of it like nesting boxes. Each if opens a box, and the else closes the nearest open box. Indentation helps you see which box you are in!', upvotes: 8, isAI: false },
      { id: 'r2', author: '🤖 AI Tutor', body: 'Great question! Nested if-else works from the inside out. The innermost if-else pair resolves first. Think of it like Russian nesting dolls — each doll (if) has its own matching lid (else). A tip: always use curly braces {} even for single-line blocks to avoid confusion.', upvotes: 5, isAI: true },
    ],
    solved: true,
    timestamp: '2 hours ago',
    studyGroup: null,
  },
  {
    id: 'seed-2',
    title: 'Anyone want to study loops together before the quiz?',
    body: 'I am struggling with for vs while loops. Looking for 2-3 people to do a study session tomorrow evening around 7pm. We can meet at The Hive or do it on Zoom.',
    author: 'Pranati S.',
    anonymous: false,
    module: 'SC1003',
    topic: 'Loops',
    upvotes: 18,
    downvotes: 0,
    replies: [
      { id: 'r3', author: 'Yohesh R.', body: 'Count me in! I also struggle with do-while. Zoom works for me.', upvotes: 3, isAI: false },
      { id: 'r4', author: 'Nanda K.', body: 'I am in too. Let us do The Hive Level 3?', upvotes: 2, isAI: false },
    ],
    solved: false,
    timestamp: '5 hours ago',
    studyGroup: { date: 'Tomorrow 7pm', location: 'The Hive L3 / Zoom', spots: 4, joined: 2 },
  },
  {
    id: 'seed-3',
    title: 'What is the difference between break and continue?',
    body: 'Both seem to skip something in loops but I cannot figure out when to use which one.',
    author: 'Anonymous Fox',
    anonymous: true,
    module: 'SC1003',
    topic: 'Loops',
    upvotes: 9,
    downvotes: 0,
    replies: [
      { id: 'r5', author: '🤖 AI Tutor', body: 'Break exits the entire loop immediately — like walking out of a movie theater. Continue skips just the current iteration and moves to the next one — like fast-forwarding past one scene but keeping watching. Use break when you have found what you need. Use continue when you want to skip certain items but keep processing the rest.', upvotes: 7, isAI: true },
    ],
    solved: true,
    timestamp: '1 day ago',
    studyGroup: null,
  },
  {
    id: 'seed-4',
    title: 'Study group for Module 3: Functions',
    body: 'Starting Module 3 next week. Want to form a weekly study group to go through it together. Planning to meet every Wednesday at 6pm.',
    author: 'Narhen K.',
    anonymous: false,
    module: 'SC1003',
    topic: 'Functions',
    upvotes: 15,
    downvotes: 0,
    replies: [{ id: 'r6', author: 'Anonymous Tiger', body: 'Yes please! Functions are tough. Wednesday works.', upvotes: 4, isAI: false }],
    solved: false,
    timestamp: '1 day ago',
    studyGroup: { date: 'Every Wed 6pm', location: 'TBD', spots: 6, joined: 3 },
  },
];

const modules = ['All', 'SC1003', 'SC1005', 'SC2006', 'MH1812'];
const topics = ['All', 'Control Structures', 'Loops', 'Functions', 'Arrays', 'Recursion'];

export default function CommunityPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>(SEED_POSTS);
  const [postsLoading, setPostsLoading] = useState(false);
  const [filterModules, setFilterModules] = useState<string[]>(['All']);
  const [filterTopics, setFilterTopics] = useState<string[]>(['All']);
  const [showNew, setShowNew] = useState(false);
  const [showReplying, setShowReplying] = useState<string | number | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | number | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, 'up' | 'down' | null>>({});
  const [joinedGroups, setJoinedGroups] = useState<Record<string, boolean>>({});

  // Study Matcher state
  const { studentData } = useStudentData();
  const [showMatcher, setShowMatcher] = useState(false);
  const [matcherOptedIn, setMatcherOptedIn] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchProfile, setMatchProfile] = useState<any>(null);

  const weakTopics = studentData?.weakTopics || [];
  const strongTopics = studentData?.strongTopics || [];

  const loadMatcherData = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const profile = await getStudyProfile(user.uid);
      if (profile) {
        setMatchProfile(profile);
        setMatcherOptedIn(!!(profile as any).optIn);
      }
    } catch { /* ignore */ }
  }, []);

  const handleOptIn = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setMatchLoading(true);
    try {
      await saveStudyProfile(user.uid, {
        displayName: user.displayName || 'Student',
        weakTopics,
        strongTopics,
        studyStyle: studentData?.learningStyle || 'Unknown',
        lookingForHelp: weakTopics,
        canHelpWith: strongTopics,
        optIn: true,
      });
      setMatcherOptedIn(true);
      // Find matches
      const found = await findStudyMatches(user.uid, weakTopics);
      setMatches(found);
    } catch { /* ignore */ }
    setMatchLoading(false);
  };

  const handleFindMatches = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setMatchLoading(true);
    try {
      // Update profile with latest data
      await saveStudyProfile(user.uid, {
        displayName: user.displayName || 'Student',
        weakTopics,
        strongTopics,
        studyStyle: studentData?.learningStyle || 'Unknown',
        lookingForHelp: weakTopics,
        canHelpWith: strongTopics,
        optIn: true,
      });
      const found = await findStudyMatches(user.uid, weakTopics);
      setMatches(found);
    } catch { /* ignore */ }
    setMatchLoading(false);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadMatcherData();
        // Try to load Firestore posts in background; seed posts always visible
        getCommunityPosts()
          .then((firestorePosts) => {
            if (!firestorePosts || firestorePosts.length === 0) return;
            const formatted = firestorePosts.map((p: any) => ({
              ...p,
              upvotes: p.upvotes ?? 0,
              downvotes: p.downvotes ?? 0,
              replies: (p.replies || []).map((r: any) => ({ ...r, upvotes: r.upvotes ?? 0 })),
              timestamp: p.createdAt?.toDate
                ? formatTimeAgo(p.createdAt.toDate())
                : p.createdAt?.seconds
                ? formatTimeAgo(new Date(p.createdAt.seconds * 1000))
                : 'Just now',
            }));
            const firestoreIds = new Set(formatted.map((p: any) => p.id));
            setPosts([...formatted, ...SEED_POSTS.filter(p => !firestoreIds.has(p.id))]);
          })
          .catch(() => { /* keep seed posts */ });
      }
    });
    return () => unsub();
  }, [loadMatcherData]);

  // New post form
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newModule, setNewModule] = useState('SC1003');
  const [newTopic, setNewTopic] = useState('Control Structures');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isStudyGroup, setIsStudyGroup] = useState(false);
  const [groupDate, setGroupDate] = useState('');
  const [groupLocation, setGroupLocation] = useState('');
  const [groupSpots, setGroupSpots] = useState(4);

  // Reply form
  const [replyText, setReplyText] = useState('');
  const [replyAnonymous, setReplyAnonymous] = useState(false);

  // AI reply
  const [aiLoading, setAiLoading] = useState<string | number | null>(null);

  const filtered = posts.filter((p) => {
    const modulePass = filterModules.includes('All') || filterModules.includes(p.module);
    const topicPass = filterTopics.includes('All') || filterTopics.includes(p.topic);
    if (!modulePass) return false;
    if (!topicPass) return false;
    return true;
  });

  const toggleMultiFilter = (
    value: string,
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (value === 'All') {
      setSelected(['All']);
      return;
    }

    const base = selected.filter((s) => s !== 'All');
    const exists = base.includes(value);
    const next = exists ? base.filter((s) => s !== value) : [...base, value];
    setSelected(next.length > 0 ? next : ['All']);
  };

  const handleVote = async (postId: string | number, type: 'up' | 'down') => {
    const id = String(postId);
    const previousVote = userVotes[id] ?? null;

    setPosts((prev) =>
      prev.map((p) => {
        if (String(p.id) !== id) return p;

        const up = p.upvotes ?? 0;
        const down = p.downvotes ?? 0;

        if (previousVote === type) {
          return {
            ...p,
            upvotes: type === 'up' ? Math.max(0, up - 1) : up,
            downvotes: type === 'down' ? Math.max(0, down - 1) : down,
          };
        }

        if (previousVote && previousVote !== type) {
          return {
            ...p,
            upvotes:
              previousVote === 'up'
                ? Math.max(0, up - 1)
                : type === 'up'
                ? up + 1
                : up,
            downvotes:
              previousVote === 'down'
                ? Math.max(0, down - 1)
                : type === 'down'
                ? down + 1
                : down,
          };
        }

        return {
          ...p,
          upvotes: type === 'up' ? up + 1 : up,
          downvotes: type === 'down' ? down + 1 : down,
        };
      })
    );

    setUserVotes((prev) => ({
      ...prev,
      [id]: previousVote === type ? null : type,
    }));

    if (!previousVote) {
      try {
        await votePost(id, type);
      } catch (e) {
        console.error('Failed to vote:', e);
      }
    }
  };

  const handleNewPost = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const authorName = isAnonymous
      ? 'Anonymous ' + ['Owl', 'Fox', 'Tiger', 'Panda', 'Eagle'][Math.floor(Math.random() * 5)]
      : user.displayName || 'You';
    const postData = {
      title: newTitle,
      body: newBody,
      author: authorName,
      anonymous: isAnonymous,
      module: newModule,
      topic: newTopic,
      studyGroup: isStudyGroup ? { date: groupDate, location: groupLocation, spots: groupSpots, joined: 1 } : null,
    };

    try {
      const newId = await createCommunityPost(user.uid, postData);
      // Optimistically add to UI
      setPosts((prev) => [{ id: newId, ...postData, upvotes: 0, downvotes: 0, replies: [], solved: false, timestamp: 'Just now' }, ...prev]);
    } catch (e) {
      console.error('Failed to create post:', e);
    }

    setShowNew(false);
    setNewTitle('');
    setNewBody('');
    setIsAnonymous(false);
    setIsStudyGroup(false);
    setGroupDate('');
    setGroupLocation('');
    setGroupSpots(4);
  };

  const handleReply = async (postId: string | number) => {
    const user = auth.currentUser;
    if (!user) return;
    const authorName = replyAnonymous
      ? 'Anonymous ' + ['Deer', 'Wolf', 'Bear'][Math.floor(Math.random() * 3)]
      : user.displayName || 'You';
    const replyData = {
      author: authorName,
      body: replyText,
      isAI: false,
    };

    try {
      const replyId = await addPostReply(String(postId), user.uid, replyData);
      // Optimistically add to UI
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, replies: [...p.replies, { id: replyId, ...replyData, upvotes: 0 }] } : p))
      );
    } catch (e) {
      console.error('Failed to add reply:', e);
    }

    setReplyText('');
    setShowReplying(null);
    setReplyAnonymous(false);
  };

  const handleAIReply = async (postId: string | number) => {
    setAiLoading(postId as any);
    const post = posts.find((p) => p.id === postId);

    let aiBody = 'Try breaking this problem into smaller parts. Review the lecture materials for this topic and practice with simple examples first.';
    try {
      const res = await authFetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: post.module + ' ' + post.topic,
          segmentTitle: post.title,
          segmentContent: post.body + ' ' + post.replies.map((r: any) => r.body).join(' '),
          timestamp: 'community',
        }),
      });
      const data = await res.json();
      if (data.summary) aiBody = data.summary;
    } catch { /* use fallback */ }

    const replyData = { author: '🤖 AI Tutor', body: aiBody, isAI: true };
    try {
      const replyId = await addPostReply(String(postId), 'ai-tutor', replyData);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, replies: [...p.replies, { id: replyId, ...replyData, upvotes: 0 }] } : p))
      );
    } catch {
      // Fallback: show in UI only
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, replies: [...p.replies, { id: 'ai' + Date.now(), ...replyData, upvotes: 0 }] } : p))
      );
    }

    setAiLoading(null);
  };

  const toggleSolved = (postId: string | number) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, solved: !p.solved } : p)));
  };

  const toggleJoinStudyGroup = (postId: string | number) => {
    const id = String(postId);
    const hasJoined = joinedGroups[id] ?? false;

    setPosts((prev) =>
      prev.map((p) => {
        if (String(p.id) !== id || !p.studyGroup) return p;
        if (!hasJoined && p.studyGroup.joined >= p.studyGroup.spots) return p;
        return {
          ...p,
          studyGroup: {
            ...p.studyGroup,
            joined: hasJoined
              ? Math.max(0, p.studyGroup.joined - 1)
              : p.studyGroup.joined + 1,
          },
        };
      })
    );

    setJoinedGroups((prev) => ({ ...prev, [id]: !hasJoined }));
  };

  return (
    <AuthGuard>
      <main className="relative min-h-screen overflow-hidden bg-[#05030a] text-white [&_.text-sm]:text-[14.5px] [&_.text-xs]:text-[12.5px]">
        <div className="fixed inset-0 -z-30 bg-[linear-gradient(180deg,#05030a_0%,#0a0414_18%,#120722_38%,#090411_60%,#040208_100%)]" />
        <div className="fixed inset-0 -z-20 bg-[radial-gradient(circle_at_50%_6%,rgba(143,84,255,0.22),transparent_18%),radial-gradient(circle_at_16%_24%,rgba(88,31,170,0.18),transparent_24%),radial-gradient(circle_at_84%_20%,rgba(88,31,170,0.18),transparent_24%),radial-gradient(circle_at_50%_48%,rgba(126,63,242,0.18),transparent_26%),radial-gradient(circle_at_50%_78%,rgba(79,25,150,0.18),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(39,10,74,0.32),transparent_32%)]" />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_44%,rgba(170,110,255,0.10),transparent_14%),radial-gradient(circle_at_50%_72%,rgba(112,44,214,0.12),transparent_22%)]" />
        <div className="pointer-events-none absolute left-1/2 top-[14%] h-[520px] w-[980px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(126,63,242,0.22)_0%,_rgba(73,21,138,0.16)_28%,_rgba(28,3,51,0.10)_48%,_rgba(0,0,0,0)_74%)] blur-[34px]" />
        <div className="pointer-events-none absolute bottom-[-180px] left-1/2 h-[480px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(94,41,180,0.20)_0%,_rgba(39,10,74,0.16)_30%,_rgba(0,0,0,0)_74%)] blur-[28px]" />

        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] backdrop-blur-2xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/course')}
                className="font-sans text-[1.15rem] font-semibold uppercase tracking-[0.34em] text-white md:text-[2rem]"
              >
                NTULEARN
              </button>
              <span className="text-slate-500">|</span>
              <span className="text-sm text-slate-300">Community Forum</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/85 transition hover:bg-white/[0.1]"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push('/course')}
                className="rounded-full border border-cyan-400/30 bg-[linear-gradient(180deg,rgba(34,211,238,0.28),rgba(37,99,235,0.22))] px-5 py-2.5 text-sm font-semibold text-cyan-100 shadow-[0_12px_30px_rgba(34,211,238,0.2)] transition hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(34,211,238,0.36),rgba(37,99,235,0.3))]"
              >
                Courses
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="text-3xl font-bold text-white">Study Community 💬</h2>
              <p className="text-sm text-slate-400 mt-1">Ask questions, help peers, form study groups</p>
            </div>
            <button
              onClick={() => setShowNew(true)}
              className="border border-violet-400/30 bg-[linear-gradient(180deg,rgba(139,92,246,0.95),rgba(76,29,149,0.95))] text-white font-semibold px-5 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-violet-500/25"
            >
              + New Post
            </button>
          </div>

          {/* Filters */}
          <div className="mb-7 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-white/45">Module</p>
              <div className="flex flex-wrap gap-2">
                {modules.map((m) => (
                  <button
                    key={m}
                    onClick={() => toggleMultiFilter(m, filterModules, setFilterModules)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filterModules.includes(m) ? 'bg-violet-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-white/45">Topic</p>
              <div className="flex flex-wrap gap-2">
                {topics.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleMultiFilter(t, filterTopics, setFilterTopics)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filterTopics.includes(t) ? 'bg-violet-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AI Study Matcher */}
          <div className="mb-6 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  🤝 AI Study Matcher
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">ML-Powered</span>
                </h3>
                <p className="text-sm text-slate-400 mt-1">Find study partners whose strengths complement your weak topics</p>
              </div>
              <button onClick={() => setShowMatcher(!showMatcher)}
                className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-sm px-4 py-2 rounded-lg transition-all">
                {showMatcher ? 'Hide' : 'Find Partners'}
              </button>
            </div>

            {showMatcher && (
              <div className="mt-4">
                {/* Your profile summary */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-slate-400 mb-1">You need help with:</p>
                    <div className="flex flex-wrap gap-1">
                      {weakTopics.length > 0 ? weakTopics.map((t: string) => (
                        <span key={t} className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">{t}</span>
                      )) : <span className="text-xs text-slate-500">No weak topics detected</span>}
                    </div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-slate-400 mb-1">You can help with:</p>
                    <div className="flex flex-wrap gap-1">
                      {strongTopics.length > 0 ? strongTopics.map((t: string) => (
                        <span key={t} className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">{t}</span>
                      )) : <span className="text-xs text-slate-500">No strong topics yet</span>}
                    </div>
                  </div>
                </div>

                {!matcherOptedIn ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-300 mb-3">Opt in to let AI match you with complementary study partners. Your topic strengths/weaknesses are shared anonymously.</p>
                    <button onClick={handleOptIn} disabled={matchLoading}
                      className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-semibold px-6 py-2.5 rounded-xl transition-all">
                      {matchLoading ? 'Finding matches...' : 'Opt In & Find Matches'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-emerald-300 font-medium">Matched Study Partners</p>
                      <button onClick={handleFindMatches} disabled={matchLoading}
                        className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-all">
                        {matchLoading ? 'Searching...' : 'Refresh Matches'}
                      </button>
                    </div>
                    {matches.length > 0 ? (
                      <div className="space-y-2">
                        {matches.slice(0, 5).map((m: any, i: number) => (
                          <div key={i} className="p-3 bg-white/5 rounded-xl flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-white">{m.displayName || 'Student'}</p>
                              <p className="text-xs text-slate-400">Style: {m.studyStyle || 'Unknown'}</p>
                              {m.canHelpWith && m.canHelpWith.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  <span className="text-xs text-slate-500">Can help you with:</span>
                                  {m.canHelpWith.map((t: string) => (
                                    <span key={t} className="text-xs bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-full">{t}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                                {Math.round(m.matchScore * 20)}% match
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-3">
                        {matchLoading ? 'Searching for compatible study partners...' : 'No matches found yet. More students need to opt in!'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* New Post Modal */}
          {showNew && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <h3 className="text-lg font-bold text-white mb-4">Create New Post</h3>
              <div className="space-y-4">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Question or topic title..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Describe your question or study group details..."
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />
                <div className="flex gap-4">
                  <select
                    value={newModule}
                    onChange={(e) => setNewModule(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                  >
                    {modules
                      .filter((m) => m !== 'All')
                      .map((m) => (
                        <option key={m} value={m} className="bg-slate-800">
                          {m}
                        </option>
                      ))}
                  </select>
                  <select
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                  >
                    {topics
                      .filter((t) => t !== 'All')
                      .map((t) => (
                        <option key={t} value={t} className="bg-slate-800">
                          {t}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Toggles */}
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="w-4 h-4 rounded" />
                    <span className="text-sm text-slate-300">🎭 Post anonymously</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isStudyGroup} onChange={(e) => setIsStudyGroup(e.target.checked)} className="w-4 h-4 rounded" />
                    <span className="text-sm text-slate-300">👥 This is a study group invite</span>
                  </label>
                </div>

                {/* Study Group Details */}
                {isStudyGroup && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-medium text-green-300">Study Group Details</p>
                    <input
                      value={groupDate}
                      onChange={(e) => setGroupDate(e.target.value)}
                      placeholder="When? (e.g. Tomorrow 7pm)"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500"
                    />
                    <input
                      value={groupLocation}
                      onChange={(e) => setGroupLocation(e.target.value)}
                      placeholder="Where? (e.g. The Hive L3 / Zoom)"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">Max spots:</span>
                      <input
                        type="number"
                        value={groupSpots}
                        onChange={(e) => setGroupSpots(parseInt(e.target.value || '4', 10))}
                        min={2}
                        max={20}
                        className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleNewPost}
                    disabled={!newTitle || !newBody}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-semibold px-6 py-2.5 rounded-xl transition-all"
                  >
                    Post
                  </button>
                  <button
                    onClick={() => setShowNew(false)}
                    className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Posts List */}
          <div className="space-y-4">
            {filtered.map((post) => (
              <div key={post.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-6">
                  <div className="flex gap-4">
                    {/* Vote Column */}
                    <div className="flex flex-col items-center gap-1 min-w-[40px]">
                      <button
                        onClick={() => handleVote(post.id, 'up')}
                        className={`text-lg hover:scale-125 transition-transform ${
                          userVotes[String(post.id)] === 'up' ? 'text-green-400' : 'text-slate-500'
                        }`}
                      >
                        ▲
                      </button>
                      <span className="text-sm font-bold text-white">{post.upvotes - post.downvotes}</span>
                      <button
                        onClick={() => handleVote(post.id, 'down')}
                        className={`text-lg hover:scale-125 transition-transform ${
                          userVotes[String(post.id)] === 'down' ? 'text-red-400' : 'text-slate-500'
                        }`}
                      >
                        ▼
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-full">{post.module}</span>
                        <span className="bg-violet-500/20 text-violet-300 text-xs px-2 py-0.5 rounded-full">{post.topic}</span>
                        {post.solved && <span className="bg-green-500/20 text-green-300 text-xs px-2 py-0.5 rounded-full">✅ Solved</span>}
                        {post.studyGroup && <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded-full">👥 Study Group</span>}
                        {post.anonymous && <span className="bg-slate-500/20 text-slate-400 text-xs px-2 py-0.5 rounded-full">🎭 Anonymous</span>}
                      </div>

                      <h3
                        className="text-lg font-bold text-white mb-1 cursor-pointer hover:text-blue-300 transition-colors"
                        onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                      >
                        {post.title}
                      </h3>

                      <p className="text-sm text-slate-400 mb-3">{post.body}</p>

                      {/* Study Group Card */}
                      {post.studyGroup && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-green-300">📅 {post.studyGroup.date}</p>
                              <p className="text-sm text-green-200">📍 {post.studyGroup.location}</p>
                              <p className="text-xs text-green-400 mt-1">
                                {post.studyGroup.joined}/{post.studyGroup.spots} joined
                              </p>
                            </div>
                            <button
                              onClick={() => toggleJoinStudyGroup(post.id)}
                              disabled={!joinedGroups[String(post.id)] && post.studyGroup.joined >= post.studyGroup.spots}
                              className={`text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all ${
                                joinedGroups[String(post.id)]
                                  ? 'bg-rose-500 hover:bg-rose-600'
                                  : 'bg-green-500 hover:bg-green-600 disabled:bg-green-500/50'
                              }`}
                            >
                              {joinedGroups[String(post.id)] ? 'Leave Group' : 'Join Group'}
                            </button>
                          </div>

                          <div className="h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{ width: `${(post.studyGroup.joined / post.studyGroup.spots) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Meta */}
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{post.author}</span>
                        <span>{post.timestamp}</span>
                        <span>{post.replies.length} replies</span>
                        <button
                          onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          {expandedPost === post.id ? 'Hide replies' : 'Show replies'}
                        </button>
                        <button onClick={() => toggleSolved(post.id)} className="text-green-400 hover:text-green-300">
                          {post.solved ? 'Unmark solved' : 'Mark solved'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Replies */}
                {expandedPost === post.id && (
                  <div className="border-t border-white/10 bg-white/[0.02] px-6 py-4">
                    {post.replies.map((reply: any) => (
                      <div
                        key={reply.id}
                        className={`p-4 rounded-xl mb-3 ${
                          reply.isAI ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-white/5 border border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-sm font-medium ${reply.isAI ? 'text-blue-300' : 'text-slate-300'}`}>
                            {reply.author}
                          </span>
                          {reply.isAI && (
                            <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-full">
                              AI Generated
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{reply.body}</p>
                      </div>
                    ))}

                    {/* Reply Actions */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => setShowReplying(showReplying === post.id ? null : post.id)}
                        className="bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-lg transition-all"
                      >
                        💬 Reply
                      </button>
                      <button
                        onClick={() => handleAIReply(post.id)}
                        disabled={aiLoading === post.id}
                        className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm px-4 py-2 rounded-lg transition-all"
                      >
                        {aiLoading === post.id ? '⏳ AI thinking...' : '🤖 Ask AI to answer'}
                      </button>
                    </div>

                    {/* Reply Form */}
                    {showReplying === post.id && (
                      <div className="mt-3 space-y-3">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write your reply..."
                          rows={3}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                        />
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={replyAnonymous}
                              onChange={(e) => setReplyAnonymous(e.target.checked)}
                              className="w-4 h-4 rounded"
                            />
                            <span className="text-xs text-slate-400">🎭 Reply anonymously</span>
                          </label>
                          <button
                            onClick={() => handleReply(post.id)}
                            disabled={!replyText}
                            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white text-sm px-4 py-2 rounded-lg transition-all"
                          >
                            Post Reply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {postsLoading && posts.length === 0 && (
            <div className="text-center py-12">
              <svg className="animate-spin h-8 w-8 mx-auto text-blue-400 mb-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              <p className="text-slate-400">Loading community posts...</p>
            </div>
          )}

          {!postsLoading && filtered.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-slate-400">No posts found for this filter. Be the first to post!</p>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
