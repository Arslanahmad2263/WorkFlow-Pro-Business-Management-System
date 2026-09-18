import { FormEvent, useState } from 'react'
import { useActiveUsers, useCreateUser, useDeleteUser, useTeam, useUpdateUser } from '@/hooks/api'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageLoader } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import { Select, TextInput } from '@/components/ui/Field'
import { ROLE_LABELS } from '@/lib/labels'
import { formatDateTime, initials } from '@/lib/format'
import { extractErrorMessage } from '@/lib/api'
import type { User, UserPayload } from '@/lib/types'
import { useAuth } from '@/contexts/AuthContext'

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
]

export function TeamPage() {
  const { user: me } = useAuth()
  const { data, isLoading, isError, error, refetch } = useTeam()
  const { data: activeUsers } = useActiveUsers()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState<UserPayload>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'employee',
    is_active: true,
    password: '',
  })

  const openCreate = () => {
    setEditing(null)
    setFormError('')
    setForm({ username: '', email: '', first_name: '', last_name: '', role: 'employee', is_active: true, password: '' })
    setModalOpen(true)
  }

  const openEdit = (user: User) => {
    setEditing(user)
    setFormError('')
    setForm({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active,
      password: '',
    })
    setModalOpen(true)
  }

  const set = <K extends keyof UserPayload>(key: K, value: UserPayload[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!form.username.trim() || !form.email.trim()) return
    const payload: UserPayload = { ...form }
    if (!payload.password) delete payload.password
    try {
      if (editing) {
        await updateUser.mutateAsync({ id: editing.id, payload })
      } else {
        await createUser.mutateAsync(payload)
      }
      setModalOpen(false)
    } catch (err) {
      setFormError(extractErrorMessage(err))
    }
  }

  if (isLoading) return <PageLoader label="Loading team…" />
  if (isError || !data) return <ErrorState error={error} onRetry={() => refetch()} />

  const users = data.results
  const self = me

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Team</h2>
          <p className="mt-1 text-sm text-slate-500">
            {data.count} users · {activeUsers?.length ?? 0} active
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          + New user
        </button>
      </div>

      {users.length === 0 ? (
        <EmptyState title="No users yet" description="Create your first team member." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                          {initials(user.full_name || user.username)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">
                            {user.full_name || user.username}
                            {user.id === self?.id && <span className="ml-1 text-xs text-slate-400">(you)</span>}
                          </p>
                          <p className="text-xs text-slate-400">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          user.role === 'admin'
                            ? 'bg-rose-100 text-rose-700'
                            : user.role === 'manager'
                              ? 'bg-brand-100 text-brand-700'
                              : 'bg-slate-100 text-slate-700'
                        }
                      >
                        {ROLE_LABELS[user.role] ?? user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(user.date_joined)}</td>
                    <td className="px-4 py-3">
                      <Badge className={user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="link text-xs" onClick={() => openEdit(user)}>
                        Manage
                      </button>
                      {user.id !== self?.id && (
                        <button
                          className="ml-3 text-xs text-rose-600 hover:underline"
                          onClick={() => setDeleting(user)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-800">
                {editing ? `Manage ${editing.username}` : 'New user'}
              </h3>
              <button
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setModalOpen(false)}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-5 py-4">
              {formError && (
                <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="First name"
                  value={form.first_name ?? ''}
                  onChange={(e) => set('first_name', e.target.value)}
                />
                <TextInput
                  label="Last name"
                  value={form.last_name ?? ''}
                  onChange={(e) => set('last_name', e.target.value)}
                />
              </div>
              {!editing && (
                <TextInput
                  label="Username"
                  value={form.username}
                  onChange={(e) => set('username', e.target.value)}
                  required
                />
              )}
              <TextInput
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Role" value={form.role} onChange={(e) => set('role', e.target.value as UserPayload['role'])}>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Status"
                  value={form.is_active ? 'active' : 'inactive'}
                  onChange={(e) => set('is_active', e.target.value === 'active')}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>
              <TextInput
                label={editing ? 'New password (optional)' : 'Initial password'}
                type="password"
                value={form.password ?? ''}
                onChange={(e) => set('password', e.target.value)}
                hint={editing ? 'Leave blank to keep the current password.' : 'At least 8 characters.'}
              />
              <div className="mt-5 flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button className="btn-primary" disabled={createUser.isPending || updateUser.isPending}>
                  {editing ? 'Save changes' : 'Create user'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete user"
        message={`Delete "${deleting?.username}"? Their memberships and task history will be kept but the account is removed.`}
        confirmLabel="Delete user"
        onConfirm={() => {
          if (deleting) {
            deleteUser.mutate(deleting.id)
            setDeleting(null)
          }
        }}
        onCancel={() => setDeleting(null)}
        busy={deleteUser.isPending}
      />
    </div>
  )
}