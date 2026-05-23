import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import Section from '../components/Section'
import { LoadingSpinner } from '../components/LoadingState'
import ErrorBlock from '../components/ErrorBlock'

function ScoreBadge({ label, value }) {
  const color = value >= 8
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    : value >= 6
    ? 'bg-amber-400/10 text-amber-400 border-amber-400/30'
    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'

  return (
    <div className={`flex flex-col items-center px-4 py-2.5 border ${color}`}>
      <span className="text-lg font-bold tabular-nums leading-none font-condensed">{Number(value).toFixed(1)}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5 opacity-60">{label}</span>
    </div>
  )
}

function ViabilityBadge({ level }) {
  const map = {
    High: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    Medium: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
    Low: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  }
  return (
    <span className={`inline-block px-3 py-1 text-sm font-bold border font-condensed uppercase tracking-wide ${map[level] || map.Medium}`}>
      {level} Viability
    </span>
  )
}

function RiskList({ items, label }) {
  if (!items?.length) return null
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">{label}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-zinc-400 bg-zinc-800/50 px-3 py-2">
            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5" />
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
        throw new Error(`Step 2 error ${res.status}${body ? ': ' + body.slice(0, 120) : ''}`)
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Back + title */}
        <div className="flex items-start gap-4 border-b border-zinc-800 pb-8">
          <button
            onClick={() => navigate('/')}
            className="mt-1 flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-200 btn-press transition-colors duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div>
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Step 2</p>
            <h1
              className="font-condensed font-bold text-zinc-100 leading-none"
              style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}
            >
              {idea?.title || 'Plan & Critique'}
            </h1>
            <p className="text-sm text-zinc-500 mt-2">MVP planning, positioning &amp; honest critique</p>
          </div>
        </div>

        {/* Score badges from Step 1 */}
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
          <div className="flex flex-col items-center gap-3 py-16 justify-center animate-fade-in">
            <div className="flex items-center gap-3">
              <LoadingSpinner />
              <span className="text-zinc-400 text-sm font-medium">Building MVP plan &amp; critique…</span>
            </div>
            <p className="text-xs text-zinc-600 max-w-xs text-center leading-relaxed">
              A 3-phase MVP plan, positioning statement, and risk critique are being produced.
            </p>
          </div>
        )}

        {phase === 'error' && <ErrorBlock message={error} onRetry={() => idea && analyze(idea)} />}

        {phase === 'results' && results && (
          <div className="space-y-4">
            <Section title="Viability Assessment" accent="green" delay={0}>
              <ViabilityBadge level={results.overall_viability} />
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{results.viability_reason}</p>
            </Section>

            <Section title="Positioning Statement" accent="blue" delay={60}>
              <blockquote className="border-l-2 border-amber-400/30 pl-4 py-1 text-zinc-300 text-sm leading-relaxed italic">
                {results.positioning_statement}
              </blockquote>
            </Section>

            <Section title="MVP Plan" accent="blue" delay={120}>
              <div className="space-y-3">
                {[
                  { label: 'Phase 1 — Foundation', content: results.mvp_plan?.phase_1 },
                  { label: 'Phase 2 — Validation', content: results.mvp_plan?.phase_2 },
                  { label: 'Phase 3 — Scale', content: results.mvp_plan?.phase_3 },
                ].map((ph, i) => (
                  <div key={i} className="bg-zinc-800/50 px-4 py-3">
                    <p className="text-[10px] font-bold text-amber-400 mb-1 uppercase tracking-widest">{ph.label}</p>
                    <p className="text-sm text-zinc-300 leading-relaxed">{ph.content}</p>
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-800/50 px-4 py-3">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-0.5">Timeline</p>
                    <p className="text-sm font-bold text-zinc-100 font-condensed">{results.mvp_plan?.estimated_timeline}</p>
                  </div>
                  <div className="bg-zinc-800/50 px-4 py-3">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-0.5">Resources needed</p>
                    <p className="text-sm font-bold text-zinc-100 font-condensed">{results.mvp_plan?.key_resources_needed?.length ?? 0} items</p>
                  </div>
                </div>

                {results.mvp_plan?.key_resources_needed?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Key Resources</p>
                    <ul className="space-y-1.5">
                      {results.mvp_plan.key_resources_needed.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                          <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            <Section title="Critique" accent="red" delay={180}>
              <RiskList items={results.critique?.top_risks} label="Top Risks" />
              <RiskList items={results.critique?.weaknesses} label="Weaknesses" />
              <RiskList items={results.critique?.assumptions_to_validate} label="Assumptions to Validate" />
            </Section>

            <Section title="Next Actions" accent="green" delay={240}>
              <ul className="space-y-2">
                {(results.next_actions || []).map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="w-5 h-5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-condensed flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {action}
                  </li>
                ))}
              </ul>
            </Section>

            <div className="pt-2 flex justify-end animate-fade-up" style={{ animationDelay: '300ms' }}>
              <button
                onClick={() => navigate('/agent3')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold btn-press"
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
