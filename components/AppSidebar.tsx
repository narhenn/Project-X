'use client';

import Link from 'next/link';

export const SIDEBAR_NAV = [
  { label: 'Institution Page', href: '/institution', icon: '🏛️' },
  { label: 'Activity', href: '/activity', icon: '📊' },
  { label: 'Courses', href: '/course', icon: '🎓' },
  { label: 'Communities', href: '/community', icon: '👥' },
  { label: 'Calendar', href: '/calendar', icon: '📅' },
  { label: 'Messages', href: '/messages', icon: '✉️', badge: 1 },
  { label: 'Grades', href: '/grades', icon: '📝' },
  { label: 'Assist', href: '/assist', icon: '💬' },
  { label: 'Resources', href: '/resources', icon: '📚' },
] as const;

type AppSidebarProps = {
  currentPath: string;
  onSignOut?: () => void;
};

export function AppSidebar({ currentPath, onSignOut }: AppSidebarProps) {
  return (
    <aside className="relative w-64 min-h-screen shrink-0 overflow-hidden border-r border-white/10 bg-[#06030d] text-white backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_380px_at_0%_0%,rgba(139,92,246,0.22),transparent_65%),radial-gradient(500px_340px_at_100%_100%,rgba(59,130,246,0.14),transparent_68%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#090512]/95 via-[#07040f]/97 to-[#040208]/98" />

      <div className="relative z-10 border-b border-white/10 p-5">
        <Link href="/course" className="block group">
          <span className="text-xs font-semibold leading-snug tracking-wide text-white/55 transition-colors group-hover:text-violet-200">
            NANYANG TECHNOLOGICAL UNIVERSITY SINGAPORE
          </span>
        </Link>
      </div>

      <div className="relative z-10 flex items-center gap-3 border-b border-white/10 p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-900/40 ring-2 ring-white/20">
          N
        </div>
        <span className="truncate text-sm font-medium text-white/85">CCDS Narhen</span>
      </div>

      <nav className="relative z-10 flex-1 px-3 py-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 shadow-[0_12px_34px_rgba(7,3,18,0.35)]">
        {SIDEBAR_NAV.map((item) => {
          const active = currentPath === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`mb-1.5 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] transition-all duration-200 ${
                active
                  ? 'bg-gradient-to-r from-violet-500/35 to-indigo-500/30 font-semibold text-white shadow-[0_10px_24px_rgba(76,29,149,0.38)]'
                  : 'text-white/72 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {item.icon && <span className="text-lg opacity-90">{item.icon}</span>}
              <span>{item.label}</span>
              {'badge' in item && item.badge != null && (
                <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center font-medium shadow-sm">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
        </div>
      </nav>

      <div className="relative z-10 space-y-1.5 border-t border-white/10 p-4">
        <button
          type="button"
          onClick={onSignOut}
          className="block text-sm text-white/65 transition-colors hover:text-white"
        >
          Sign Out
        </button>
        {['Privacy', 'Terms', 'Accessibility'].map((label) => (
          <a key={label} href="#" className="block text-sm text-white/65 transition-colors hover:text-white">
            {label}
          </a>
        ))}
      </div>
    </aside>
  );
}

