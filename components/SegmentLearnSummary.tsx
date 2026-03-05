'use client';

export function SegmentLearnSummary({
  open,
  onClose,
  bullets,
  oneThing,
  mistakesToNote,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  bullets: string[];
  oneThing: string;
  mistakesToNote?: string[];
  loading?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-white mb-1">What you learned</h2>
        <p className="text-slate-400 text-sm mb-4">Quick recap of this segment</p>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-400">
            <div className="h-4 w-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            <span className="text-sm">Generating recap…</span>
          </div>
        ) : (
          <>
            {bullets.length > 0 && (
              <ul className="list-disc list-inside text-slate-200 text-sm space-y-2 mb-4">
                {bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
            {oneThing && (
              <p className="text-indigo-200 text-sm font-medium border-l-2 border-indigo-500 pl-3 py-1 mb-4">
                One thing to remember: {oneThing}
              </p>
            )}
            {mistakesToNote && mistakesToNote.length > 0 && (
              <div className="mb-4 rounded-xl border-2 border-amber-500/60 bg-amber-500/10 p-4 flex gap-2">
                <span className="text-amber-400 flex-shrink-0 mt-0.5" aria-hidden>⚠</span>
                <div className="min-w-0 flex-1">
                  <p className="text-amber-400 font-semibold text-sm mb-2">
                    Mistakes to note — take note of this
                  </p>
                  <ul className="list-disc list-outside pl-5 text-amber-100/95 text-sm space-y-2">
                    {mistakesToNote.map((m, i) => {
                      const bgClass = [
                        'bg-amber-500/25',
                        'bg-rose-500/20',
                        'bg-orange-500/25',
                      ][i % 3];
                      return (
                        <li key={i} className={`rounded-md px-2 py-1.5 ${bgClass}`}>
                          {m}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
