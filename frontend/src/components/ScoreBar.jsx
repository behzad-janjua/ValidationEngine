import { useEffect, useRef } from 'react'

function colorByScore(score, max) {
  const pct = score / max
  if (pct >= 0.8) return { bar: 'bg-emerald-500', text: 'text-emerald-400' }
  if (pct >= 0.6) return { bar: 'bg-amber-400', text: 'text-amber-400' }
  return { bar: 'bg-rose-500', text: 'text-rose-400' }
}

export default function ScoreBar({ label, score, max = 10, tooltip }) {
  const fillRef = useRef(null)
  const pct = Math.min(score / max, 1)
  const colors = colorByScore(score, max)

  useEffect(() => {
    if (!fillRef.current) return
    fillRef.current.style.transition = 'none'
    fillRef.current.style.transform = 'scaleX(0)'
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => {
        if (!fillRef.current) return
        fillRef.current.style.transition = 'transform 600ms cubic-bezier(0.23, 1, 0.32, 1)'
        fillRef.current.style.transform = `scaleX(${pct})`
      })
      return () => cancelAnimationFrame(id2)
    })
    return () => cancelAnimationFrame(id1)
  }, [pct])

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center gap-2">
        <div className="relative group flex items-center gap-1 min-w-0">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide leading-none truncate">
            {label}
          </span>
          {tooltip && (
            <>
              <span className="text-[10px] text-zinc-700 cursor-help leading-none flex-shrink-0">?</span>
              <div className="absolute bottom-full left-0 mb-2 px-2.5 py-2 bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 w-52 hidden group-hover:block z-20 pointer-events-none leading-relaxed shadow-xl">
                {tooltip}
              </div>
            </>
          )}
        </div>
        <span className={`text-xs font-bold tabular-nums font-condensed flex-shrink-0 ${colors.text}`}>
          {max === 100 ? `${score}%` : score}
        </span>
      </div>
      <div className="h-1 bg-zinc-800 overflow-hidden">
        <div
          ref={fillRef}
          className={`h-full w-full ${colors.bar}`}
          style={{ transform: 'scaleX(0)', transformOrigin: 'left center' }}
        />
      </div>
    </div>
  )
}
