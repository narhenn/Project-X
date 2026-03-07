'use client';

import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/AppSidebar';

const TOPICS = [
  { title: 'How do I submit an assignment?', answer: 'Go to your course → Assignments → select the assignment and upload your file or use the text editor. Click Submit before the deadline.' },
  { title: 'Where are my grades?', answer: 'Grades are shown in the Grades area and often in the course Gradebook. Some marks are released after moderation.' },
  { title: 'How do I join a study session?', answer: 'Open Communities, find a post that fits your topic and time, and click Join. You can leave the session the same way.' },
  { title: 'Quiz not loading?', answer: 'Check your connection and try again. Quizzes are generated from course content and may take 15–30 seconds to load. If it keeps failing, contact your instructor.' },
  { title: 'Password or login issues', answer: 'Use the “Forgot password” link on the login page, or contact IT Support via the Institution page for account issues.' },
];

export default function AssistPage() {
  const router = useRouter();
  const handleSignOut = () => router.push('/');

  return (
    <div className="min-h-screen flex bg-[linear-gradient(180deg,#05030a_0%,#0a0414_18%,#120722_38%,#090411_60%,#040208_100%)] text-white">
      <AppSidebar currentPath="/assist" onSignOut={handleSignOut} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <p className="font-medium text-violet-300 text-sm uppercase tracking-widest mb-1">Assist</p>
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-3xl font-bold tracking-tight text-white mb-2">
            Help & FAQ
          </h1>
          <p className="text-white/60 text-sm mb-8">Common questions and where to get support</p>
          <div className="space-y-4">
            {TOPICS.map((t, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl border border-white/12 bg-white/[0.06] shadow-sm"
              >
                <h2 className="font-semibold text-white mb-2">{t.title}</h2>
                <p className="text-sm text-white/70 leading-relaxed">{t.answer}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 p-4 rounded-2xl border border-violet-300/25 bg-violet-500/10">
            <p className="font-semibold text-white">Need more help?</p>
            <p className="text-sm text-white/70 mt-1">Use the Institution page to find IT Support, your school office, or student services.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

