import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  useActiveUsers,
  useCreateTask,
  useDeleteTask,
  useProjects,
  useTasks,
  useUpdateTask,
} from '@/hooks/api'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageLoader } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { priorityStyle, statusLabel, statusStyle, TASK_PRIORITIES, TASK_STATUSES } from '@/lib/labels'
import { formatDate } from '@/lib/format'
import { extractErrorMessage } from '@/lib/api'
import { useRole } from '@/contexts/AuthContext'
import type { Task, TaskPayload } from '@/lib/types'

export function TasksPage() {
  const { user, isManager } = useRole()
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(
    () => ({
      status: searchParams.get('status') ?? undefined,
      priority: searchParams.get('priority') ?? undefined,
      project: searchParams.get('project') ?? undefined,
      assigned_to: searchParams.get('assigned_to') ?? undefined,
      search: searchParams.get('search') ?? undefined,
    }),
    [searchParams],
  )

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error, refetch } =
    useTasks(filters)
  const { data: projectsData } = useProjects({ page_size: 100 })
  const { data: activeUsers } = useActiveUsers()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const highlightId = Number(searchParams.get('highlight') ?? '0')
  const [editing, setEditing] = useState<Task | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Task | null>(null)
  const [formError, setFormError] = useState('')

  const allTasks = useMemo(() => data?.pages.flatMap((p) => p.results) ?? [], [data])

  const editOpen = Boolean(editing) || creating

  const handleOpen = (task: Task) => {
    setFormError('')
    setEditing(task)
  }

  const updateStatusQuick = async (task: Task, status: string) => {
    try {
      await updateTask.mutateAsync({ id: task.id, payload: { status: status as TaskPayload['status'] } })
    } catch (err) {
      setFormError(extractErrorMessage(err))
    }
  }

  if (isLoading) return <PageLoader label="Loading tasks…" />
  if (isError || !data) return <ErrorState error={error} onRetry={() => refetch()} />

  const goto = (params: Record<string, string>) => {
    const next = new URLSearchParams(params)
    Object.entries(params).forEach(([k, v]) => {
      if (!v) next.delete(k)
      else next.set(k, v)
    })
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tasks</h2>
          <p className="mt-1 text-sm text-slate-500">
            {data.pages[0]?.count ?? 0} tasks · {user?.full_name || user?.username}
          </p>
        </div>
        {isManager && (
          <button
            className="btn-primary"
            onClick={() => {
              setFormError('')
              setEditing(null)
              setCreating(true)
            }}
          >
            + New task
          </button>
        )}
      </div>

      <div className="card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={filters.status ?? ''}
              onChange={(e) => goto({ status: e.target.value })}
            >
              <option value="">All statuses</option>
              {TASK_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select
              className="input"
              value={filters.priority ?? ''}
              onChange={(e) => goto({ priority: e.target.value })}
            >
              <option value="">All priorities</option>
              {TASK_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Project</label>
            <select
              className="input"
              value={filters.project ?? ''}
              onChange={(e) => goto({ project: e.target.value })}
            >
              <option value="">All projects</option>
              {(projectsData?.results ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Assignee</label>
            <select
              className="input"
              value={filters.assigned_to ?? ''}
              onChange={(e) => goto({ assigned_to: e.target.value })}
            >
              <option value="">Everyone</option>
              {(activeUsers ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.username}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Search</label>
            <input
              className="input"
              placeholder="Search title…"
              defaultValue={searchParams.get('search') ?? ''}
              onKeyDown={(e) => {
                if (e.key === 'Enter') goto({ search: (e.target as HTMLInputElement).value })
              }}
            />
          </div>
        </div>
      </div>

      {allTasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description="Try adjusting the filters, or create a new task."
          action={isManager ? <button className="btn-primary" onClick={() => setCreating(true)}>+ New task</button> : undefined}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Task</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Assignee</th>
                  <th className="px-4 py-3 font-medium">Due date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allTasks.map((task) => {
                  const mine = task.assigned_to === user?.id && !isManager
                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-slate-50 ${highlightId === task.id ? 'bg-brand-50' : ''}`}
                    >
                      <td className="max-w-xs px-4 py-3">
                        <button className="text-left font-medium text-slate-800 hover:text-brand-600" onClick={() => handleOpen(task)}>
                          <span className="line-clamp-1">{task.title}</span>
                        </button>
                        <Badge className={`mt-1 ${priorityStyle(task.priority)}`}>{task.priority}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{task.project_name}</td>
                      <td className="px-4 py-3 text-slate-600">{task.assigned_to_name ?? '—'}</td>
                      <td className={`px-4 py-3 ${task.is_overdue ? 'font-semibold text-rose-600' : 'text-slate-600'}`}>
                        {formatDate(task.due_date)}
                      </td>
                      <td className="px-4 py-3">
                        {mine ? (
                          <select
                            className="input !w-auto !py-1 !text-xs"
                            value={task.status}
                            onChange={(e) => updateStatusQuick(task, e.target.value)}
                          >
                            {TASK_STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge className={statusStyle(task.status)}>{statusLabel(task.status)}</Badge>
                        )}
                      </td>
                      <td className="w-40 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={task.progress} />
                          <span className="shrink-0 text-xs text-slate-500">{task.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="link text-xs" onClick={() => handleOpen(task)}>
                          {mine ? 'Update' : 'View'}
                        </button>
                        {isManager && (
                          <button
                            className="ml-3 text-xs text-rose-600 hover:underline"
                            onClick={() => setDeleting(task)}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {hasNextPage && (
            <div className="border-t border-slate-100 p-4 text-center">
              <button className="btn-secondary" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete task"
        message={`Delete "${deleting?.title}"? This cannot be undone.`}
        confirmLabel="Delete task"
        onConfirm={() => {
          if (deleting) {
            setDeleting(null)
            deleteTask.mutate(deleting.id)
          }
        }}
        onCancel={() => setDeleting(null)}
        busy={deleteTask.isPending}
      />

      <TaskFormModal
        open={editOpen}
        onClose={() => {
          setEditing(null)
          setCreating(false)
        }}
        task={editing}
        title={editing ? `Edit: ${editing.title}` : 'New task'}
        saveLabel={editing ? 'Save changes' : 'Create task'}
        onSubmit={async (payload) => {
          setFormError('')
          try {
            if (editing) {
              await updateTask.mutateAsync({ id: editing.id, payload })
            } else {
              await createTask.mutateAsync(payload)
            }
            setEditing(null)
            setCreating(false)
          } catch (err) {
            setFormError(extractErrorMessage(err))
          }
        }}
        busy={createTask.isPending || updateTask.isPending}
        error={formError}
      />
    </div>
  )
}