import { Pause, Play, Radio, RotateCcw, SkipForward } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useExperiment, useTimeline } from '@/api/queries'
import { CONDITION_LABELS, type Asset } from '@/api/types'
import { CandleChart, type TradeMarker } from '@/components/charts/charts'
import { PageTitle, RegimeBadge, StatusBadge } from '@/components/common'
import { Button } from '@/components/ui/button'
import {
  Badge,
  Card,
  CardHeader,
  ErrorState,
  Select,
  Skeleton,
  Table,
} from '@/components/ui/primitives'
import { cn, formatDate, formatNum, formatPct, formatUsd } from '@/lib/utils'

const SPEEDS = [1, 5, 20] as const
const BASE_TICK_MS = 600

export default function LivePage() {
  const { id = '' } = useParams()
  const experiment = useExperiment(id)
  const isDraft = experiment.data?.status === 'draft'
  const timeline = useTimeline(id, experiment.isSuccess && !isDraft)

  const [asset, setAsset] = useState<Asset>('BTC')
  const [agentFilter, setAgentFilter] = useState('llm-momentum')
  const [cursor, setCursor] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(5)

  const lastIndex = (timeline.data?.days.length ?? 1) - 1
  // Live experiments open at the latest tick; replays open at day 30 so there is history to see.
  const at = cursor ?? (experiment.data?.mode === 'live' ? lastIndex : Math.min(30, lastIndex))

  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => {
      setCursor((c) => {
        const next = (c ?? at) + 1
        if (next >= lastIndex) setPlaying(false)
        return Math.min(next, lastIndex)
      })
    }, BASE_TICK_MS / speed)
    return () => clearInterval(timer)
  }, [playing, speed, lastIndex, at])

  const view = useMemo(() => {
    const t = timeline.data
    if (!t) return null
    const day = t.days[at]!
    const candles = t.candles[asset].slice(0, at + 1)
    const visibleTrades = t.trades.filter((x) => x.day <= day)
    const markers: TradeMarker[] = visibleTrades
      .filter((x) => x.asset === asset && (agentFilter === 'all' || x.agentId === agentFilter))
      .map((x) => ({
        time: x.day,
        side: x.side,
        label: agentFilter === 'all' ? x.agentId.replace('llm-', '') : '',
      }))
    const leaderboard = t.runs
      .map((r) => {
        const eq = r.equity[at]!.equity
        const w = r.weights[at]!
        return {
          agent: r.agent,
          equity: eq,
          ret: eq / r.equity[0]!.equity - 1,
          exposure: Object.values(w).reduce((s, x) => s + x, 0),
        }
      })
      .sort((a, b) => b.equity - a.equity)
    return {
      day,
      regime: t.regimes[at]!,
      candles,
      markers,
      leaderboard,
      feed: visibleTrades.slice(-12).reverse(),
      price: candles.at(-1)!.close,
      change: candles.at(-1)!.close / (candles.at(-2)?.close ?? candles.at(-1)!.close) - 1,
    }
  }, [timeline.data, at, asset, agentFilter])

  if (experiment.error) return <ErrorState error={experiment.error} />
  if (isDraft)
    return (
      <Card>
        <p className="text-sm">Bu deney henüz başlatılmadı.</p>
        <Link to="/experiments" className="mt-2 inline-block text-sm text-primary underline">
          Deneylere dön
        </Link>
      </Card>
    )
  if (timeline.error)
    return <ErrorState error={timeline.error} onRetry={() => void timeline.refetch()} />
  if (!view || !experiment.data) return <Skeleton className="h-[480px]" />

  const exp = experiment.data
  const isLive = exp.mode === 'live'

  return (
    <>
      <PageTitle
        title={exp.name}
        subtitle={`${CONDITION_LABELS[exp.condition]} · seed ${exp.seed} · ${exp.agentIds.length} ajan`}
        actions={
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge tone="up" className="gap-1">
                <Radio className="size-3 animate-pulse" /> Binance akışı bağlı (sahte)
              </Badge>
            )}
            <StatusBadge status={exp.status} />
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div role="tablist" aria-label="Varlık" className="flex rounded-md border p-0.5">
              {exp.assets.map((a) => (
                <button
                  key={a}
                  role="tab"
                  type="button"
                  aria-selected={a === asset}
                  onClick={() => setAsset(a)}
                  className={cn(
                    'rounded px-2.5 py-1 text-xs font-medium',
                    a === asset ? 'bg-muted' : 'text-muted-foreground',
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="font-mono text-lg font-semibold tabular-nums">
              {formatUsd(view.price)}
            </div>
            <span className={cn('font-mono text-sm', view.change >= 0 ? 'text-up' : 'text-down')}>
              {formatPct(view.change)}
            </span>
            <RegimeBadge regime={view.regime} />
            <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              İşlemleri göster
              <Select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="h-8 w-48 text-xs"
              >
                <option value="all">Tüm ajanlar</option>
                {view.leaderboard.map((r) => (
                  <option key={r.agent.id} value={r.agent.id}>
                    {r.agent.name}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <CandleChart
            candles={view.candles}
            markers={view.markers}
            label={`${asset}/USDT günlük mum grafiği`}
          />

          <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3">
            <Button
              size="icon"
              variant="outline"
              aria-label={playing ? 'Duraklat' : 'Oynat'}
              onClick={() => setPlaying((p) => !p)}
              disabled={at >= lastIndex}
            >
              {playing ? <Pause /> : <Play />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Başa sar"
              onClick={() => {
                setPlaying(false)
                setCursor(0)
              }}
            >
              <RotateCcw />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Sona git"
              onClick={() => {
                setPlaying(false)
                setCursor(lastIndex)
              }}
            >
              <SkipForward />
            </Button>
            <div
              role="radiogroup"
              aria-label="Oynatma hızı"
              className="flex rounded-md border p-0.5"
            >
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={s === speed}
                  onClick={() => setSpeed(s)}
                  className={cn(
                    'rounded px-2 py-0.5 text-xs',
                    s === speed ? 'bg-muted' : 'text-muted-foreground',
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>
            <input
              type="range"
              min={0}
              max={lastIndex}
              value={at}
              onChange={(e) => setCursor(Number(e.target.value))}
              aria-label="Simülasyon günü"
              className="min-w-40 flex-1 accent-(--primary)"
            />
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {formatDate(view.day)} · gün {at + 1}/{lastIndex + 1}
            </span>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Lider tablosu" description="Portföy değeri · başlangıç 10.000 $" />
            <ol className="space-y-1">
              {view.leaderboard.map((r, i) => (
                <li key={r.agent.id}>
                  <Link
                    to={`/experiments/${id}/agents/${r.agent.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <span className="w-4 font-mono text-xs text-muted-foreground">{i + 1}</span>
                    <span className="flex-1 truncate">{r.agent.name}</span>
                    <span className="font-mono text-xs tabular-nums">{formatUsd(r.equity)}</span>
                    <span
                      className={cn(
                        'w-14 text-right font-mono text-xs tabular-nums',
                        r.ret >= 0 ? 'text-up' : 'text-down',
                      )}
                    >
                      {formatPct(r.ret)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <CardHeader title="Son işlemler" />
            <Table className="text-xs">
              <tbody>
                {view.feed.map((tr) => (
                  <tr key={tr.id}>
                    <td className="text-muted-foreground">{formatDate(tr.day)}</td>
                    <td className="max-w-28 truncate">{tr.agentId}</td>
                    <td className={tr.side === 'buy' ? 'text-up' : 'text-down'}>
                      {tr.side === 'buy' ? 'AL' : 'SAT'} {tr.asset}
                    </td>
                    <td className="text-right font-mono tabular-nums">
                      {formatNum(tr.quantity * tr.price)} $
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      </div>
    </>
  )
}
