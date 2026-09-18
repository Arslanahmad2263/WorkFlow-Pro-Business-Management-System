import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDeleteProject, useCreateProject, useProjects, useUpdateProject } from '@/hooks/api'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageLoader } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ProjectFormModal } from '@/components/projects/ProjectFormModal'
import { priorityStyle, projectStatusLabel, statusStyle, PROJECT_STATUSES } from '@/lib/labels'
import { formatDate } from '@/lib/format'
import { extractErrorMessage } from '@/lib/api'
import { useRole } from '@/contexts/AuthContext'
import type { Project, ProjectPayload } from '@/lib/types'

export function ProjectsPage() {
  const { isManager } = useRole()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = searchParams.get('status') ?? ''
  const page = Number(searchParams.get('page') ?? '1')
  const search = searchParams.get('search') ?? ''

  const { data, isLoading, isError, error, refetch } = useProjects({
    status: statusFilter || undefined,
    search: search || undefined,
    page,
  })
  const createProj = useCreateProject()
  const updateProj = useUpdateProject()
  const deleteProj = useDeleteProject()

  const [modalOpen, setModalOpen] = useState(searchParams.get('new') === '1')
  const [editing, setEditing] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState<Project | null>(null)
  const [formError, setFormError] = useState('')

  const openCreate = () => {
    setEditing(null)
    setFormError('')
    setModalOpen(true)
    setSearchParams({}, { replace: true })
  }

  const submitCreate = async (payload: ProjectPayload) => {
    setFormError('')
    try {
      await createProj.mutateAsync(payload)
      setModalOpen(false)
    } catch (err) {
      setFormError(extractErrorMessage(err))
    }
  }

  if (isLoading) return <PageLoader label="Loading projects…" />
  if (isError || !data) return <ErrorState error={error} onRetry={() => refetch()} />

  const totalPages = Math.max(1, Math.ceil(data.count / 20))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Projects</h2>
          <p className="mt-1 text-sm text-slate-500">{data.count} total</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            className="input !w-64"
            placeholder="Search projects…"
            value={search}
            onChange={(e) =>
              setSearchParams(
                e.target.value ? { search: e.target.value } : {},
                { replace: true },
              )
            }
          />
          {isManager && (
            <button className="btn-primary" onClick={openCreate}>
              + New project
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className={`btn-secondary ${!statusFilter ? 'ring-2 ring-brand-500' : ''}`}
          onClick={() => setSearchParams({}, { replace: true })}
        >
          All
        </button>
        {PROJECT_STATUSES.map((s) => (
          <button
            key={s.value}
            className={`btn-secondary ${statusFilter === s.value ? 'ring-2 ring-brand-500' : ''}`}
            onClick={() => setSearchParams({ status: s.value }, { replace: true })}
          >
            {s.label}
          </button>
        ))}
      </div>

      {data.results.length === 0 ? (
        <EmptyState
          title="No projects found"
          description="Create your first project or adjust the filters."
          action={isManager ? <button className="btn-primary" onClick={openCreate}>+ New project</button> : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.results.map((project) => (
            <div key={project.id} className="card p-5 transition-shadow hover:shadow-md">
              <div className="mb-3 flex items-start justify-between gap-2">
                <button className="text-left" onClick={() => navigate(`/projects/${project.id}`)}>
                  <h3 className="font-semibold text-slate-800 hover:text-brand-600">{project.name}</h3>
                </button>
                <div className="flex shrink-0 gap-1.5">
                  <Badge className={statusStyle(project.status)}>{projectStatusLabel(project.status)}</Badge>
                  <Badge className={priorityStyle(project.priority)}>{project.priority}</Badge>
                </div>
              </div>
              <p className="mb-4 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">
                {project.description || 'No description.'}
              </p>
              <ProgressBar value={project.progress} />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {project.done_task_count}/{project.task_count} tasks done
                </span>
                <span className={project.is_overdue ? 'font-semibold text-rose-600' : ''}>
                  Due {formatDate(project.due_date)}
                  {project.is_overdue ? ' · Overdue' : ''}
                </span>
              </div>
              {isManager && (
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                  <button
                    className="btn-secondary !px-3 !py-1.5 text-xs"
                    onClick={() => {
                      setFormError('')
                      setEditing(project)
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-ghost !px-3 !py-1.5 text-xs !text-rose-600 hover:!bg-rose-50"
                    onClick={() => setDeleting(project)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            className="btn-secondary"
            disabled={page <= 1}
            onClick={() => setSearchParams({ ...statusFilter && { status: statusFilter }, page: String(page - 1) }, { replace: true })}
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setSearchParams({ ...statusFilter && { status: statusFilter }, page: String(page + 1) }, { replace: true })}
          >
            Next
          </button>
        </div>
      )}

      <ProjectFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New project"
        saveLabel="Create project"
        onSubmit={submitCreate}
        busy={createProj.isPending}
        error={formError}
      />

      {editing && (
        <ProjectFormModal
          open={Boolean(editing)}
          onClose={() => setEditing(null)}
          project={editing}
          title={`Edit ${editing.name}`}
          saveLabel="Save changes"
          onSubmit={async (payload) => {
            setFormError('')
            try {
              await updateProj.mutateAsync({ id: editing.id, payload })
              setEditing(null)
            } catch (err) {
              setFormError(extractErrorMessage(err))
            }
          }}
          busy={updateProj.isPending}
          error={formError}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete project"
        message={`Delete "${deleting?.name}"? All tasks and memberships will be removed. This cannot be undone.`}
        confirmLabel="Delete project"
        onConfirm={() => {
          if (deleting) {
            deleteProj.mutateAsync(deleting.id).then(() => setDeleting(null))
          }
        }}
        onCancel={() => setDeleting(null)}
        busy={deleteProj.isPending}
      />
    </div>
  )
}