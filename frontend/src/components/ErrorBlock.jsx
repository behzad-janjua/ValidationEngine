export default function ErrorBlock({ message, onRetry }) {
  return (
    <div className="border border-rose-500/20 bg-rose-950/30 p-6 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="w-8 h-8 bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.963-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-condensed font-bold text-rose-400 text-base uppercase tracking-wide mb-1">
            Analysis failed
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {message
              ? message.replace(/^(Server \d+:?|Agent \d+ error \d+:?)\s*/i, '')
              : 'An unexpected error occurred. Please try again.'}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 border border-rose-500/30 text-rose-400 text-sm font-semibold hover:bg-rose-500/10 btn-press transition-colors duration-150"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
