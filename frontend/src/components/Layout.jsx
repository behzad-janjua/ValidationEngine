import { useLocation } from 'react-router-dom'

const STEPS = [
  { path: '/', label: 'Evaluate', step: 1 },
  { path: '/agent2', label: 'Plan', step: 2 },
  { path: '/agent3', label: 'Launch', step: 3 },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
            d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <span className="font-semibold text-slate-900 tracking-tight">IdeaForge</span>
    </div>
  )
}

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => {
        const done = currentStep > s.step
        const active = currentStep === s.step
        return (
          <div key={s.step} className="flex items-center gap-1">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold
                  transition-colors duration-200
                  ${done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
              >
                {done
                  ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  : s.step}
              </div>
              <span className={`text-sm font-medium hidden sm:block transition-colors duration-200
                ${active ? 'text-slate-900' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-px mx-0.5 transition-colors duration-200 ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />
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
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <Logo />
          <StepIndicator currentStep={currentStep} />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-5 py-8">
        {children}
      </main>
    </div>
  )
}
