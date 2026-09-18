import { extractErrorMessage } from '@/lib/api'

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
      <p className="text-sm font-medium text-rose-700">
        {extractErrorMessage(error) || 'Something went wrong.'}
      </p>
      {onRetry && (
        <button className="btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}