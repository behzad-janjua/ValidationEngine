import { useNavigate } from 'react-router-dom'
import ScoreBar from './ScoreBar'

const SCORE_TOOLTIPS = {
  feasibility: 'How achievable is this idea given current resources, tech, and market conditions?',
  innovation: 'How novel and distinctive is this idea compared to existing solutions?',
  impact: 'How significant could the positive outcome be for users and the market?',
  marketability: 'How easily can this idea be positioned, sold, and communicated to the target audience?',
  clarity: 'How well-defined is the problem, solution, and target customer?',
}

function overallColor(score) {
  if (score >= 8) return 'text-emerald-400'
  if (score >= 6) return 'text-amber-400'
  return 'text-rose-400'
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
        group relative cursor-pointer
        card-hover
        opacity-0 animate-fade-up
        bg-zinc-900 border
        ${isTop
          ? 'border-amber-500/40 shadow-lg shadow-amber-950/30'
          : 'border-zinc-800 hover:border-zinc-700'}
      `}
    >
      {isTop && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-400" />
      )}

      <div className="p-5">
        {/* Rank + score row */}
        <div className="flex items-start justify-between mb-4">
          <span className={`text-xs font-bold font-condensed tracking-widest uppercase ${isTop ? 'text-amber-400' : 'text-zinc-600'}`}>
            #{rank}
          </span>
          <div className="text-right">
            <div
              className={`font-condensed font-bold leading-none tabular-nums ${overallColor(overall)}`}
              style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)' }}
            >
              {Number.isInteger(overall) ? overall : overall.toFixed(1)}
            </div>
            <div className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mt-0.5">/10</div>
          </div>
        </div>

        <h3
          className="font-condensed font-bold text-zinc-100 mb-2 leading-tight break-words"
          style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)' }}
        >
          {idea.title}
        </h3>
        <p className="text-sm text-zinc-500 mb-5 leading-relaxed line-clamp-2">
          {idea.summary || 'No summary available'}
        </p>

        <div className="space-y-2.5">
          <ScoreBar label="Feasibility" score={idea.feasibility ?? 0} tooltip={SCORE_TOOLTIPS.feasibility} />
          <ScoreBar label="Innovation" score={idea.innovation ?? 0} tooltip={SCORE_TOOLTIPS.innovation} />
          <ScoreBar label="Impact" score={idea.impact ?? 0} tooltip={SCORE_TOOLTIPS.impact} />
          <ScoreBar label="Marketability" score={idea.marketability ?? 0} tooltip={SCORE_TOOLTIPS.marketability} />
          <ScoreBar label="Clarity" score={idea.clarity ?? 0} tooltip={SCORE_TOOLTIPS.clarity} />
        </div>

        {/* Persistent CTA — always visible */}
        <div className="mt-5 pt-4 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-600 group-hover:text-amber-400 transition-colors duration-150 uppercase tracking-widest">
            Analyze
          </span>
          <svg
            className="w-4 h-4 text-zinc-700 group-hover:text-amber-400 transition-all duration-150 group-hover:translate-x-0.5"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  )
}
