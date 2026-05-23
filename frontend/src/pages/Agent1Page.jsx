import { useState, useEffect, useRef } from 'react'
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

function EmptyState({ onUpload }) {
  return (
    <div className="border border-zinc-800 bg-zinc-900/50 px-8 py-16 text-center animate-fade-in">
      <p className="font-condensed font-bold text-zinc-400 text-xl uppercase tracking-wide mb-2">No ideas found</p>
      <p className="text-sm text-zinc-600 mb-6 max-w-xs mx-auto leading-relaxed">
        The data source returned no scorable ideas. Upload a spreadsheet to analyze your own ideas.
      </p>
      <label className="cursor-pointer">
        <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onUpload} />
        <span className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-amber-400 text-zinc-950 text-sm font-bold cursor-pointer hover:bg-amber-300 btn-press">
          Upload a spreadsheet
        </span>
      </label>
    </div>
  )
}

export default function Agent1Page() {
  const [phase, setPhase] = useState('loading')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  useEffect(() => {
    const cached = sessionStorage.getItem('agent1Results')
    if (cached) {
      setData(JSON.parse(cached))
      setPhase('results')
      return
    }
    fetchLocal()
    return () => abortRef.current?.abort()
  }, [])

  useEffect(() => {
    if (data) sessionStorage.setItem('agent1Results', JSON.stringify(data))
  }, [data])

  async function fetchLocal() {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setPhase('loading')
    setError(null)
    try {
      const res = await fetch('/api/analyze-local', { method: 'POST', signal: controller.signal })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Server ${res.status}${body ? ': ' + body.slice(0, 120) : ''}`)
      }
      setData(await res.json())
      setPhase('results')
    } catch (e) {
      if (e.name === 'AbortError') return
      setError(e.message)
      setPhase('error')
    }
  }

  async function uploadFile(file) {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setPhase('loading')
    setError(null)
    const fd = new FormData()
    fd.append('excel', file)
    try {
      const res = await fetch('/api/analyze', { method: 'POST', body: fd, signal: controller.signal })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Server ${res.status}`)
      }
      setData(await res.json())
      setPhase('results')
    } catch (e) {
      if (e.name === 'AbortError') return
      setError(e.message)
      setPhase('error')
    }
  }

  function reanalyze() {
    sessionStorage.removeItem('agent1Results')
    fetchLocal()
  }

  const isLoading = phase === 'loading'
  const ratings = data
    ? (data.analysis.ratings || []).map(normalizeRating).sort((a, b) => (b.overall || 0) - (a.overall || 0))
    : []
  const top3 = ratings.slice(0, 3)
  const rest = ratings.slice(3)

  return (
    <Layout>
      <div className="space-y-10">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-zinc-800 pb-8">
          <div>
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Step 1</p>
            <h1
              className="font-condensed font-bold text-zinc-100 leading-none"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)' }}
            >
              Idea Evaluator
            </h1>
            <p className="text-sm text-zinc-500 mt-3 max-w-sm leading-relaxed">
              AI-scored across feasibility, innovation, impact, marketability &amp; clarity
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <label className={`cursor-pointer ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  disabled={isLoading}
                  onChange={e => e.target.files[0] && uploadFile(e.target.files[0])}
                />
                <span className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-zinc-700 bg-zinc-900 text-sm font-semibold text-zinc-300 cursor-pointer
                  hover:border-amber-500/40 hover:text-zinc-100 btn-press transition-colors duration-150">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload
                </span>
              </label>
              <button
                onClick={reanalyze}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-400 text-zinc-950 text-sm font-bold hover:bg-amber-300 btn-press disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Re-analyze
              </button>
            </div>
            {/* File format guidance */}
            <p className="text-[10px] text-zinc-700 leading-relaxed max-w-[240px]">
              Upload .xlsx or .csv — one idea per row with title &amp; description columns
            </p>
          </div>
        </div>

        {phase === 'loading' && <LoadingState message="Evaluating your ideas…" />}
        {phase === 'error' && <ErrorBlock message={error} onRetry={fetchLocal} />}

        {phase === 'results' && (
          <>
            {ratings.length === 0 && (
              <EmptyState onUpload={e => e.target.files[0] && uploadFile(e.target.files[0])} />
            )}

            {top3.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="font-condensed font-bold text-zinc-100 text-2xl uppercase tracking-tight">Top Picks</h2>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
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
                <h2 className="font-condensed font-bold text-zinc-100 text-2xl uppercase tracking-tight mb-5">
                  All Ideas
                </h2>
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
