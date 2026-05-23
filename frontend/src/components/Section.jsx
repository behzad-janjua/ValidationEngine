/**
 * Shared Section card for Agent 2 and Agent 3 result views.
 * Uses a top accent strip instead of a left side stripe to signal category.
 * accent: 'blue' | 'green' | 'red' | 'amber' | 'slate'
 */

const TOP_ACCENTS = {
  blue: 'bg-amber-400',
  green: 'bg-emerald-400',
  red: 'bg-rose-400',
  amber: 'bg-amber-400',
  slate: 'bg-zinc-600',
}

const TITLE_COLORS = {
  blue: 'text-amber-400',
  green: 'text-emerald-400',
  red: 'text-rose-400',
  amber: 'text-amber-400',
  slate: 'text-zinc-500',
}

export default function Section({ title, accent = 'blue', delay = 0, children }) {
  return (
    <div
      className="relative bg-zinc-900 border border-zinc-800 opacity-0 animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${TOP_ACCENTS[accent]}`} />
      <div className="px-6 pt-6 pb-5">
        <h3 className={`font-condensed font-bold text-sm uppercase tracking-widest mb-4 ${TITLE_COLORS[accent]}`}>
          {title}
        </h3>
        {children}
      </div>
    </div>
  )
}
