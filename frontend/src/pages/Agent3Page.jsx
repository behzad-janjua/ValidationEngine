import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import ScoreBar from '../components/ScoreBar'
import { LoadingSpinner } from '../components/LoadingState'
import ErrorBlock from '../components/ErrorBlock'

const VERDICT_CONFIG = {
  launch: { label: 'Launch', bg: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  validate_first: { label: 'Validate First', bg: 'bg-blue-500', light: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
  pivot: { label: 'Pivot', bg: 'bg-amber-500', light: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
  park: { label: 'Park', bg: 'bg-slate-400', light: 'bg-slate-50 border-slate-200', text: 'text-slate-600' },
}

const PRIORITY_BADGE = {
  high: 'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-amber-50 text-amber-600 border-amber-200',
  low: 'bg-slate-50 text-slate-500 border-slate-200',
}

function Section({ title, accent = 'blue', delay = 0, children }) {
  const borders = { blue: 'border-l-blue-400', green: 'border-l-emerald-400', red: 'border-l-red-400', amber: 'border-l-amber-400', slate: 'border-l-slate-300' }
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden opacity-0 animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}>
      <div className={`border-l-4 ${borders[accent]} px-6 py-5`}>
        <h3 className="font-semibold text-slate-900 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  )
}

function Tag({ children, className = '' }) {
  return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded border ${className}`}>{children}</span>
}

function buildAgent3Request(idea, agent2Results) {
  const evaluation = idea?.scores ? {
    feasibility_score: Math.round((idea.scores.feasibility || 0) * 10),
    innovation_score: Math.round((idea.scores.innovation || 0) * 10),
    impact_score: Math.round((idea.scores.impact || 0) * 10),
    marketability_score: Math.round((idea.scores.marketability || 0) * 10),
    clarity_score: Math.round((idea.scores.clarity || 0) * 10),
    clarification_questions: [],
    critique: agent2Results?.critique?.top_risks || [],
  } : null

  const planning = agent2Results ? {
    launch_plan: [
      agent2Results.mvp_plan?.phase_1,
      agent2Results.mvp_plan?.phase_2,
      agent2Results.mvp_plan?.phase_3,
    ].filter(Boolean),
    positioning: agent2Results.positioning_statement || null,
    next_actions: agent2Results.next_actions || [],
    overall_viability: agent2Results.overall_viability || null,
    viability_reason: agent2Results.viability_reason || null,
    top_risks: agent2Results.critique?.top_risks || [],
    ad_copy_suggestions: [],
    content_calendar: [],
    messaging: [],
  } : null

  return {
    idea: {
      title: idea.title,
      description: idea.summary || idea.title,
      target_customer: idea.target_customer || null,
      problem: idea.problem || null,
    },
    evaluation,
    planning,
    constraints: { timeline_days: 14, budget_usd: 500, team_size: 1, risk_tolerance: 'medium' },
  }
}

export default function Agent3Page() {
  const navigate = useNavigate()
  const [results, setResults] = useState(null)
  const [ideaTitle, setIdeaTitle] = useState('')
  const [phase, setPhase] = useState('loading')
  const [error, setError] = useState(null)

  useEffect(() => {
    const storedIdea = sessionStorage.getItem('selectedIdea')
    const storedA2 = sessionStorage.getItem('agent2Results')
    if (!storedIdea) { navigate('/'); return }
    const idea = JSON.parse(storedIdea)
    const a2 = storedA2 ? JSON.parse(storedA2) : null
    setIdeaTitle(idea.title)
    analyze(idea, a2)
  }, [])

  async function analyze(idea, agent2Results) {
    setPhase('loading')
    setError(null)
    try {
      const payload = buildAgent3Request(idea, agent2Results)
      const res = await fetch('/agent3/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Agent 3 error ${res.status}${body ? ': ' + body.slice(0, 200) : ''}`)
      }
      setResults(await res.json())
      setPhase('results')
    } catch (e) {
      setError(e.message)
      setPhase('error')
    }
  }

  const verdict = results ? VERDICT_CONFIG[results.final_recommendation?.verdict] ?? VERDICT_CONFIG.validate_first : null

  return (
    <Layout>
      <div className="space-y-6">
        {/* Back + title */}
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/agent2')}
            className="mt-1 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 btn-press transition-colors duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              {ideaTitle || 'Market & Growth Analysis'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">GTM strategy, growth experiments &amp; launch readiness</p>
          </div>
        </div>

        {phase === 'loading' && (
          <div className="flex items-center gap-3 py-16 justify-center animate-fade-in">
            <LoadingSpinner />
            <span className="text-slate-500 text-sm font-medium">Running market analysis…</span>
          </div>
        )}

        {phase === 'error' && <ErrorBlock message={error} />}

        {phase === 'results' && results && (
          <div className="space-y-4">
            {/* Final Recommendation — hero */}
            {verdict && (
              <div className={`rounded-xl border p-6 ${verdict.light} opacity-0 animate-fade-up`}
                style={{ animationDelay: '0ms' }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Final Recommendation</p>
                    <div className="flex items-center gap-3">
                      <span className={`text-3xl font-bold ${verdict.text}`}>{verdict.label}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-xl">
                      {results.final_recommendation?.rationale}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">Confidence</span>
                      <span className={`text-xl font-bold tabular-nums ${verdict.text}`}>
                        {results.final_recommendation?.confidence}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">Launch window</span>
                      <span className="text-sm font-semibold text-slate-700">
                        {results.final_recommendation?.launch_window_days} days
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Scorecard */}
            <Section title="Scorecard" accent="blue" delay={60}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                <ScoreBar label="Marketability" score={results.scorecard?.marketability} max={100} />
                <ScoreBar label="Speed to Market" score={results.scorecard?.speed_to_market} max={100} />
                <ScoreBar label="Differentiation" score={results.scorecard?.differentiation} max={100} />
                <ScoreBar label="Distribution Fit" score={results.scorecard?.distribution_fit} max={100} />
                <ScoreBar label="Monetization Confidence" score={results.scorecard?.monetization_confidence} max={100} />
                <ScoreBar label="Risk" score={results.scorecard?.risk} max={100} />
              </div>
              <p className="text-xs text-slate-400 mt-3">Risk score: higher = more launch risk</p>
            </Section>

            {/* Marketability */}
            <Section title="Marketability Check" accent="blue" delay={120}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">Target Customer</p>
                  <p className="text-sm font-semibold text-slate-800">{results.marketability_check?.target_customer}</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">Pain Level</p>
                  <p className="text-sm font-semibold text-slate-800">{results.marketability_check?.pain_level}</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">Market Score</p>
                  <p className="text-sm font-semibold text-slate-800">{results.marketability_check?.score}/100</p>
                </div>
              </div>
              <div className="mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Best Message Angle</p>
                <p className="text-sm text-slate-700 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 italic">
                  "{results.marketability_check?.strongest_message_angle}"
                </p>
              </div>
              {results.marketability_check?.demand_signals?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Demand Signals</p>
                  <ul className="space-y-1">
                    {results.marketability_check.demand_signals.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-600">
                        <span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0 mt-1" />
                {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {results.marketability_check?.adoption_blockers?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Adoption Blockers</p>
                  <ul className="space-y-1">
                    {results.marketability_check.adoption_blockers.map((b, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-600">
                        <span className="w-3 h-3 rounded-full bg-red-400 shrink-0 mt-1" />
                {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>

            {/* Competitors */}
            {results.competitor_scan?.length > 0 && (
              <Section title="Competitor Landscape" accent="slate" delay={180}>
                <div className="space-y-3">
                  {results.competitor_scan.map((c, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-slate-900 text-sm">{c.name}</span>
                        <span className="text-xs text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded">
                          {c.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-1">{c.why_it_matters}</p>
                      <p className="text-xs text-blue-600 font-medium">
                        Opportunity: {c.differentiation_opportunity}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* GTM Channels */}
            {results.gtm_channels?.length > 0 && (
              <Section title="Go-to-Market Channels" accent="blue" delay={240}>
                <div className="space-y-3">
                  {results.gtm_channels.map((ch, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-semibold text-slate-900 text-sm">{ch.name}</span>
                        <Tag className={PRIORITY_BADGE[ch.priority] || PRIORITY_BADGE.medium}>
                          {ch.priority}
                        </Tag>
                        <span className="text-xs text-slate-400 ml-auto">{ch.estimated_effort}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{ch.rationale}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">First Test</p>
                          <p className="text-xs text-slate-700 mt-0.5">{ch.first_test}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Success Metric</p>
                          <p className="text-xs text-slate-700 mt-0.5">{ch.success_metric}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Growth Experiments */}
            {results.growth_experiments?.length > 0 && (
              <Section title="Growth Experiments" accent="amber" delay={300}>
                <div className="space-y-3">
                  {results.growth_experiments.map((exp, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-semibold text-slate-900 text-sm">{exp.name}</span>
                        <Tag className={PRIORITY_BADGE[exp.priority] || PRIORITY_BADGE.medium}>
                          {exp.priority}
                        </Tag>
                        <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
                          <span>{exp.duration_days}d</span>
                          <span>${exp.budget_usd}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 italic mb-2">"{exp.hypothesis}"</p>
                      {exp.steps?.length > 0 && (
                        <ol className="space-y-0.5 mb-2">
                          {exp.steps.map((step, j) => (
                            <li key={j} className="text-xs text-slate-600 flex gap-1.5">
                              <span className="text-slate-300 shrink-0">{j + 1}.</span> {step}
                            </li>
                          ))}
                        </ol>
                      )}
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Success Metric</p>
                          <p className="text-xs text-slate-700 mt-0.5">{exp.success_metric}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Decision Rule</p>
                          <p className="text-xs text-slate-700 mt-0.5">{exp.decision_rule}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Ad Creatives */}
            {results.advertisement_help?.length > 0 && (
              <Section title="Ad Creatives" accent="blue" delay={360}>
                <div className="space-y-3">
                  {results.advertisement_help.map((ad, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg px-4 py-3">
                      <Tag className="bg-blue-50 text-blue-600 border-blue-200 mb-2">{ad.channel}</Tag>
                      <p className="font-semibold text-slate-900 text-sm mb-1">{ad.headline}</p>
                      <p className="text-xs text-slate-500 mb-2">{ad.primary_text}</p>
                      <span className="inline-block bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-lg">
                        {ad.cta}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Marketing Notifications */}
            {results.marketing_notifications?.length > 0 && (
              <Section title="Launch Notification Drafts" accent="green" delay={420}>
                <div className="space-y-4">
                  {results.marketing_notifications.map((n, i) => (
                    <div key={i} className={`rounded-lg border overflow-hidden ${n.channel === 'email' ? 'border-slate-200' : 'border-slate-200'}`}>
                      <div className={`px-4 py-2 flex items-center justify-between ${n.channel === 'email' ? 'bg-slate-50 border-b border-slate-200' : 'bg-slate-50 border-b border-slate-200'}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{n.channel}</span>
                        </div>
                        <span className="text-xs text-slate-400">{n.audience}</span>
                      </div>
                      {n.subject && (
                        <div className="px-4 pt-3">
                          <p className="text-xs text-slate-400 font-medium mb-0.5">Subject</p>
                          <p className="text-sm font-semibold text-slate-900">{n.subject}</p>
                        </div>
                      )}
                      <div className="px-4 py-3">
                        <p className="text-xs text-slate-400 font-medium mb-1">Body</p>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{n.body}</p>
                        <div className="mt-3">
                          <span className="inline-block bg-emerald-600 text-white text-xs font-medium px-3 py-1 rounded-lg">
                            {n.cta}
                          </span>
                        </div>
                      </div>
                      {n.compliance_note && (
                        <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
                          <p className="text-xs text-amber-600">{n.compliance_note}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Reality Check */}
            <Section title="Reality Check" accent="red" delay={480}>
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">Biggest Assumption</p>
                  <p className="text-sm text-slate-700">{results.reality_check?.biggest_assumption}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                  <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">Fastest Validation Test</p>
                  <p className="text-sm text-slate-700">{results.reality_check?.fastest_validation_test}</p>
                </div>
                {results.reality_check?.kill_criteria?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Kill Criteria</p>
                    <ul className="space-y-1.5">
                      {results.reality_check.kill_criteria.map((c, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {results.reality_check?.key_risks?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Key Risks</p>
                    <ul className="space-y-1.5">
                      {results.reality_check.key_risks.map((r, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>

            {/* Next Actions */}
            {results.next_actions?.length > 0 && (
              <Section title="Next Actions" accent="green" delay={540}>
                <ul className="space-y-2">
                  {results.next_actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {action}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Notes */}
            {results.notes?.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 opacity-0 animate-fade-up" style={{ animationDelay: '600ms' }}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Notes</p>
                <ul className="space-y-1">
                  {results.notes.map((note, i) => (
                    <li key={i} className="text-xs text-slate-500">{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
