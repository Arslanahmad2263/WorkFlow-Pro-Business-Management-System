import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { authApi } from '@/lib/services'
import { tokenStore } from '@/lib/tokenStore'
import type { RegisterPayload, User } from '@/lib/types'

interface AuthContextValue {
  user: User | null
  initializing: boolean
  login: (username: string, password: string) => Promise<User>
  register: (payload: RegisterPayload) => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => tokenStore.getStoredUser())
  const [initializing, setInitializing] = useState(() => Boolean(tokenStore.getAccess()))

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      if (!tokenStore.getAccess()) return
      try {
        const me = await authApi.me()
        if (!cancelled) {
          setUser(me)
          tokenStore.set(tokenStore.getAccess() ?? '', undefined, me)
        }
      } catch {
        if (!cancelled) {
          tokenStore.clear()
          setUser(null)
        }
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }
    bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onExpired = () => {
      tokenStore.clear()
      setUser(null)
    }
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const session = await authApi.login(username, password)
    tokenStore.set(session.access, session.refresh, session.user)
    setUser(session.user)
    return session.user
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    const session = await authApi.register(payload)
    tokenStore.set(session.access, session.refresh, session.user)
    setUser(session.user)
    return session.user
  }, [])

  const logout = useCallback(async () => {
    const refresh = tokenStore.getRefresh()
    if (refresh) {
      try {
        await authApi.logout(refresh)
      } catch {
        // ignore — token is cleared locally regardless
      }
    }
    tokenStore.clear()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, initializing, login, register, logout }),
    [user, initializing, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useRole() {
  const { user } = useAuth()
  const isManager = user?.role === 'admin' || user?.role === 'manager'
  const isAdmin = user?.role === 'admin'
  return { user, isManager, isAdmin }
}