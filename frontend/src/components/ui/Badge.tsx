import clsx from 'clsx'
import type { ReactNode } from 'react'

export function Badge({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <span className={clsx('badge', className)}>{children}</span>
}