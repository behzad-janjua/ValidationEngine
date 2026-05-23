import { useNavigate } from 'react-router-dom'
import ScoreBar from './ScoreBar'

function overallColor(score) {
  if (score >= 8) return 'text-emerald-600'
  if (score >= 6) return 'text-amber-600'
  return 'text-red-500'
}

export default function IdeaCard({ idea, rank, isTop, style }) {
  const navigate = useNavigate()

  function handleClick() {
    sessionStorage.setItem('selectedIdea', JSON.stringify({
      idea_index: idea.ideaIndex ?? idea.idea_index ?? rank,
      title: idea.title,
      scores: {
        feasibility: idea.feasibility,
        innovation: idea.innovation,
        impact: idea.impact,
        marketability: idea.marketability,
        clarity: idea.clarity,
        overall: idea.overall,
      },
      summary: idea.summary,
      target_customer: idea.target_customer ?? null,
      problem: idea.problem ?? null,
    }))
    navigate('/agent2')
  }

  const overall = idea.overall || 0

  return (
    <div
      onClick={handleClick}
      style={style}
      className={`
        group relative bg-white rounded-xl border cursor-pointer
        card-hover
        opacity-0 animate-fade-up
        ${isTop
          ? 'border-amber-300 shadow-md shadow-amber-50/60'
          : 'border-slate-200 shadow-sm'}
      `}
    >
      {isTop && (
        <div className="absolute -top-2.5 left-4 z-10">
          <span className="bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
            #{rank} Top Pick
          </span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          {!isTop && (
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              #{rank}
            </span>
          )}
          <div className={`ml-auto text-2xl font-bold tabular-nums leading-none ${overallColor(overall)}`}>
            {Number.isInteger(overall) ? overall : overall.toFixed(1)}
            <span className="text-xs font-normal text-slate-400 ml-0.5">/10</span>
          </div>
        </div>

        <h3 className="font-semibold text-slate-900 mb-1.5 leading-snug text-[0.95rem]">
          {idea.title}
        </h3>
        <p className="text-sm text-slate-500 mb-4 leading-relaxed line-clamp-2">
          {idea.summary || 'No summary available'}
        </p>

        <div className="space-y-2.5">
          <ScoreBar label="Feasibility" score={idea.feasibility ?? 0} />
          <ScoreBar label="Innovation" score={idea.innovation ?? 0} />
          <ScoreBar label="Impact" score={idea.impact ?? 0} />
          <ScoreBar label="Marketability" score={idea.marketability ?? 0} />
          <ScoreBar label="Clarity" score={idea.clarity ?? 0} />
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-medium text-blue-600">
            Analyze with Agent 2
          </span>
          <svg
            className="w-4 h-4 text-blue-400 transition-transform duration-150 group-hover:translate-x-0.5"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  )
}
