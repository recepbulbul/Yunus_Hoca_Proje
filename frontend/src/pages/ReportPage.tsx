import { FileDown, Printer } from 'lucide-react'
import { useMemo } from 'react'
import { useParams } from 'react-router'
import { useAgents, useExperiment, useReport, useTimeline } from '@/api/queries'
import { CONDITION_LABELS, type ConditionSummary } from '@/api/types'
import { MultiLineChart } from '@/components/charts/charts'
import { PageTitle } from '@/components/common'
import { downloadFile } from '@/lib/download'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, ErrorState, Skeleton, Stat, Table } from '@/components/ui/primitives'
import { reportToCsv } from '@/lib/report'
import { cn, formatNum, formatPct } from '@/lib/utils'

export default function ReportPage() {
  const { id = '' } = useParams()
  const experiment = useExperiment(id)
  const report = useReport(id)
  const timeline = useTimeline(id, experiment.data?.status !== 'draft')
  const agents = useAgents()
  const nameOf = (aid: string) => agents.data?.find((a) => a.id === aid)?.name ?? aid

  const lines = useMemo(
    () =>
      timeline.data?.runs.map((r) => ({
        id: r.agent.id,
        name: r.agent.name.replace('LLM · ', ''),
        points: r.equity.map((p) => ({ time: p.day, value: p.equity })),
      })) ?? [],
    [timeline.data],
  )

  if (report.error) return <ErrorState error={report.error} onRetry={() => void report.refetch()} />
  if (!report.data || !experiment.data) return <Skeleton className="h-[480px]" />

  const r = report.data
  const llm = r.agents.filter((a) => a.agentId.startsWith('llm-'))
  const best = [...llm].sort((a, b) => b.sharpe - a.sharpe)[0]
  const mddReduction =
    best && r.benchmark.maxDrawdown > 0 ? 1 - best.maxDrawdown / r.benchmark.maxDrawdown : null

  return (
    <>
      <PageTitle
        title={`Rapor · ${experiment.data.name}`}
        subtitle={`${CONDITION_LABELS[experiment.data.condition]} · seed ${experiment.data.seed} (F8)`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadFile(`mindex-${id}-report.csv`, reportToCsv(r, nameOf), 'text/csv')
              }
            >
              <FileDown /> CSV
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> PDF
            </Button>
          </>
        }
      />

      <Card className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label="En iyi LLM ajanı (Sharpe)"
          value={best ? nameOf(best.agentId).replace('LLM · ', '') : '—'}
        />
        <Stat
          label="Sharpe · en iyi / BTC al-tut"
          value={`${formatNum(best?.sharpe ?? 0)} / ${formatNum(r.benchmark.sharpe)}`}
        />
        <Stat
          label="MDD azalması (hedef ≥ %30)"
          value={mddReduction === null ? '—' : formatPct(mddReduction)}
          tone={mddReduction !== null && mddReduction >= 0.3 ? 'up' : 'down'}
        />
        <Stat label="Sürü korelasyonu (LLM)" value={formatNum(r.herdCorrelation)} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Ajan metrikleri" />
          <Table>
            <thead>
              <tr>
                <th>Ajan</th>
                <th className="text-right">Getiri</th>
                <th className="text-right">Sharpe</th>
                <th className="text-right">MDD</th>
                <th className="text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {[...r.agents]
                .sort((a, b) => b.sharpe - a.sharpe)
                .map((a) => (
                  <tr key={a.agentId} className={cn(a.agentId === best?.agentId && 'bg-primary/5')}>
                    <td>{nameOf(a.agentId)}</td>
                    <td
                      className={cn(
                        'text-right font-mono',
                        a.totalReturn >= 0 ? 'text-up' : 'text-down',
                      )}
                    >
                      {formatPct(a.totalReturn)}
                    </td>
                    <td className="text-right font-mono">{formatNum(a.sharpe)}</td>
                    <td className="text-right font-mono">{formatPct(-a.maxDrawdown)}</td>
                    <td className="text-right font-mono">{a.trades}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Portföy değerleri" description="Tüm ajanlar, başlangıç 10.000 $" />
          <MultiLineChart
            lines={lines}
            height={300}
            label="Ajanların portföy değeri zaman serisi"
          />
        </Card>
      </div>

      {r.conditions.length > 0 && <ConditionComparison conditions={r.conditions} />}
    </>
  )
}

function ConditionComparison({ conditions }: { conditions: ConditionSummary[] }) {
  const c0 = conditions.find((c) => c.condition === 'C0')
  const lo = Math.min(0, ...conditions.map((c) => c.sharpeCiLow))
  const hi = Math.max(...conditions.map((c) => c.sharpeCiHigh))
  const pos = (v: number) => `${((v - lo) / (hi - lo || 1)) * 100}%`

  return (
    <Card className="mt-4">
      <CardHeader
        title="Koşul karşılaştırması (C0–C3 × 5 seed)"
        description="LLM ajanlarının ortalaması. Prototipte aralık = 5 seed min–maks; gerçek raporda blok bootstrap %95 GA."
      />
      <Table>
        <thead>
          <tr>
            <th>Koşul</th>
            <th className="w-1/3">Sharpe (ort. ve aralık)</th>
            <th className="text-right">vs C0</th>
            <th className="text-right">MDD</th>
            <th className="text-right">Getiri</th>
            <th className="text-right">Sürü kor.</th>
            <th className="text-right">Ders tutarlılığı</th>
          </tr>
        </thead>
        <tbody>
          {conditions.map((c) => {
            const vsC0 = c0 && c0.sharpeMean !== 0 ? c.sharpeMean / c0.sharpeMean - 1 : null
            return (
              <tr key={c.condition}>
                <td className="whitespace-nowrap">{CONDITION_LABELS[c.condition]}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div
                      className="relative h-5 flex-1"
                      aria-label={`Sharpe ${formatNum(c.sharpeMean)}, aralık ${formatNum(c.sharpeCiLow)}–${formatNum(c.sharpeCiHigh)}`}
                    >
                      <div
                        className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-primary/30"
                        style={{
                          left: pos(c.sharpeCiLow),
                          right: `calc(100% - ${pos(c.sharpeCiHigh)})`,
                        }}
                      />
                      <div
                        className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
                        style={{ left: pos(c.sharpeMean) }}
                      />
                    </div>
                    <span className="w-10 text-right font-mono text-xs">
                      {formatNum(c.sharpeMean)}
                    </span>
                  </div>
                </td>
                <td
                  className={cn(
                    'text-right font-mono',
                    vsC0 !== null && vsC0 >= 0.15 ? 'text-up' : '',
                  )}
                >
                  {c.condition === 'C0' || vsC0 === null ? '—' : formatPct(vsC0)}
                </td>
                <td className="text-right font-mono">{formatPct(-c.maxDrawdown)}</td>
                <td className="text-right font-mono">{formatPct(c.totalReturn)}</td>
                <td className="text-right font-mono">{formatNum(c.herdCorrelation)}</td>
                <td className="text-right font-mono">
                  {c.lessonConsistency === null ? '—' : formatPct(c.lessonConsistency)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </Table>
      <p className="mt-2 text-xs text-muted-foreground">
        Nicel hedef: C3 Sharpe ortalamasında C0'a göre ≥ %15 iyileşme.
      </p>
    </Card>
  )
}
