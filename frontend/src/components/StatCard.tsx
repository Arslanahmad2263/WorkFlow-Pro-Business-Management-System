import type { ReactNode } from 'react'
import clsx from 'clsx'

export function StatCard({
  label,
  value,
  icon,
  tone = 'default',
  sub,
}: {
  label: string
  value: ReactNode
  icon?: string
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'brand'
  sub?: string
}) {
  const tones: Record<string, string> = {
    default: 'text-slate-700',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-rose-600',
    brand: 'text-brand-600',
  }
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className={`mt-2 text-2xl font-bold ${tones[tone]}`}>{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('card', className)}>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="font-semibold text-slate-800">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}