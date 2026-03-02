'use client';

import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/AppSidebar';

const EVENTS = [
  { id: '1', title: 'Introduction to Databases – Lecture', date: 'Mon 3 Mar', time: '10:00', type: 'lecture', location: 'LT1A' },
  { id: '2', title: 'Computer Security – Tutorial', date: 'Tue 4 Mar', time: '14:00', type: 'tutorial', location: 'NS4-02-12' },
  { id: '3', title: 'Assignment 2 due (Software Security)', date: 'Wed 5 Mar', time: '23:59', type: 'deadline', location: '—' },
  { id: '4', title: 'Sustainability – LEC', date: 'Thu 6 Mar', time: '09:00', type: 'lecture', location: 'LHS-LT' },
  { id: '5', title: 'Mid-term quiz (Databases)', date: 'Fri 7 Mar', time: '16:00', type: 'exam', location: 'Online' },
];

const typeStyles: Record<string, string> = {
  lecture: 'bg-blue-100 text-blue-800',
  tutorial: 'bg-amber-100 text-amber-800',
  deadline: 'bg-rose-100 text-rose-800',
  exam: 'bg-violet-100 text-violet-800',
};

export default function CalendarPage() {
  const router = useRouter();
  const handleSignOut = () => router.push('/');

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(165deg, #f8fafc 0%, #f1f5f9 35%, #e2e8f0 100%)' }}>
      <AppSidebar currentPath="/calendar" onSignOut={handleSignOut} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <p className="font-medium text-indigo-600 text-sm uppercase tracking-widest mb-1">Calendar</p>
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-3xl font-bold tracking-tight text-slate-900 mb-2">
            Upcoming
          </h1>
          <p className="text-slate-500 text-sm mb-8">Lectures, deadlines and exams</p>
          <ul className="space-y-3">
            {EVENTS.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm"
              >
                <div className="w-14 shrink-0 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase">{e.date.split(' ')[0]}</div>
                  <div className="text-lg font-bold text-slate-900">{e.date.split(' ')[1]}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{e.title}</p>
                  <p className="text-sm text-slate-500">{e.time} · {e.location}</p>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium ${typeStyles[e.type] || 'bg-slate-100 text-slate-700'}`}>
                  {e.type}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
