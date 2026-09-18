import http from '@/lib/api'
import type { AuthSession, User } from '@/lib/types'

export function toSession(data: AuthSession): AuthSession {
  return data
}

export async function fetchMe(): Promise<User> {
  const { data } = await http.get<User>('/auth/me/')
  return data
}

export { http as apiClient }