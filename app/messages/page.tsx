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
    <div className="min-h-screen flex bg-[linear-gradient(180deg,#05030a_0%,#0a0414_18%,#120722_38%,#090411_60%,#040208_100%)] text-white">
      <AppSidebar currentPath="/messages" onSignOut={handleSignOut} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <p className="font-medium text-violet-300 text-sm uppercase tracking-widest mb-1">Messages</p>
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-3xl font-bold tracking-tight text-white mb-2">
            Inbox
          </h1>
          <p className="text-white/60 text-sm mb-8">Course and system messages</p>
          <ul className="space-y-2">
            {CONVOS.map((c) => (
              <li
                key={c.id}
                className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                  c.unread
                    ? 'border-violet-300/25 bg-violet-500/10 shadow-sm hover:bg-violet-500/14'
                    : 'border-white/12 bg-white/[0.06] shadow-sm hover:bg-white/[0.06]'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-semibold ${c.unread ? 'text-white' : 'text-white/85'}`}>{c.name}</span>
                    <span className="text-xs text-white/60 shrink-0">{c.time}</span>
                  </div>
                  <p className="text-xs text-white/60 mt-0.5">{c.role}</p>
                  <p className={`text-sm mt-1 ${c.unread ? 'text-white font-medium' : 'text-white/70'}`}>{c.preview}</p>
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

