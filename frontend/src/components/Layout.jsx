import { useLocation } from 'react-router-dom'

const STEPS = [
  { path: '/', label: 'Evaluate', step: 1 },
  { path: '/agent2', label: 'Plan', step: 2 },
  { path: '/agent3', label: 'Launch', step: 3 },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="block w-[3px] h-5 bg-amber-400 flex-shrink-0" />
      <span className="font-condensed font-bold text-zinc-100 tracking-tight text-xl uppercase leading-none">
        IdeaForge
      </span>
    </div>
  )
}

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((s, i) => {
        const done = currentStep > s.step
        const active = currentStep === s.step
        return (
          <div key={s.step} className="flex items-center gap-1.5">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 flex items-center justify-center text-xs font-bold font-condensed
                  transition-all duration-200
                  ${done
                    ? 'bg-emerald-500 text-zinc-950'
                    : active
                    ? 'bg-amber-400 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  }`}
              >
                {done
                  ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  : s.step}
              </div>
              <span className={`text-xs font-semibold hidden sm:block tracking-wide transition-colors duration-200
                ${active ? 'text-zinc-100' : done ? 'text-emerald-500' : 'text-zinc-600'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-px mx-0.5 transition-colors duration-200 ${done ? 'bg-emerald-500/40' : 'bg-zinc-800'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function Layout({ children }) {
  const location = useLocation()
  const currentStep = STEPS.find(s => s.path === location.pathname)?.step ?? 1

  return (
    <div className="min-h-screen bg-[oklch(10%_0.01_255)] font-sans">
      <header className="bg-[oklch(12%_0.012_255)] border-b border-zinc-800/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <Logo />
          <StepIndicator currentStep={currentStep} />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-5 py-10">
        {children}
      </main>
    </div>
  )
}
