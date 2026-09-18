import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-slate-100 px-4 text-center">
      <p className="text-6xl font-bold text-brand-600">404</p>
      <h1 className="text-xl font-semibold text-slate-800">Page not found</h1>
      <p className="text-sm text-slate-500">The page you are looking for does not exist.</p>
      <Link className="btn-primary" to="/">
        Back to dashboard
      </Link>
    </div>
  )
}