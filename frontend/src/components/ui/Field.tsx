import { SelectHTMLAttributes, TextareaHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

type BaseProps = {
  label?: string
  error?: string
  hint?: string
}

export function Field({
  label,
  error,
  hint,
  children,
}: BaseProps & { children: ReactNode }) {
  return (
    <div className="mb-4">
      {label && <label className="label">{label}</label>}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
}

export function TextInput({
  label,
  error,
  hint,
  ...props
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} error={error} hint={hint}>
      <input className={`input ${error ? 'border-rose-400' : ''}`} {...props} />
    </Field>
  )
}

export function TextArea({
  label,
  error,
  hint,
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} error={error} hint={hint}>
      <textarea className={`input ${error ? 'border-rose-400' : ''}`} rows={3} {...props} />
    </Field>
  )
}

export function Select({
  label,
  error,
  hint,
  children,
  ...props
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} error={error} hint={hint}>
      <select className={`input ${error ? 'border-rose-400' : ''}`} {...props}>
        {children}
      </select>
    </Field>
  )
}