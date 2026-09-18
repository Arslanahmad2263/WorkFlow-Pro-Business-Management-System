import { useNavigate } from 'react-router-dom'
import { useDashboard } from '@/hooks/api'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageLoader } from '@/components/ui/Spinner'
import { StatCard, SectionCard } from '@/components/StatCard'
import { ActivityFeed, UpcomingDeadlines } from '@/components/ActivityFeed'
import { ProjectStatusBar } from '@/components/projects/ProjectStatusBar'
import { statusLabel } from '@/lib/labels'
import { useRole } from '@/contexts/AuthContext'

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboard()
  const { isManager } = useRole()
  const navigate = useNavigate()

  if (isLoading) return <PageLoader label="Loading dashboard…" />
  if (isError || !data) return <ErrorState error={error} onRetry={() => refetch()} />

  const tasks = data.tasks
  const donePct = tasks.total ? Math.round((tasks.by_status.done / tasks.total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
          <p className="mt-1 text-sm text-slate-500">
            A quick overview of your projects, tasks and team activity.
          </p>
        </div>
        {isManager && (
          <button className="btn-primary" onClick={() => navigate('/projects?new=1')}>
            + New project
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Projects" value={data.projects.total} icon="📁" sub={`${data.projects.by_status.active} active`} tone="brand" />
        <StatCard label="Tasks" value={tasks.total} icon="🗒️" sub={`${donePct}% done`} />
        <StatCard
          label="Due date overdue"
          value={tasks.overdue + data.overdue_projects}
          icon="⏰"
          sub={`${tasks.overdue} tasks · ${data.overdue_projects} projects`}
          tone={tasks.overdue + data.overdue_projects > 0 ? 'danger' : 'success'}
        />
        <StatCard label="Team members" value={data.members} icon="👥" sub={`${tasks.completed_last_7_days} tasks completed in 7 days`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProjectStatusBar byStatus={data.projects.by_status} total={data.projects.total} />
        <SectionCard title="Task status" action={<span className="text-xs text-slate-400">Overall progress</span>}>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full bg-emerald-500" style={{ width: `${donePct}%` }} />
            </div>
            <span className="text-sm font-semibold text-slate-700">{donePct}%</span>
          </div>
          <dl className="divide-y divide-slate-100">
            {Object.entries(tasks.by_status).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between py-2 text-sm">
                <dt className="text-slate-600">{statusLabel(status)}</dt>
                <dd className="font-semibold text-slate-800">{count}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Upcoming deadlines">
          <UpcomingDeadlines items={data.upcoming_deadlines} />
        </SectionCard>
        <SectionCard title="Recent activity">
          <ActivityFeed items={data.recent_activity} />
        </SectionCard>
      </div>
    </div>
  )
}