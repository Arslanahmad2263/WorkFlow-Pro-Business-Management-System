import http from './api'
import type {
  AuthSession,
  DashboardSummary,
  MemberPayload,
  Paginated,
  Project,
  ProjectPayload,
  ProjectProgressRow,
  RegisterPayload,
  Task,
  TaskPayload,
  TasksReport,
  User,
  UserPayload,
} from './types'

export const authApi = {
  register: (payload: RegisterPayload) =>
    http.post<AuthSession>('/auth/register/', payload).then((r) => r.data),
  login: (username: string, password: string) =>
    http.post<AuthSession>('/auth/login/', { username, password }).then((r) => r.data),
  logout: (refresh: string) =>
    http.post('/auth/logout/', { refresh }).then((r) => r.data),
  me: () => http.get<User>('/auth/me/').then((r) => r.data),
}

export const projectsApi = {
  list: (params: Record<string, string | number | undefined>) =>
    http.get<Paginated<Project>>('/projects/', { params }).then((r) => r.data),
  detail: (id: number) => http.get<Project>(`/projects/${id}/`).then((r) => r.data),
  create: (payload: ProjectPayload) =>
    http.post<Project>('/projects/', payload).then((r) => r.data),
  update: (id: number, payload: Partial<ProjectPayload>) =>
    http.patch<Project>(`/projects/${id}/`, payload).then((r) => r.data),
  remove: (id: number) => http.delete(`/projects/${id}/`).then((r) => r.data),
  addMember: (projectId: number, payload: MemberPayload) =>
    http.post<unknown>(`/projects/${projectId}/members/`, payload).then((r) => r.data),
  removeMember: (projectId: number, userId: number) =>
    http.delete(`/projects/${projectId}/members/${userId}/`).then((r) => r.data),
}

export const tasksApi = {
  list: (params: Record<string, string | number | undefined>) =>
    http.get<Paginated<Task>>('/tasks/', { params }).then((r) => r.data),
  detail: (id: number) => http.get<Task>(`/tasks/${id}/`).then((r) => r.data),
  create: (payload: TaskPayload) => {
    const form = buildTaskForm(payload)
    return http.post<Task>('/tasks/', form, formHeaders()).then((r) => r.data)
  },
  update: (id: number, payload: Partial<TaskPayload>) => {
    const form = buildTaskForm(payload)
    return http.patch<Task>(`/tasks/${id}/`, form, formHeaders()).then((r) => r.data)
  },
  remove: (id: number) => http.delete(`/tasks/${id}/`).then((r) => r.data),
}

function buildTaskForm(payload: Partial<TaskPayload>): FormData {
  const form = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (key === 'attachment') {
      if (value instanceof File) form.append(key, value)
      return
    }
    form.append(key, String(value))
  })
  return form
}

function formHeaders(): Record<string, string> {
  return { 'Content-Type': 'multipart/form-data' }
}

export const teamApi = {
  list: () => http.get<Paginated<User>>('/auth/users/').then((r) => r.data),
  active: () =>
    http.get<User[]>('/auth/users/active/').then((r) => r.data),
  create: (payload: UserPayload) =>
    http.post<User>('/auth/users/', payload).then((r) => r.data),
  update: (id: number, payload: Partial<UserPayload>) =>
    http.patch<User>(`/auth/users/${id}/`, payload).then((r) => r.data),
  remove: (id: number) => http.delete(`/auth/users/${id}/`).then((r) => r.data),
}

export const reportsApi = {
  dashboard: () => http.get<DashboardSummary>('/dashboard/summary/').then((r) => r.data),
  tasks: (days: number) =>
    http.get<TasksReport>('/reports/tasks/', { params: { days } }).then((r) => r.data),
  projectProgress: () =>
    http.get<ProjectProgressRow[]>('/reports/project-progress/').then((r) => r.data),
}