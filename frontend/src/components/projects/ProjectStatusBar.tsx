import { ProgressBar } from '@/components/ui/ProgressBar'
import { projectStatusLabel } from '@/lib/labels'
import type { ProjectStatus } from '@/lib/types'

const STATUS_COLORS: Record<ProjectStatus, { bar: string; text: string }> = {
  planning: { bar: 'bg-slate-400', text: 'text-slate-600' },
  active: { bar: 'bg-brand-500', text: 'text-brand-600' },
  on_hold: { bar: 'bg-amber-400', text: 'text-amber-600' },
  completed: { bar: 'bg-emerald-500', text: 'text-emerald-600' },
}

export function ProjectStatusBar({
  byStatus,
  total,
}: {
  byStatus: Record<ProjectStatus, number>
  total: number
}) {
  return (
    <div className="card">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-semibold text-slate-800">Projects by status</h2>
      </div>
      <div className="p-5">
        <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full">
          {(['planning', 'active', 'on_hold', 'completed'] as const).map((status) => {
            const count = byStatus[status] ?? 0
            if (!count) return null
            return (
              <div
                key={status}
                className={STATUS_COLORS[status].bar}
                style={{ width: `${(count / (total || 1)) * 100}%` }}
                title={`${projectStatusLabel(status)}: ${count}`}
              />
            )
          })}
        </div>
        <dl className="space-y-2">
          {(['planning', 'active', 'on_hold', 'completed'] as const).map((status) => (
            <div key={status} className="flex items-center justify-between text-sm">
              <dt className="flex items-center gap-2 text-slate-600">
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[status].bar}`} />
                {projectStatusLabel(status)}
              </dt>
              <dd className={`font-semibold ${STATUS_COLORS[status].text}`}>
                {byStatus[status] ?? 0}
              </dd>
            </div>
          ))}
          <div className="border-t border-slate-100 pt-2">
            <ProgressBar value={total ? (byStatus.completed / total) * 100 : 0} tone="success" />
          </div>
        </dl>
      </div>
    </div>
  )
}