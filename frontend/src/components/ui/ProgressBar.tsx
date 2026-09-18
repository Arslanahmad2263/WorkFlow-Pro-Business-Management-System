export function ProgressBar({
  value,
  tone = 'primary',
}: {
  value: number
  tone?: 'primary' | 'success' | 'warning' | 'danger'
}) {
  const colors: Record<string, string> = {
    primary: 'bg-brand-600',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
  }
  const clamped = Math.max(0, Math.min(100, value))
  const toneColor = clamped >= 100 ? colors.success : clamped >= 70 ? colors.warning : colors[tone]
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className={`h-full rounded-full transition-all ${toneColor}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}