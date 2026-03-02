'use client';

import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/AppSidebar';

const CONVOS = [
  { id: '1', name: 'CCDS W. K. Ng', role: 'Instructor – Intro to Databases', preview: 'Please check the updated assignment rubric by Friday.', time: '1h ago', unread: true },
  { id: '2', name: 'Student Support', role: 'NTUlearn', preview: 'Your password will expire in 7 days. Reset it from the portal.', time: '3h ago', unread: true },
  { id: '3', name: 'CCDS LI YI', role: 'Instructor – Computer Security', preview: 'Tutorial solutions are now available in Resources.', time: 'Yesterday', unread: false },
  { id: '4', name: 'Priya K.', role: 'Classmate', preview: 'Are you joining the study session tomorrow?', time: '2 days ago', unread: false },
];

export default function MessagesPage() {
  const router = useRouter();
  const handleSignOut = () => router.push('/');

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(165deg, #f8fafc 0%, #f1f5f9 35%, #e2e8f0 100%)' }}>
      <AppSidebar currentPath="/messages" onSignOut={handleSignOut} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <p className="font-medium text-indigo-600 text-sm uppercase tracking-widest mb-1">Messages</p>
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-3xl font-bold tracking-tight text-slate-900 mb-2">
            Inbox
          </h1>
          <p className="text-slate-500 text-sm mb-8">Course and system messages</p>
          <ul className="space-y-2">
            {CONVOS.map((c) => (
              <li
                key={c.id}
                className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                  c.unread
                    ? 'border-indigo-200/80 bg-indigo-50/50 shadow-sm hover:bg-indigo-50/80'
                    : 'border-slate-200/80 bg-white/90 shadow-sm hover:bg-slate-50/80'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-semibold ${c.unread ? 'text-slate-900' : 'text-slate-700'}`}>{c.name}</span>
                    <span className="text-xs text-slate-500 shrink-0">{c.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{c.role}</p>
                  <p className={`text-sm mt-1 ${c.unread ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>{c.preview}</p>
                </div>
                {c.unread && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-2" />}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
