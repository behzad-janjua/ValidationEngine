import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import IdeaCard from '../components/IdeaCard'
import LoadingState from '../components/LoadingState'
import ErrorBlock from '../components/ErrorBlock'

function normalizeRating(r) {
  const idea = { ...r }
  if (r.scores) {
    idea.overall = r.scores.overall ?? r.overall ?? 0
    idea.feasibility = r.scores.feasibility ?? r.feasibility ?? 0
    idea.innovation = r.scores.innovation ?? r.innovation ?? 0
    idea.impact = r.scores.impact ?? r.impact ?? 0
    idea.marketability = r.scores.marketability ?? r.marketability ?? 0
    idea.clarity = r.scores.clarity ?? r.clarity ?? 0
  }
  return idea
}

export default function Agent1Page() {
  const [phase, setPhase] = useState('loading')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const cached = sessionStorage.getItem('agent1Results')
    if (cached) {
      setData(JSON.parse(cached))
      setPhase('results')
      return
    }
    fetchLocal()
  }, [])

  useEffect(() => {
    if (data) sessionStorage.setItem('agent1Results', JSON.stringify(data))
  }, [data])

  async function fetchLocal() {
    setPhase('loading')
    setError(null)
    try {
      const res = await fetch('/api/analyze-local', { method: 'POST' })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Server ${res.status}${body ? ': ' + body.slice(0, 120) : ''}`)
      }
      setData(await res.json())
      setPhase('results')
    } catch (e) {
      setError(e.message)
      setPhase('error')
    }
  }

  async function uploadFile(file) {
    setPhase('loading')
    setError(null)
    const fd = new FormData()
    fd.append('excel', file)
    try {
      const res = await fetch('/api/analyze', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Server ${res.status}`)
      }
      setData(await res.json())
      setPhase('results')
    } catch (e) {
      setError(e.message)
      setPhase('error')
    }
  }

  function reanalyze() {
    sessionStorage.removeItem('agent1Results')
    fetchLocal()
  }

  const ratings = data
    ? (data.analysis.ratings || []).map(normalizeRating).sort((a, b) => (b.overall || 0) - (a.overall || 0))
    : []
  const top3 = ratings.slice(0, 3)
  const rest = ratings.slice(3)

  return (
    <Layout>
      <div className="space-y-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Idea Evaluator</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              AI-scored across feasibility, innovation, impact, marketability &amp; clarity
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={e => e.target.files[0] && uploadFile(e.target.files[0])}
              />
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm cursor-pointer
                hover:border-blue-300 hover:text-blue-600 btn-press transition-[color,border-color] duration-150">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload CSV
              </span>
            </label>
            <button
              onClick={reanalyze}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-700 btn-press"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Re-analyze
            </button>
          </div>
        </div>

        {phase === 'loading' && <LoadingState message="Evaluating your ideas…" />}
        {phase === 'error' && <ErrorBlock message={error} onRetry={fetchLocal} />}

        {phase === 'results' && (
          <>
            {top3.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-base font-semibold text-slate-900">Top Picks</h2>
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Highest scored
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {top3.map((idea, i) => (
                    <IdeaCard
                      key={idea.title + i}
                      idea={idea}
                      rank={i + 1}
                      isTop
                      style={{ animationDelay: `${i * 70}ms` }}
                    />
                  ))}
                </div>
              </section>
            )}

            {rest.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-slate-900 mb-4">All Ideas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rest.map((idea, i) => (
                    <IdeaCard
                      key={idea.title + i}
                      idea={idea}
                      rank={i + 4}
                      isTop={false}
                      style={{ animationDelay: `${i * 55}ms` }}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
