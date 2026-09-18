import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { extractErrorMessage } from '@/lib/api'
import { Spinner } from '@/components/ui/Spinner'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password2: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (form.password !== form.password2) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await register(form)
      navigate('/', { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key)(e.target.value),
  })

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-100 px-4 py-8">
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
          <h2 className="text-lg font-semibold text-slate-800">Create your account</h2>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            New accounts start as employees and can be promoted by an admin.
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="label" htmlFor="r-username">
              Username
            </label>
            <input id="r-username" className="input" autoComplete="username" required {...field('username')} />
          </div>

          <div className="mb-4">
            <label className="label" htmlFor="r-email">
              Email
            </label>
            <input id="r-email" type="email" className="input" autoComplete="email" required {...field('email')} />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="r-first">
                First name
              </label>
              <input id="r-first" className="input" autoComplete="given-name" {...field('first_name')} />
            </div>
            <div>
              <label className="label" htmlFor="r-last">
                Last name
              </label>
              <input id="r-last" className="input" autoComplete="family-name" {...field('last_name')} />
            </div>
          </div>

          <div className="mb-4">
            <label className="label" htmlFor="r-password">
              Password
            </label>
            <input
              id="r-password"
              type="password"
              className="input"
              autoComplete="new-password"
              required
              {...field('password')}
            />
          </div>

          <div className="mb-5">
            <label className="label" htmlFor="r-password2">
              Confirm password
            </label>
            <input
              id="r-password2"
              type="password"
              className="input"
              autoComplete="new-password"
              required
              {...field('password2')}
            />
          </div>

          <button className="btn-primary w-full" disabled={busy}>
            {busy && <Spinner size="sm" />}
            {busy ? 'Creating account…' : 'Create account'}
          </button>

          <p className="mt-4 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link className="link" to="/login">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}