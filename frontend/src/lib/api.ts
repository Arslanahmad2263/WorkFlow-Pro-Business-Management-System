import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios'
import { tokenStore } from './tokenStore'

const baseURL = (import.meta.env.VITE_API_URL as string | undefined) || '/api'

const http: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export type ApiErrorData = {
  type?: string
  detail?: string | Record<string, string[]>
}

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = (error as AxiosError<ApiErrorData>).response?.data
    if (data) {
      const detail = data.detail
      if (typeof detail === 'string') return detail
      if (detail && typeof detail === 'object') {
        const first = Object.values(detail).flat()[0]
        if (first) return first
      }
      if (typeof data.type === 'string' && typeof detail === 'string') return detail
      if (Array.isArray(detail)) return detail[0]
    }
    return error.message || 'Request failed'
  }
  return error instanceof Error ? error.message : 'Unknown error'
}

type RetryOptions = { url: string; config: AxiosRequestConfig }

let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.getRefresh()
  if (!refresh) return null
  if (refreshing) return refreshing
  refreshing = (async () => {
    try {
      const { data } = await axios.post(`${baseURL}/auth/refresh/`, { refresh })
      const access: string = data.access
      tokenStore.set(access)
      return access
    } catch {
      tokenStore.clear()
      return null
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

interface FailedQueueItem {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
  config: InternalAxiosRequestConfig
}
let isRefreshing = false
let queue: FailedQueueItem[] = []

function onRefreshed(token: string | null) {
  queue.forEach(({ resolve, reject, config }) => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      resolve(http(config))
    } else {
      reject(new Error('Session expired'))
    }
  })
  queue = []
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig &
      RetryOptions & { _retry?: boolean }
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    if (original.url?.endsWith('/auth/login/') || original.url?.endsWith('/auth/register/')) {
      return Promise.reject(error)
    }
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject, config: original })
      })
    }

    original._retry = true
    isRefreshing = true
    const token = await refreshAccessToken()
    onRefreshed(token)
    isRefreshing = false

    if (!token) {
      window.dispatchEvent(new CustomEvent('auth:expired'))
      return Promise.reject(error)
    }
    original.headers.Authorization = `Bearer ${token}`
    return http(original)
  },
)

export default http