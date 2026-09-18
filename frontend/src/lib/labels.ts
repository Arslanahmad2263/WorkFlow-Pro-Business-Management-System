export const TASK_STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'in_review', label: 'In review' },
  { value: 'done', label: 'Done' },
] as const

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
] as const

export const PROJECT_STATUSES = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
] as const

export const PROJECT_PRIORITIES = TASK_PRIORITIES

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  employee: 'Employee',
}

export const statusLabel = (value: string) =>
  TASK_STATUSES.find((s) => s.value === value)?.label ?? value
export const projectStatusLabel = (value: string) =>
  PROJECT_STATUSES.find((s) => s.value === value)?.label ?? value
export const priorityLabel = (value: string) =>
  TASK_PRIORITIES.find((p) => p.value === value)?.label ?? value

const STATUS_STYLES: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  in_review: 'bg-amber-100 text-amber-700',
  done: 'bg-emerald-100 text-emerald-700',
  planning: 'bg-slate-100 text-slate-700',
  active: 'bg-blue-100 text-blue-700',
  on_hold: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
}

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-800',
  critical: 'bg-rose-100 text-rose-700',
}

export const statusStyle = (value: string) => STATUS_STYLES[value] ?? STATUS_STYLES.todo
export const priorityStyle = (value: string) => PRIORITY_STYLES[value] ?? PRIORITY_STYLES.medium