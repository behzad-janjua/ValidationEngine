export function LoadingSpinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4 border-2' : 'w-6 h-6 border-2'
  return (
    <div className={`${s} border-zinc-700 border-t-amber-400 rounded-full animate-spin`} />
  )
}

function SkeletonBlock({ className = '' }) {
  return (
    <div
      className={`bg-zinc-800/60 ${className}`}
      style={{ animation: 'pulse 1.8s cubic-bezier(0.4,0,0.6,1) infinite' }}
    />
  )
}

function SkeletonCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-5 space-y-4">
      <div className="flex justify-between">
        <SkeletonBlock className="h-3 w-6" />
        <SkeletonBlock className="h-8 w-12" />
      </div>
      <SkeletonBlock className="h-5 w-3/4" />
      <SkeletonBlock className="h-3 w-full" />
      <SkeletonBlock className="h-3 w-5/6" />
      <div className="space-y-2.5 pt-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <SkeletonBlock className="h-2 w-16" />
              <SkeletonBlock className="h-2 w-4" />
            </div>
            <SkeletonBlock className="h-1 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LoadingState({ message = 'Loading…' }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <LoadingSpinner />
        <span className="text-zinc-400 text-sm font-medium">{message}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )
}
