export type Role = 'admin' | 'manager' | 'employee'

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed'
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical'

export type MemberRole = 'manager' | 'member'

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: Role
  is_active: boolean
  date_joined: string
}

export interface UserPayload {
  username: string
  email: string
  first_name?: string
  last_name?: string
  password?: string
  role?: Role
  is_active?: boolean
}

export interface AuthSession {
  user: User
  access: string
  refresh: string
}

export interface ProjectMembership {
  id: number
  project: number
  user: User
  role_in_project: MemberRole
  assigned_at: string
}

export interface Project {
  id: number
  name: string
  description: string
  status: ProjectStatus
  priority: ProjectPriority
  start_date: string | null
  due_date: string | null
  progress: number
  is_overdue: boolean
  task_count: number
  done_task_count: number
  members: ProjectMembership[]
  created_by: number
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface ProjectPayload {
  name: string
  description?: string
  status?: ProjectStatus
  priority?: ProjectPriority
  start_date?: string | null
  due_date?: string | null
}

export interface MemberPayload {
  user_id: number
  role_in_project?: MemberRole
}

export interface Task {
  id: number
  project: number
  project_name: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  estimated_hours: string
  progress: number
  assigned_to: number | null
  assigned_to_name: string | null
  attachment: File | null
  attachment_url: string | null
  created_by: number
  created_by_name: string
  completed_at: string | null
  created_at: string
  updated_at: string
  is_overdue: boolean
}

export interface TaskPayload {
  project: number
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: string | null
  estimated_hours?: number | string
  progress?: number
  assigned_to?: number | null
  attachment?: File | null
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface ApiErrorDetail {
  type?: string
  detail?: string | Record<string, string[]>
}

export interface DashboardSummary {
  projects: {
    total: number
    by_status: Record<ProjectStatus, number>
  }
  tasks: {
    total: number
    by_status: Record<TaskStatus, number>
    overdue: number
    completed_last_7_days: number
  }
  overdue_projects: number
  members: number
  upcoming_deadlines: {
    id: number
    title: string
    due_date: string
    status: TaskStatus
  }[]
  recent_activity: {
    id: number
    action: string
    description: string
    created_at: string
    user__username: string
  }[]
}

export interface TasksReport {
  period_days: number
  completed_tasks: number
  overdue_tasks: number
  overdue_task_ids: number[]
  completion_rate_by_priority: Record<TaskPriority, number>
  avg_progress_by_status: Record<TaskStatus, number>
}

export interface ProjectProgressRow {
  id: number
  name: string
  status: ProjectStatus
  progress: number
  task_count: number
  done_task_count: number
  overdue_tasks: number
  overdue: boolean
  due_date: string | null
  member_count: number
}

export interface ActivityEntry {
  id: number
  action: string
  description: string
  created_at: string
  user__username: string
}

export interface RegisterPayload {
  username: string
  email: string
  first_name: string
  last_name: string
  password: string
  password2: string
}