import { FormEvent, useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Select, TextArea, TextInput } from '@/components/ui/Field'
import { PROJECT_PRIORITIES, PROJECT_STATUSES } from '@/lib/labels'
import type { Project, ProjectPayload } from '@/lib/types'
import { Spinner } from '@/components/ui/Spinner'

export function ProjectFormModal({
  open,
  onClose,
  project,
  title,
  saveLabel,
  onSubmit,
  busy,
  error,
}: {
  open: boolean
  onClose: () => void
  project?: Project | null
  title: string
  saveLabel: string
  onSubmit: (payload: ProjectPayload) => void
  busy?: boolean
  error?: string
}) {
  const [form, setForm] = useState<ProjectPayload>({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    start_date: null,
    due_date: null,
  })

  useEffect(() => {
    if (open) {
      setForm({
        name: project?.name ?? '',
        description: project?.description ?? '',
        status: project?.status ?? 'planning',
        priority: project?.priority ?? 'medium',
        start_date: project?.start_date ?? null,
        due_date: project?.due_date ?? null,
      })
    }
  }, [open, project])

  const set = <K extends keyof ProjectPayload>(key: K, value: ProjectPayload[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSubmit({ ...form, start_date: form.start_date || null, due_date: form.due_date || null })
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}
        <TextInput
          label="Project name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          required
          autoFocus
          placeholder="e.g. Mobile App Release"
        />
        <TextArea
          label="Description"
          value={form.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
          placeholder="What is this project about?"
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => set('status', e.target.value as ProjectPayload['status'])}
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Select
            label="Priority"
            value={form.priority}
            onChange={(e) => set('priority', e.target.value as ProjectPayload['priority'])}
          >
            {PROJECT_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label="Start date"
            type="date"
            value={form.start_date ?? ''}
            onChange={(e) => set('start_date', e.target.value || null)}
          />
          <TextInput
            label="Due date"
            type="date"
            value={form.due_date ?? ''}
            onChange={(e) => set('due_date', e.target.value || null)}
          />
        </div>
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