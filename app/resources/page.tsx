'use client';

import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/AppSidebar';

const RESOURCES = [
  { title: 'Library e-resources', desc: 'E-journals, e-books, databases', icon: '📚', href: '#' },
  { title: 'Past exam papers', desc: 'Sample papers by course (where available)', icon: '📄', href: '#' },
  { title: 'Style guides & referencing', desc: 'APA, IEEE, academic integrity', icon: '📋', href: '#' },
  { title: 'Software & licenses', desc: 'Microsoft 365, MATLAB, other campus software', icon: '💻', href: '#' },
  { title: 'Tutorial & lab materials', desc: 'Links from your course Resources section', icon: '🔗', href: '#' },
];

export default function ResourcesPage() {
  const router = useRouter();
  const handleSignOut = () => router.push('/');

  return (
    <div className="min-h-screen flex bg-[linear-gradient(180deg,#05030a_0%,#0a0414_18%,#120722_38%,#090411_60%,#040208_100%)] text-white">
      <AppSidebar currentPath="/resources" onSignOut={handleSignOut} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <p className="font-medium text-violet-300 text-sm uppercase tracking-widest mb-1">Resources</p>
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-3xl font-bold tracking-tight text-white mb-2">
            Learning resources
          </h1>
          <p className="text-white/60 text-sm mb-8">Library, past papers, software and course materials</p>
          <div className="space-y-3">
            {RESOURCES.map((r) => (
              <a
                key={r.title}
                href={r.href}
                className="flex items-center gap-4 p-4 rounded-2xl border border-white/12 bg-white/[0.06] shadow-sm hover:shadow-md hover:border-violet-300/25 transition-all duration-200"
              >
                <span className="text-2xl">{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white">{r.title}</div>
                  <div className="text-sm text-white/60">{r.desc}</div>
                </div>
                <span className="text-white/50">→</span>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

