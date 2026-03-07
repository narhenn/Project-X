'use client';

import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/AppSidebar';
import { useStudentData } from '@/lib/useStudentData';

const FALLBACK_ACTIVITIES = [
  { id: '1', type: 'course', text: 'Viewed Introduction to Databases – Segment 2', time: '2 hours ago', icon: '📖' },
  { id: '2', type: 'quiz', text: 'Completed quiz in Computer Security (Segment 1)', time: '5 hours ago', icon: '✅' },
  { id: '3', type: 'community', text: 'Joined study session: Format strings & printf', time: 'Yesterday', icon: '👥' },
  { id: '4', type: 'course', text: 'Opened Sustainability: SOC, ECON, ENV', time: 'Yesterday', icon: '📖' },
  { id: '5', type: 'assignment', text: 'Submitted Assignment 1 – Software Security', time: '2 days ago', icon: '📤' },
  { id: '6', type: 'course', text: 'Watched lecture video – Capstone Project', time: '3 days ago', icon: '🎬' },
];

function formatRelativeTime(weekNum: number): string {
  if (weekNum <= 0 || weekNum === 1) return 'This week';
  if (weekNum === 2) return 'Last week';
  return `${weekNum} weeks ago`;
}

export default function ActivityPage() {
  const router = useRouter();
  const handleSignOut = () => router.push('/');
  const { dashboardData, studentData, loading, isRealData } = useStudentData();

  // Build real activities from quiz history
  const activities = isRealData && studentData.quizHistory?.length > 0
    ? studentData.quizHistory
        .slice()
        .sort((a: any, b: any) => (a.week ?? 99) - (b.week ?? 99))
        .map((q: any, i: number) => ({
          id: `quiz-${i}`,
          type: 'quiz',
          text: `Scored ${q.score}% on ${q.topic}`,
          time: formatRelativeTime(q.week),
          icon: q.score >= 80 ? '✅' : q.score >= 60 ? '📝' : '🔄',
        }))
    : FALLBACK_ACTIVITIES;

  return (
    <div className="min-h-screen flex bg-[linear-gradient(180deg,#05030a_0%,#0a0414_18%,#120722_38%,#090411_60%,#040208_100%)] text-white">
      <AppSidebar currentPath="/activity" onSignOut={handleSignOut} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <p className="font-medium text-violet-300 text-sm uppercase tracking-widest mb-1">Activity</p>
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-3xl font-bold tracking-tight text-white mb-2">
            Recent activity
          </h1>
          <p className="text-white/60 text-sm mb-8">Your engagement across courses and communities</p>
          {loading ? (
            <div className="text-center py-12 text-white/50">Loading activity...</div>
          ) : (
            <ul className="space-y-2">
              {activities.map((a: any) => (
                <li
                  key={a.id}
                  className="flex items-start gap-4 p-4 rounded-2xl border border-white/12 bg-white/[0.06] shadow-sm"
                >
                  <span className="text-xl">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">{a.text}</p>
                    <p className="text-sm text-white/60 mt-0.5">{a.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

