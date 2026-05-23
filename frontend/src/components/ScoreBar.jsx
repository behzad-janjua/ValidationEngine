import { useEffect, useRef } from 'react'

function colorByScore(score, max) {
  const pct = score / max
  if (pct >= 0.8) return { bar: 'bg-emerald-500', text: 'text-emerald-600' }
  if (pct >= 0.6) return { bar: 'bg-amber-400', text: 'text-amber-600' }
  return { bar: 'bg-red-400', text: 'text-red-500' }
}

export default function ScoreBar({ label, score, max = 10 }) {
  const fillRef = useRef(null)
  const pct = Math.min(score / max, 1)
  const colors = colorByScore(score, max)

  useEffect(() => {
    if (!fillRef.current) return
    // Reset to 0 immediately (no transition), then on the next painted frame
    // start the CSS transition to the target — double-rAF ensures a real frame
    // boundary exists between the two style changes so the animation always fires.
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
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide leading-none">{label}</span>
        <span className={`text-xs font-semibold tabular-nums ${colors.text}`}>{score}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          ref={fillRef}
          className={`h-full w-full rounded-full ${colors.bar}`}
          style={{
            transform: 'scaleX(0)',
            transformOrigin: 'left center',
          }}
        />
      </div>
    </div>
  )
}
