import type { ExperimentStatus, Regime } from '@/api/types'
import { REGIME_LABEL } from '@/lib/labels'
import { Badge } from './ui/primitives'

const STATUS: Record<
  ExperimentStatus,
  { label: string; tone: 'up' | 'down' | 'warn' | 'info' | 'neutral' }
> = {
  draft: { label: 'Taslak', tone: 'neutral' },
  queued: { label: 'Kuyrukta', tone: 'info' },
  running: { label: 'Çalışıyor', tone: 'up' },
  paused: { label: 'Duraklatıldı', tone: 'warn' },
  completed: { label: 'Tamamlandı', tone: 'info' },
  failed: { label: 'Hata', tone: 'down' },
}

export const StatusBadge = ({ status }: { status: ExperimentStatus }) => (
  <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>
)

export const RegimeBadge = ({ regime }: { regime: Regime }) => (
  <Badge tone={regime === 'bull' ? 'up' : regime === 'bear' ? 'down' : 'neutral'}>
    {REGIME_LABEL[regime]}
  </Badge>
)

export function PageTitle({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2 print:hidden">{actions}</div>}
    </div>
  )
}
