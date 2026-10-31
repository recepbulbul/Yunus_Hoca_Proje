import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cn('rounded-xl border bg-card p-4 shadow-sm', className)} {...props} />
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <header className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </header>
  )
}

const badgeVariants = cva('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', {
  variants: {
    tone: {
      neutral: 'bg-muted text-muted-foreground',
      up: 'bg-up/15 text-up',
      down: 'bg-down/15 text-down',
      warn: 'bg-amber-500/15 text-amber-500',
      info: 'bg-sky-500/15 text-sky-400',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}

const control =
  'h-9 w-full rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground disabled:opacity-50 aria-invalid:border-destructive'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, className)} {...props} />
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(control, 'pr-8', className)} {...props} />
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn(
          'w-full text-sm [&_tbody_tr]:border-t [&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground',
          className,
        )}
        {...props}
      />
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-muted', className)} />
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.'
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm"
    >
      <p className="font-medium">Veri yüklenemedi</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 text-xs underline">
          Tekrar dene
        </button>
      )}
    </div>
  )
}

export function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: ReactNode
  tone?: 'up' | 'down'
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-0.5 font-mono text-lg font-semibold tabular-nums',
          tone === 'up' && 'text-up',
          tone === 'down' && 'text-down',
        )}
      >
        {value}
      </p>
    </div>
  )
}
