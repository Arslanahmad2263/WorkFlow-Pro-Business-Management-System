import { FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { extractErrorMessage } from '@/lib/api'
import { Spinner } from '@/components/ui/Spinner'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white">
            W
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">WorkFlow-Pro</h1>
            <p className="text-sm text-slate-500">Business management & task tracking</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card p-6">
          <h2 className="text-lg font-semibold text-slate-800">Sign in</h2>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            Use your WorkFlow-Pro account to continue.
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div className="mb-4">
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button className="btn-primary w-full" disabled={busy}>
            {busy && <Spinner size="sm" />}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="mt-4 text-center text-sm text-slate-500">
            No account?{' '}
            <Link className="link" to="/register">
              Create one
            </Link>
          </p>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Demo accounts: admin / manager / alice / bob / carol · password{' '}
          <code className="rounded bg-slate-200 px-1">DemoPass123!</code>
        </p>
      </div>
    </div>
  )
}