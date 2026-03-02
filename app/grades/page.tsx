'use client';

import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/AppSidebar';

const GRADES = [
  { course: 'Introduction to Databases', code: 'CZ2007', item: 'Assignment 1', score: '18', max: '20', grade: 'A', released: true },
  { course: 'Introduction to Databases', code: 'CZ2007', item: 'Quiz 1', score: '8', max: '10', grade: 'B+', released: true },
  { course: 'Computer Security', code: 'SC0001', item: 'Lab 1', score: '—', max: '10', grade: '—', released: false },
  { course: 'Software Security', code: 'SC0002', item: 'Assignment 1', score: '22', max: '25', grade: 'A', released: true },
  { course: 'Sustainability: SOC, ECON, ENV', code: 'CC0006', item: 'Reflection', score: '—', max: '15', grade: '—', released: false },
];

export default function GradesPage() {
  const router = useRouter();
  const handleSignOut = () => router.push('/');

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(165deg, #f8fafc 0%, #f1f5f9 35%, #e2e8f0 100%)' }}>
      <AppSidebar currentPath="/grades" onSignOut={handleSignOut} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="font-medium text-indigo-600 text-sm uppercase tracking-widest mb-1">Grades</p>
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-3xl font-bold tracking-tight text-slate-900 mb-2">
            My grades
          </h1>
          <p className="text-slate-500 text-sm mb-8">Assessment results by course</p>
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Course</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Item</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Score</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Grade</th>
                </tr>
              </thead>
              <tbody>
                {GRADES.map((g, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{g.course}</div>
                      <div className="text-xs text-slate-500">{g.code}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{g.item}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">{g.score}{g.max !== '—' ? ` / ${g.max}` : ''}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-sm font-semibold ${
                        g.grade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                        g.grade === 'B+' ? 'bg-blue-100 text-blue-800' :
                        g.grade === '—' ? 'bg-slate-100 text-slate-500' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {g.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
