'use client';

import { AppSidebar } from './AppSidebar';
import { useRouter } from 'next/navigation';

type PlaceholderPageProps = {
  path: string;
  title: string;
  description?: string;
  icon?: string;
};

export function PlaceholderPage({ path, title, description = 'This section is coming soon.', icon }: PlaceholderPageProps) {
  const router = useRouter();
  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(165deg, #f8fafc 0%, #f1f5f9 35%, #e2e8f0 100%)' }}>
      <AppSidebar currentPath={path} onSignOut={() => router.push('/')} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-12 text-center">
          {icon && <span className="text-5xl mb-4 block">{icon}</span>}
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl font-bold text-slate-900 mb-2">{title}</h1>
          <p className="text-slate-500">{description}</p>
        </div>
      </main>
    </div>
  );
}
