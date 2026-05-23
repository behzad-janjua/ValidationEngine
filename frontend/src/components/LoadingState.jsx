export function LoadingSpinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-5 h-5 border-2' : 'w-7 h-7 border-2'
  return (
    <div className={`${s} border-slate-200 border-t-blue-600 rounded-full animate-spin`} />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3"
      style={{ animation: 'pulse 1.6s cubic-bezier(0.4,0,0.6,1) infinite' }}>
      <div className="h-4 bg-slate-100 rounded w-16" />
      <div className="h-5 bg-slate-200 rounded w-3/4" />
      <div className="h-3.5 bg-slate-100 rounded w-full" />
      <div className="h-3.5 bg-slate-100 rounded w-5/6" />
      <div className="space-y-2 pt-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex justify-between items-center gap-3">
            <div className="h-1.5 bg-slate-100 rounded w-20" />
            <div className="flex-1 h-1.5 bg-slate-100 rounded" />
            <div className="h-1.5 bg-slate-100 rounded w-6" />
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
        <span className="text-slate-500 text-sm font-medium">{message}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}
