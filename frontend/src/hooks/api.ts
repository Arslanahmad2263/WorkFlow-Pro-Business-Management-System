import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { projectsApi, reportsApi, tasksApi, teamApi } from '@/lib/services'
import type { MemberPayload, ProjectPayload, TaskPayload, UserPayload } from '@/lib/types'

export const queryKeys = {
  projects: 'projects',
  project: (id: number) => ['project', id],
  projectTasks: (id: number) => ['project', id, 'tasks'],
  tasks: 'tasks',
  team: 'team',
  dashboard: 'dashboard',
  tasksReport: (days: number) => ['reports', 'tasks', days],
  projectProgress: 'reports',
}

export function useProjects(filters: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: [queryKeys.projects, filters],
    queryFn: () => projectsApi.list(filters),
  })
}

export function useProject(id: number) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: () => projectsApi.detail(id),
    enabled: Boolean(id),
  })
}

export function useTasks(filters: Record<string, string | number | undefined>) {
  return useInfiniteQuery({
    queryKey: [queryKeys.tasks, filters],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => tasksApi.list({ ...filters, page: pageParam }),
    getNextPageParam: (last) => {
      if (!last.next) return undefined
      const url = new URL(last.next)
      return Number(url.searchParams.get('page')) || undefined
    },
  })
}

export function useDashboard() {
  return useQuery({
    queryKey: [queryKeys.dashboard],
    queryFn: reportsApi.dashboard,
    staleTime: 30_000,
  })
}

export function useTasksReport(days: number) {
  return useQuery({
    queryKey: queryKeys.tasksReport(days),
    queryFn: () => reportsApi.tasks(days),
  })
}

export function useProjectProgress() {
  return useQuery({
    queryKey: [queryKeys.projectProgress, 'progress'],
    queryFn: reportsApi.projectProgress,
  })
}

export function useTeam() {
  return useQuery({
    queryKey: [queryKeys.team],
    queryFn: teamApi.list,
  })
}

export function useActiveUsers() {
  return useQuery({
    queryKey: [queryKeys.team, 'active'],
    queryFn: teamApi.active,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProjectPayload) => projectsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.projects] })
      qc.invalidateQueries({ queryKey: [queryKeys.dashboard] })
    },
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ProjectPayload> }) =>
      projectsApi.update(id, payload),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: [queryKeys.projects] })
      qc.invalidateQueries({ queryKey: queryKeys.project(project.id) })
      qc.invalidateQueries({ queryKey: [queryKeys.dashboard] })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => projectsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.projects] })
      qc.invalidateQueries({ queryKey: [queryKeys.dashboard] })
    },
  })
}

export function useAddMember(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: MemberPayload) => projectsApi.addMember(projectId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.project(projectId) }),
  })
}

export function useRemoveMember(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => projectsApi.removeMember(projectId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.project(projectId) }),
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: TaskPayload) => tasksApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.tasks] })
      qc.invalidateQueries({ queryKey: [queryKeys.projects] })
      qc.invalidateQueries({ queryKey: [queryKeys.dashboard] })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TaskPayload> }) =>
      tasksApi.update(id, payload),
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: [queryKeys.tasks] })
      qc.invalidateQueries({ queryKey: queryKeys.project(task.project) })
      qc.invalidateQueries({ queryKey: [queryKeys.projects] })
      qc.invalidateQueries({ queryKey: [queryKeys.dashboard] })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => tasksApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.tasks] })
      qc.invalidateQueries({ queryKey: [queryKeys.projects] })
      qc.invalidateQueries({ queryKey: [queryKeys.dashboard] })
    },
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UserPayload) => teamApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKeys.team] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<UserPayload> }) =>
      teamApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKeys.team] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => teamApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKeys.team] }),
  })
}