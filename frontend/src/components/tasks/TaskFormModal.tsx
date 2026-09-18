import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field'
import { useActiveUsers, useProjects } from '@/hooks/api'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/labels'
import type { Task, TaskPayload } from '@/lib/types'
import { Spinner } from '@/components/ui/Spinner'

const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'pdf', 'txt', 'docx', 'xlsx', 'csv', 'md'])
const MAX_ATTACHMENT_MB = 5

export function TaskFormModal({
  open,
  onClose,
  task,
  fixedProjectId,
  title,
  saveLabel,
  onSubmit,
  busy,
  error,
}: {
  open: boolean
  onClose: () => void
  task?: Task | null
  fixedProjectId?: number
  title: string
  saveLabel: string
  onSubmit: (payload: TaskPayload) => void
  busy?: boolean
  error?: string
}) {
  const { data: projectsData } = useProjects({ page_size: 100 })
  const { data: activeUsers } = useActiveUsers()
  const [form, setForm] = useState<TaskPayload>({
    project: fixedProjectId ?? (task?.project ?? 0),
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    due_date: null,
    estimated_hours: '0',
    progress: 0,
    assigned_to: null,
  })
  const [fileError, setFileError] = useState('')

  useEffect(() => {
    if (open) {
      setFileError('')
      setForm({
        project: fixedProjectId ?? task?.project ?? 0,
        title: task?.title ?? '',
        description: task?.description ?? '',
        status: task?.status ?? 'todo',
        priority: task?.priority ?? 'medium',
        due_date: task?.due_date ?? null,
        estimated_hours: task?.estimated_hours ?? '0',
        progress: task?.progress ?? 0,
        assigned_to: task?.assigned_to ?? null,
      })
    }
  }, [open, task, fixedProjectId])

  const projectMembers = useMemo(() => {
    const project = projectsData?.results.find((p) => p.id === form.project)
    return project?.members ?? []
  }, [projectsData, form.project])

  const options = activeUsers ?? []

  const set = <K extends keyof TaskPayload>(key: K, value: TaskPayload[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const validateFile = (file: File | null): string => {
    if (!file) return ''
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTENSIONS.has(ext)) return `File type ".${ext}" is not allowed.`
    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024)
      return `File exceeds the ${MAX_ATTACHMENT_MB} MB limit.`
    return ''
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const err = validateFile(form.attachment as File | null)
    setFileError(err)
    if (err) return
    if (!form.title.trim()) return
    onSubmit({
      ...form,
      project: form.project,
      due_date: form.due_date || null,
      estimated_hours: form.estimated_hours === '' ? '0' : form.estimated_hours,
      assigned_to: form.assigned_to ?? null,
      attachment: form.attachment ?? undefined,
    })
  }

  return (
    <Modal open={open} title={title} onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}
        <TextInput
          label="Title"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          required
          autoFocus
          placeholder="e.g. Implement REST endpoint for login"
        />
        <TextArea
          label="Description"
          value={form.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Project"
            value={form.project}
            disabled={Boolean(fixedProjectId)}
            onChange={(e) => set('project', Number(e.target.value))}
          >
            <option value="">Select a project…</option>
            {(projectsData?.results ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select
            label="Assignee"
            value={form.assigned_to ?? ''}
            onChange={(e) => set('assigned_to', e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Unassigned</option>
            {options.map((u) => (
              <option key={u.id} value={u.id} disabled={!projectMembers.some((m) => m.user.id === u.id)}>
                {u.full_name || u.username}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => set('status', e.target.value as TaskPayload['status'])}
          >
            {TASK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Select
            label="Priority"
            value={form.priority}
            onChange={(e) => set('priority', e.target.value as TaskPayload['priority'])}
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <TextInput
            label="Due date"
            type="date"
            value={form.due_date ?? ''}
            onChange={(e) => set('due_date', e.target.value || null)}
          />
          <TextInput
            label="Progress (%)"
            type="number"
            min={0}
            max={100}
            value={form.progress}
            onChange={(e) => set('progress', Number(e.target.value))}
          />
          <TextInput
            label="Est. hours"
            type="number"
            min={0}
            step="0.5"
            value={form.estimated_hours}
            onChange={(e) => set('estimated_hours', e.target.value)}
          />
        </div>

        <Field label="Attachment" hint="PNG, JPG, GIF, PDF, TXT, DOCX, XLSX, CSV, MD · max 5 MB">
          <input
            className="input"
            type="file"
            onChange={(e) => set('attachment', e.target.files?.[0] ?? null)}
          />
          {fileError && <p className="mt-1 text-xs text-rose-600">{fileError}</p>}
        </Field>

        <div className="mt-5 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose} disabled={busy} type="button">
            Cancel
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy && <Spinner size="sm" />}
            {saveLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}