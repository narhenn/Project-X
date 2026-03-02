'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/AppSidebar';

const LINKS = [
  { label: 'Campus map & directions', href: '#', icon: '🗺️', desc: 'Maps, shuttle times, building codes' },
  { label: 'Student portal', href: '#', icon: '🖥️', desc: 'Enrolment, fees, academic records' },
  { label: 'Library', href: '#', icon: '📚', desc: 'Library catalogue, study rooms, e-resources' },
  { label: 'IT services', href: '#', icon: '🔧', desc: 'Wi‑Fi, email, software, support' },
  { label: 'Careers & attachment', href: '#', icon: '💼', desc: 'Internships, job postings, CV help' },
  { label: 'Student life', href: '#', icon: '🎭', desc: 'Clubs, events, wellness' },
];

export default function InstitutionPage() {
  const router = useRouter();
  const handleSignOut = () => router.push('/');

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(165deg, #f8fafc 0%, #f1f5f9 35%, #e2e8f0 100%)' }}>
      <AppSidebar currentPath="/institution" onSignOut={handleSignOut} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <p className="font-medium text-indigo-600 text-sm uppercase tracking-widest mb-1">Institution</p>
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-3xl font-bold tracking-tight text-slate-900 mb-2">
            Nanyang Technological University Singapore
          </h1>
          <p className="text-slate-500 text-sm mb-8">Quick links and services</p>
          <div className="space-y-3">
            {LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm hover:shadow-md hover:border-indigo-200/80 transition-all duration-200"
              >
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900">{item.label}</div>
                  <div className="text-sm text-slate-500">{item.desc}</div>
                </div>
                <span className="text-slate-400">→</span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
