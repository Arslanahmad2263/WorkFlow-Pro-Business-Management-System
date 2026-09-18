import { useNavigate } from 'react-router-dom'
import { timeAgo } from '@/lib/format'
import type { ActivityEntry } from '@/lib/types'

const ACTION_LABELS: Record<string, { icon: string; label: string }> = {
  account_created: { icon: '👤', label: 'Account created' },
  project_created: { icon: '📁', label: 'Project created' },
  project_updated: { icon: '✏️', label: 'Project updated' },
  project_completed: { icon: '✅', label: 'Project completed' },
  task_created: { icon: '🗒️', label: 'Task created' },
  task_updated: { icon: '🔀', label: 'Task updated' },
  task_completed: { icon: '🎉', label: 'Task completed' },
  member_added: { icon: '➕', label: 'Member added' },
  member_removed: { icon: '➖', label: 'Member removed' },
}

export function ActivityFeed({ items }: { items: ActivityEntry[] }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">No recent activity.</p>
  }
  return (
    <ol className="space-y-4">
      {items.map((item) => {
        const meta = ACTION_LABELS[item.action] ?? { icon: '•', label: item.action }
        return (
          <li key={item.id} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm">
              {meta.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-700">{item.description}</p>
              <p className="text-xs text-slate-400">
                {item.user__username} · {timeAgo(item.created_at)}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function UpcomingDeadlines({
  items,
}: {
  items: { id: number; title: string; due_date: string; status: string }[]
}) {
  const navigate = useNavigate()
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">No upcoming deadlines.</p>
  }
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.id}>
          <button
            className="flex w-full items-center justify-between gap-3 px-1 py-3 text-left hover:text-brand-600"
            onClick={() => navigate(`/tasks?highlight=${item.id}`)}
          >
            <span className="truncate text-sm text-slate-700">{item.title}</span>
            <span className="shrink-0 text-sm font-medium text-slate-500">
              {timeAgo(item.due_date)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}