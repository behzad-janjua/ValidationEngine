import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { LoadingSpinner } from '../components/LoadingState'
import ErrorBlock from '../components/ErrorBlock'

function ScoreBadge({ label, value }) {
  const color = value >= 8
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : value >= 6
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-600 border-red-200'

  return (
    <div className={`flex flex-col items-center px-4 py-2.5 rounded-lg border ${color}`}>
      <span className="text-lg font-bold tabular-nums leading-none">{Number(value).toFixed(1)}</span>
      <span className="text-[10px] font-medium uppercase tracking-wider mt-0.5 opacity-70">{label}</span>
    </div>
  )
}

function ViabilityBadge({ level }) {
  const map = {
    High: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    Medium: 'bg-amber-100 text-amber-700 border-amber-300',
    Low: 'bg-red-100 text-red-600 border-red-300',
  }
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${map[level] || map.Medium}`}>
      {level} Viability
    </span>
  )
}

function Section({ title, icon, accent = 'blue', children }) {
  const borders = { blue: 'border-l-blue-400', green: 'border-l-emerald-400', red: 'border-l-red-400', amber: 'border-l-amber-400' }
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden opacity-0 animate-fade-up`}>
      <div className={`border-l-4 ${borders[accent]} px-6 py-5`}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">{icon}</span>
          <h3 className="font-semibold text-slate-900">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  )
}

function RiskList({ items, label }) {
  if (!items?.length) return null
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Agent2Page() {
  const navigate = useNavigate()
  const [idea, setIdea] = useState(null)
  const [results, setResults] = useState(null)
  const [phase, setPhase] = useState('loading')
  const [error, setError] = useState(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('selectedIdea')
    if (!stored) {
      navigate('/')
      return
    }
    const parsed = JSON.parse(stored)
    setIdea(parsed)
    analyze(parsed)
  }, [])

  async function analyze(ideaData) {
    setPhase('loading')
    setError(null)
    try {
      const res = await fetch('/agent2/plan-and-critique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ideaData),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Agent 2 error ${res.status}${body ? ': ' + body.slice(0, 120) : ''}`)
      }
      const data = await res.json()
      setResults(data)
      sessionStorage.setItem('agent2Results', JSON.stringify(data))
      setPhase('results')
    } catch (e) {
      setError(e.message)
      setPhase('error')
    }
  }

  function proceedToAgent3() {
    navigate('/agent3')
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Back + title */}
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/')}
            className="mt-1 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 btn-press transition-colors duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              {idea?.title || 'Plan & Critique'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">MVP planning, positioning &amp; honest critique</p>
          </div>
        </div>

        {/* Score badges */}
        {idea?.scores && (
          <div className="flex flex-wrap gap-2 animate-fade-in">
            <ScoreBadge label="Overall" value={idea.scores.overall} />
            <ScoreBadge label="Feasibility" value={idea.scores.feasibility} />
            <ScoreBadge label="Innovation" value={idea.scores.innovation} />
            <ScoreBadge label="Impact" value={idea.scores.impact} />
            <ScoreBadge label="Marketability" value={idea.scores.marketability} />
            <ScoreBadge label="Clarity" value={idea.scores.clarity} />
          </div>
        )}

        {phase === 'loading' && (
          <div className="flex items-center gap-3 py-16 justify-center animate-fade-in">
            <LoadingSpinner />
            <span className="text-slate-500 text-sm font-medium">Running Agent 2 analysis…</span>
          </div>
        )}

        {phase === 'error' && <ErrorBlock message={error} onRetry={() => idea && analyze(idea)} />}

        {phase === 'results' && results && (
          <div className="space-y-4">
            {/* Viability */}
            <Section title="Viability Assessment" icon="📊" accent="green" style={{ animationDelay: '0ms' }}>
              <ViabilityBadge level={results.overall_viability} />
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{results.viability_reason}</p>
            </Section>

            {/* Positioning */}
            <Section title="Positioning Statement" icon="🎯" accent="blue" style={{ animationDelay: '60ms' }}>
              <blockquote className="border-l-4 border-blue-200 pl-4 py-1 text-slate-700 text-sm leading-relaxed italic">
                {results.positioning_statement}
              </blockquote>
            </Section>

            {/* MVP Plan */}
            <Section title="MVP Plan" icon="🗺️" accent="blue" style={{ animationDelay: '120ms' }}>
              <div className="space-y-3">
                {[
                  { label: 'Phase 1 — Foundation', content: results.mvp_plan?.phase_1 },
                  { label: 'Phase 2 — Validation', content: results.mvp_plan?.phase_2 },
                  { label: 'Phase 3 — Scale', content: results.mvp_plan?.phase_3 },
                ].map((phase, i) => (
                  <div key={i} className="bg-slate-50 rounded-lg px-4 py-3">
                    <p className="text-xs font-semibold text-blue-600 mb-1">{phase.label}</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{phase.content}</p>
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="bg-slate-50 rounded-lg px-4 py-3">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">Timeline</p>
                    <p className="text-sm font-semibold text-slate-900">{results.mvp_plan?.estimated_timeline}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-4 py-3">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">Resources needed</p>
                    <p className="text-sm font-semibold text-slate-900">{results.mvp_plan?.key_resources_needed?.length ?? 0} items</p>
                  </div>
                </div>

                {results.mvp_plan?.key_resources_needed?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Key Resources</p>
                    <ul className="space-y-1.5">
                      {results.mvp_plan.key_resources_needed.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>

            {/* Critique */}
            <Section title="Critique" icon="⚠️" accent="red" style={{ animationDelay: '180ms' }}>
              <RiskList items={results.critique?.top_risks} label="Top Risks" />
              <RiskList items={results.critique?.weaknesses} label="Weaknesses" />
              <RiskList items={results.critique?.assumptions_to_validate} label="Assumptions to Validate" />
            </Section>

            {/* Next Actions */}
            <Section title="Next Actions" icon="✅" accent="green" style={{ animationDelay: '240ms' }}>
              <ul className="space-y-2">
                {(results.next_actions || []).map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {action}
                  </li>
                ))}
              </ul>
            </Section>

            {/* CTA */}
            <div className="pt-2 flex justify-end animate-fade-up" style={{ animationDelay: '300ms' }}>
              <button
                onClick={proceedToAgent3}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-200 btn-press"
              >
                Proceed to Market Analysis
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
