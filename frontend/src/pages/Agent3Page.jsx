import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import Section from '../components/Section'
import ScoreBar from '../components/ScoreBar'
import { LoadingSpinner } from '../components/LoadingState'
import ErrorBlock from '../components/ErrorBlock'

const VERDICT_CONFIG = {
  launch: { label: 'Launch', light: 'bg-emerald-500/8 border-emerald-500/25', text: 'text-emerald-400' },
  validate_first: { label: 'Validate First', light: 'bg-amber-400/8 border-amber-400/25', text: 'text-amber-400' },
  pivot: { label: 'Pivot', light: 'bg-orange-500/8 border-orange-500/25', text: 'text-orange-400' },
  park: { label: 'Park', light: 'bg-zinc-800/50 border-zinc-700', text: 'text-zinc-400' },
}

const PRIORITY_BADGE = {
  high: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  medium: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
  low: 'bg-zinc-800 text-zinc-500 border-zinc-700',
}

function Tag({ children, className = '' }) {
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 border font-condensed uppercase tracking-widest ${className}`}>
      {children}
    </span>
  )
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

  const verdict = results
    ? VERDICT_CONFIG[results.final_recommendation?.verdict] ?? VERDICT_CONFIG.validate_first
    : null

  return (
    <Layout>
      <div className="space-y-6">
        {/* Back + title */}
        <div className="flex items-start gap-4 border-b border-zinc-800 pb-8">
          <button
            onClick={() => navigate('/agent2')}
            className="mt-1 flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-200 btn-press transition-colors duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div>
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Step 3</p>
            <h1
              className="font-condensed font-bold text-zinc-100 leading-none"
              style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}
            >
              {ideaTitle || 'Market & Growth Analysis'}
            </h1>
            <p className="text-sm text-zinc-500 mt-2">GTM strategy, growth experiments &amp; launch readiness</p>
          </div>
        </div>

        {phase === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-16 justify-center animate-fade-in">
            <div className="flex items-center gap-3">
              <LoadingSpinner />
              <span className="text-zinc-400 text-sm font-medium">Running market analysis…</span>
            </div>
            <p className="text-xs text-zinc-600 max-w-xs text-center leading-relaxed">
              Competitor landscape, GTM channels, growth experiments, and a go/no-go verdict are being synthesized.
            </p>
          </div>
        )}

        {phase === 'error' && <ErrorBlock message={error} />}

        {phase === 'results' && results && (
          <div className="space-y-4">
            {/* Final Recommendation — hero verdict card */}
            {verdict && (
              <div
                className={`border p-6 opacity-0 animate-fade-up ${verdict.light}`}
                style={{ animationDelay: '0ms' }}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-3">
                  Final Recommendation
                </p>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <span
                      className={`font-condensed font-bold uppercase tracking-tight ${verdict.text}`}
                      style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', lineHeight: 1 }}
                    >
                      {verdict.label}
                    </span>
                    <p className="mt-3 text-sm text-zinc-400 leading-relaxed max-w-xl">
                      {results.final_recommendation?.rationale}
                    </p>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end gap-4 sm:gap-2 shrink-0">
                    <div className="text-center sm:text-right">
                      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Confidence</p>
                      <span className={`font-condensed font-bold tabular-nums text-3xl ${verdict.text}`}>
                        {results.final_recommendation?.confidence}%
                      </span>
                    </div>
                    <div className="text-center sm:text-right">
                      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Launch window</p>
                      <span className="text-lg font-bold text-zinc-200 font-condensed">
                        {results.final_recommendation?.launch_window_days}d
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Scorecard */}
            <Section title="Scorecard" accent="blue" delay={60}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                <ScoreBar label="Marketability" score={results.scorecard?.marketability} max={100}
                  tooltip="How strong is the demand signal and message-market fit?" />
                <ScoreBar label="Speed to Market" score={results.scorecard?.speed_to_market} max={100}
                  tooltip="How quickly can an MVP be shipped given current constraints?" />
                <ScoreBar label="Differentiation" score={results.scorecard?.differentiation} max={100}
                  tooltip="How distinct is this idea from direct competitors?" />
                <ScoreBar label="Distribution Fit" score={results.scorecard?.distribution_fit} max={100}
                  tooltip="How well does this idea fit the available distribution channels?" />
                <ScoreBar label="Monetization Confidence" score={results.scorecard?.monetization_confidence} max={100}
                  tooltip="How clear and proven is the path to revenue?" />
                <ScoreBar label="Risk" score={results.scorecard?.risk} max={100}
                  tooltip="Combined launch risk — market, technical, and execution. Higher = more risk." />
              </div>
              <p className="text-[10px] text-zinc-600 mt-3 font-medium">Hover a label for details. Risk: higher score = more launch risk.</p>
            </Section>

            {/* Marketability */}
            <Section title="Marketability Check" accent="blue" delay={120}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <div className="bg-zinc-800/50 px-3 py-2.5">
                  <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-0.5">Target Customer</p>
                  <p className="text-sm font-bold text-zinc-200">{results.marketability_check?.target_customer}</p>
                </div>
                <div className="bg-zinc-800/50 px-3 py-2.5">
                  <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-0.5">Pain Level</p>
                  <p className="text-sm font-bold text-zinc-200">{results.marketability_check?.pain_level}</p>
                </div>
                <div className="bg-zinc-800/50 px-3 py-2.5">
                  <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-0.5">Market Score</p>
                  <p className="text-sm font-bold text-zinc-200 font-condensed">{results.marketability_check?.score}/100</p>
                </div>
              </div>
              <div className="mb-3">
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Strongest Message Angle</p>
                <p className="text-sm text-zinc-300 bg-amber-400/5 border border-amber-400/20 px-4 py-2.5 italic leading-relaxed">
                  "{results.marketability_check?.strongest_message_angle}"
                </p>
              </div>
              {results.marketability_check?.demand_signals?.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Demand Signals</p>
                  <ul className="space-y-1">
                    {results.marketability_check.demand_signals.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-zinc-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {results.marketability_check?.adoption_blockers?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Adoption Blockers</p>
                  <ul className="space-y-1">
                    {results.marketability_check.adoption_blockers.map((b, i) => (
                      <li key={i} className="flex gap-2 text-sm text-zinc-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>

            {results.competitor_scan?.length > 0 && (
              <Section title="Competitor Landscape" accent="slate" delay={180}>
                <div className="space-y-3">
                  {results.competitor_scan.map((c, i) => (
                    <div key={i} className="bg-zinc-800/50 px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-zinc-200 text-sm font-condensed">{c.name}</span>
                        <span className="text-[10px] text-zinc-600 bg-zinc-800 border border-zinc-700 px-2 py-0.5 font-bold uppercase tracking-wide">
                          {c.category}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mb-1 leading-relaxed">{c.why_it_matters}</p>
                      <p className="text-xs text-amber-400 font-semibold">
                        Opportunity: {c.differentiation_opportunity}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {results.gtm_channels?.length > 0 && (
              <Section title="Go-to-Market Channels" accent="blue" delay={240}>
                <div className="space-y-3">
                  {results.gtm_channels.map((ch, i) => (
                    <div key={i} className="bg-zinc-800/50 px-4 py-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-bold text-zinc-200 text-sm font-condensed">{ch.name}</span>
                        <Tag className={PRIORITY_BADGE[ch.priority] || PRIORITY_BADGE.medium}>{ch.priority}</Tag>
                        <span className="text-xs text-zinc-600 ml-auto">{ch.estimated_effort}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mb-2 leading-relaxed">{ch.rationale}</p>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-700/50">
                        <div>
                          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">First Test</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{ch.first_test}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Success Metric</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{ch.success_metric}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {results.growth_experiments?.length > 0 && (
              <Section title="Growth Experiments" accent="amber" delay={300}>
                <div className="space-y-3">
                  {results.growth_experiments.map((exp, i) => (
                    <div key={i} className="bg-zinc-800/50 px-4 py-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-bold text-zinc-200 text-sm font-condensed">{exp.name}</span>
                        <Tag className={PRIORITY_BADGE[exp.priority] || PRIORITY_BADGE.medium}>{exp.priority}</Tag>
                        <div className="ml-auto flex items-center gap-3 text-xs text-zinc-600 font-medium">
                          <span>{exp.duration_days}d</span>
                          <span>${exp.budget_usd}</span>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500 italic mb-2 leading-relaxed">"{exp.hypothesis}"</p>
                      {exp.steps?.length > 0 && (
                        <ol className="space-y-0.5 mb-2">
                          {exp.steps.map((step, j) => (
                            <li key={j} className="text-xs text-zinc-500 flex gap-1.5">
                              <span className="text-zinc-700 shrink-0 tabular-nums">{j + 1}.</span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      )}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-700/50">
                        <div>
                          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Success Metric</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{exp.success_metric}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Decision Rule</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{exp.decision_rule}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {results.advertisement_help?.length > 0 && (
              <Section title="Ad Creatives" accent="blue" delay={360}>
                <div className="space-y-3">
                  {results.advertisement_help.map((ad, i) => (
                    <div key={i} className="bg-zinc-800/50 px-4 py-3">
                      <Tag className="bg-amber-400/10 text-amber-400 border-amber-400/30 mb-2">{ad.channel}</Tag>
                      <p className="font-bold text-zinc-200 text-sm mb-1 font-condensed mt-2">{ad.headline}</p>
                      <p className="text-xs text-zinc-500 mb-3 leading-relaxed">{ad.primary_text}</p>
                      <span className="inline-block bg-amber-400 text-zinc-950 text-xs font-bold px-3 py-1.5">
                        {ad.cta}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {results.marketing_notifications?.length > 0 && (
              <Section title="Launch Notification Drafts" accent="green" delay={420}>
                <div className="space-y-4">
                  {results.marketing_notifications.map((n, i) => (
                    <div key={i} className="border border-zinc-700 overflow-hidden">
                      <div className="px-4 py-2 flex items-center justify-between bg-zinc-800/50 border-b border-zinc-700">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{n.channel}</span>
                        <span className="text-xs text-zinc-600">{n.audience}</span>
                      </div>
                      {n.subject && (
                        <div className="px-4 pt-3">
                          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-0.5">Subject</p>
                          <p className="text-sm font-bold text-zinc-200 font-condensed">{n.subject}</p>
                        </div>
                      )}
                      <div className="px-4 py-3">
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-1">Body</p>
                        <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">{n.body}</p>
                        <div className="mt-3">
                          <span className="inline-block bg-emerald-500 text-zinc-950 text-xs font-bold px-3 py-1.5">
                            {n.cta}
                          </span>
                        </div>
                      </div>
                      {n.compliance_note && (
                        <div className="px-4 py-2 bg-amber-400/5 border-t border-amber-400/20">
                          <p className="text-xs text-amber-400/60 leading-relaxed">{n.compliance_note}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section title="Reality Check" accent="red" delay={480}>
              <div className="space-y-3">
                <div className="bg-rose-500/5 border border-rose-500/20 px-4 py-3">
                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Biggest Assumption</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{results.reality_check?.biggest_assumption}</p>
                </div>
                <div className="bg-amber-400/5 border border-amber-400/20 px-4 py-3">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Fastest Validation Test</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{results.reality_check?.fastest_validation_test}</p>
                </div>
                {results.reality_check?.kill_criteria?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Kill Criteria</p>
                    <ul className="space-y-1.5">
                      {results.reality_check.kill_criteria.map((c, i) => (
                        <li key={i} className="flex gap-2 text-sm text-zinc-400 bg-zinc-800/50 px-3 py-2">
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {results.reality_check?.key_risks?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Key Risks</p>
                    <ul className="space-y-1.5">
                      {results.reality_check.key_risks.map((r, i) => (
                        <li key={i} className="flex gap-2 text-sm text-zinc-400 bg-zinc-800/50 px-3 py-2">
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>

            {results.next_actions?.length > 0 && (
              <Section title="Next Actions" accent="green" delay={540}>
                <ul className="space-y-2">
                  {results.next_actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <span className="w-5 h-5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-condensed flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {action}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {results.notes?.length > 0 && (
              <div
                className="bg-zinc-900 border border-zinc-800 px-5 py-4 opacity-0 animate-fade-up"
                style={{ animationDelay: '600ms' }}
              >
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Notes</p>
                <ul className="space-y-1">
                  {results.notes.map((note, i) => (
                    <li key={i} className="text-xs text-zinc-600 leading-relaxed">{note}</li>
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
