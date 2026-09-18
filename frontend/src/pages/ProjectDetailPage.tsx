import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  useAddMember,
  useCreateTask,
  useDeleteProject,
  useDeleteTask,
  useProject,
  useRemoveMember,
  useTasks,
  useUpdateProject,
  useUpdateTask,
} from '@/hooks/api'
import { useActiveUsers } from '@/hooks/api'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageLoader } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Select } from '@/components/ui/Field'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { ProjectFormModal } from '@/components/projects/ProjectFormModal'
import { priorityStyle, projectStatusLabel, statusLabel, statusStyle } from '@/lib/labels'
import { formatDate, formatDateTime, initials } from '@/lib/format'
import { extractErrorMessage } from '@/lib/api'
import { useRole } from '@/contexts/AuthContext'
import type { ProjectPayload, Task, TaskPayload } from '@/lib/types'

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)
  const navigate = useNavigate()
  const { isManager } = useRole()

  const { data: project, isLoading, isError, error, refetch } = useProject(projectId)
  const { data: tasksData } = useTasks({ project: projectId, page_size: 100 })
  const { data: activeUsers } = useActiveUsers()
  const addMember = useAddMember(projectId)
  const removeMember = useRemoveMember(projectId)
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [editingProject, setEditingProject] = useState(false)
  const [deletingProject, setDeletingProject] = useState(false)
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [memberUser, setMemberUser] = useState('')
  const [memberError, setMemberError] = useState('')
  const [formError, setFormError] = useState('')
  const [creatingTask, setCreatingTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)

  const tasks = tasksData?.pages.flatMap((p) => p.results) ?? []

  if (isLoading) return <PageLoader label="Loading project…" />
  if (isError || !project) return <ErrorState error={error} onRetry={() => refetch()} />

  const members = project.members
  const nonMembers = (activeUsers ?? []).filter((u) => !members.some((m) => m.user.id === u.id))

  const handleAddMember = async () => {
    setMemberError('')
    if (!memberUser) {
      setMemberError('Select a user to add.')
      return
    }
    try {
      await addMember.mutateAsync({ user_id: Number(memberUser) })
      setMemberUser('')
      setAddMemberOpen(false)
    } catch (err) {
      setMemberError(extractErrorMessage(err))
    }
  }

  const submitTask = async (payload: TaskPayload) => {
    setFormError('')
    try {
      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, payload })
      } else {
        await createTask.mutateAsync({ ...payload, project: projectId })
      }
      setEditingTask(null)
      setCreatingTask(false)
    } catch (err) {
      setFormError(extractErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link className="text-sm text-slate-500 hover:text-brand-600" to="/projects">
          ← Back to projects
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-800">{project.name}</h2>
              <Badge className={statusStyle(project.status)}>
                {projectStatusLabel(project.status)}
              </Badge>
              <Badge className={priorityStyle(project.priority)}>{project.priority}</Badge>
              {project.is_overdue && <Badge className="bg-rose-100 text-rose-700">Overdue</Badge>}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Created by {project.created_by_name} · {formatDateTime(project.created_at)}
            </p>
          </div>
          {isManager && (
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setEditingProject(true)}>
                Edit
              </button>
              <button
                className="btn-ghost !text-rose-600 hover:!bg-rose-50"
                onClick={() => setDeletingProject(true)}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <p className="mb-4 text-sm text-slate-600">
          {project.description || 'No description provided.'}
        </p>
        <div className="flex items-center gap-4">
          <div className="w-full max-w-md">
            <ProgressBar value={project.progress} />
          </div>
          <span className="text-sm font-semibold text-slate-700">{project.progress}%</span>
        </div>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Start date</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{formatDate(project.start_date)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Due date</dt>
            <dd className={`mt-0.5 font-medium ${project.is_overdue ? 'text-rose-600' : 'text-slate-800'}`}>
              {formatDate(project.due_date)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Tasks</dt>
            <dd className="mt-0.5 font-medium text-slate-800">
              {project.done_task_count}/{project.task_count} completed
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-slate-800">Team</h3>
            {isManager && (
              <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setAddMemberOpen(true)}>
                + Add member
              </button>
            )}
          </div>
          <ul className="divide-y divide-slate-100 px-5 py-2">
            {members.length === 0 && (
              <li className="py-4 text-sm text-slate-400">No members yet.</li>
            )}
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                    {initials(m.user.full_name || m.user.username)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-700">
                      {m.user.full_name || m.user.username}
                    </p>
                    <p className="text-xs text-slate-400">{m.role_in_project}</p>
                  </div>
                </div>
                {isManager && (
                  <button
                    className="text-xs text-rose-600 hover:underline"
                    disabled={removeMember.isPending}
                    onClick={() => removeMember.mutate(m.user.id)}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-slate-800">Tasks</h3>
            {isManager && (
              <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setCreatingTask(true)}>
                + Add task
              </button>
            )}
          </div>
          {tasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No tasks in this project yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <button className="min-w-0 text-left" onClick={() => setEditingTask(task)}>
                    <p className="truncate text-sm font-medium text-slate-800 hover:text-brand-600">
                      {task.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {task.assigned_to_name ?? 'Unassigned'} · due {formatDate(task.due_date)}
                      {task.is_overdue ? ' · overdue' : ''}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="w-24">
                      <ProgressBar value={task.progress} />
                    </div>
                    <Badge className={statusStyle(task.status)}>{statusLabel(task.status)}</Badge>
                    {isManager && (
                      <button
                        className="text-xs text-rose-600 hover:underline"
                        onClick={() => setDeletingTask(task)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {addMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="font-semibold text-slate-800">Add member</h3>
            {memberError && <p className="mt-2 text-xs text-rose-600">{memberError}</p>}
            <div className="mt-4">
              <Select label="User" value={memberUser} onChange={(e) => setMemberUser(e.target.value)}>
                <option value="">Select a user…</option>
                {nonMembers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.username} ({u.role})
                  </option>
                ))}
              </Select>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setAddMemberOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAddMember} disabled={addMember.isPending}>
                {addMember.isPending ? 'Adding…' : 'Add member'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ProjectFormModal
        open={editingProject}
        onClose={() => setEditingProject(false)}
        project={project}
        title={`Edit ${project.name}`}
        saveLabel="Save changes"
        onSubmit={async (payload: ProjectPayload) => {
          setFormError('')
          try {
            await updateProject.mutateAsync({ id: projectId, payload })
            setEditingProject(false)
          } catch (err) {
            setFormError(extractErrorMessage(err))
          }
        }}
        busy={updateProject.isPending}
        error={formError}
      />

      <TaskFormModal
        open={creatingTask || Boolean(editingTask)}
        onClose={() => {
          setCreatingTask(false)
          setEditingTask(null)
        }}
        task={editingTask}
        fixedProjectId={projectId}
        title={editingTask ? `Edit: ${editingTask.title}` : 'New task'}
        saveLabel={editingTask ? 'Save changes' : 'Create task'}
        onSubmit={submitTask}
        busy={createTask.isPending || updateTask.isPending}
        error={formError}
      />

      <ConfirmDialog
        open={deletingProject}
        title="Delete project"
        message={`Delete "${project.name}"? All tasks and memberships will be removed. This cannot be undone.`}
        confirmLabel="Delete project"
        onConfirm={() => {
          deleteProject.mutate(projectId, { onSuccess: () => navigate('/projects') })
        }}
        onCancel={() => setDeletingProject(false)}
        busy={deleteProject.isPending}
      />

      <ConfirmDialog
        open={Boolean(deletingTask)}
        title="Delete task"
        message={`Delete "${deletingTask?.title}"? This cannot be undone.`}
        confirmLabel="Delete task"
        onConfirm={() => {
          if (deletingTask) deleteTask.mutate(deletingTask.id)
          setDeletingTask(null)
        }}
        onCancel={() => setDeletingTask(null)}
        busy={deleteTask.isPending}
      />
    </div>
  )
}