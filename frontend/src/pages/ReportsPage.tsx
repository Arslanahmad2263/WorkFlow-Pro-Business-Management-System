import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjectProgress, useTasksReport } from '@/hooks/api'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageLoader } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SectionCard, StatCard } from '@/components/StatCard'
import { priorityLabel, projectStatusLabel, statusLabel } from '@/lib/labels'
import { formatDate } from '@/lib/format'
import type { TaskPriority, TaskStatus, ProjectStatus } from '@/lib/types'

const PRIORITY_KEYS = ['low', 'medium', 'high', 'critical'] as const
const STATUS_KEYS = ['todo', 'in_progress', 'in_review', 'done'] as const

export function ReportsPage() {
  const [days, setDays] = useState(30)
  const tasksReport = useTasksReport(days)
  const progressReport = useProjectProgress()

  if (tasksReport.isLoading && !progressReport.data) {
    return <PageLoader label="Loading reports…" />
  }
  if (tasksReport.isError || progressReport.isError) {
    return <ErrorState error={tasksReport.error ?? progressReport.error} />
  }

  const report = tasksReport.data
  const rows = progressReport.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reports</h2>
          <p className="mt-1 text-sm text-slate-500">Performance overview for the team.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="label !mb-0">Period</label>
          <select
            className="input !w-40"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {[7, 14, 30, 90, 180, 365].map((d) => (
              <option key={d} value={d}>
                Last {d} days
              </option>
            ))}
          </select>
        </div>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label={`Tasks completed (${report.period_days}d)`}
              value={report.completed_tasks}
              icon="✅"
              tone="success"
            />
            <StatCard
              label="Overdue tasks"
              value={report.overdue_tasks}
              icon="⏰"
              tone={report.overdue_tasks > 0 ? 'danger' : 'success'}
              sub="excluding completed"
            />
            <StatCard
              label="Tasks per priority"
              value="4"
              icon="🎯"
              sub="low · medium · high · critical"
            />
            <StatCard label="Active tasks" value="—" icon="🔄" sub="uses average progress" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Completion rate by priority">
              <div className="space-y-4">
                {PRIORITY_KEYS.map((p) => {
                  const rate = report.completion_rate_by_priority[p as TaskPriority]
                  const color =
                    p === 'critical' ? 'danger' : p === 'high' ? 'warning' : p === 'low' ? 'success' : 'primary'
                  return (
                    <div key={p}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-slate-600">{priorityLabel(p)}</span>
                        <span className="font-semibold text-slate-800">{rate}%</span>
                      </div>
                      <ProgressBar value={rate} tone={color} />
                    </div>
                  )
                })}
              </div>
            </SectionCard>

            <SectionCard title="Average progress by status">
              <div className="space-y-4">
                {STATUS_KEYS.map((s) => (
                  <div key={s}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-600">{statusLabel(s)}</span>
                      <span className="font-semibold text-slate-800">
                        {report.avg_progress_by_status[s as TaskStatus]}%
                      </span>
                    </div>
                    <ProgressBar value={report.avg_progress_by_status[s as TaskStatus]} />
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {report.overdue_task_ids.length > 0 && (
            <SectionCard title={`Overdue tasks (${report.overdue_task_ids.length})`}>
              <p className="text-sm text-slate-600">
                There are {report.overdue_task_ids.length} overdue tasks in this period. Use the{' '}
                <Link className="link" to="/tasks?status=">
                  task list
                </Link>{' '}
                to chase them down.
              </p>
            </SectionCard>
          )}
        </>
      )}

      <SectionCard title="Project progress" action={<span className="text-xs text-slate-400">live data</span>}>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No projects yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Project</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Due</th>
                  <th className="px-3 py-2 font-medium">Members</th>
                  <th className="px-3 py-2 font-medium">Tasks</th>
                  <th className="px-3 py-2 font-medium">Overdue</th>
                  <th className="px-3 py-2 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <Link className="font-medium text-slate-800 hover:text-brand-600" to={`/projects/${row.id}`}>
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <Badge className="bg-slate-100 text-slate-600">{projectStatusLabel(row.status as ProjectStatus)}</Badge>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{formatDate(row.due_date)}</td>
                    <td className="px-3 py-3 text-slate-600">{row.member_count}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {row.done_task_count}/{row.task_count}
                    </td>
                    <td className={`px-3 py-3 ${row.overdue_tasks > 0 ? 'font-semibold text-rose-600' : 'text-slate-600'}`}>
                      {row.overdue_tasks}
                    </td>
                    <td className="w-48 px-3 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={row.progress} />
                        <span className="shrink-0 text-xs text-slate-500">{row.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}