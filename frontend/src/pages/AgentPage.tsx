import { ArrowLeft, BrainCircuit, MessageSquareText, RotateCw, ShieldAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAgentDetail, useAgents, useForum, useMemories } from '@/api/queries'
import type { Decision } from '@/api/types'
import { MultiLineChart } from '@/components/charts/charts'
import { PageTitle, RegimeBadge } from '@/components/common'
import { Button } from '@/components/ui/button'
import {
  Badge,
  Card,
  CardHeader,
  ErrorState,
  Skeleton,
  Stat,
  Table,
} from '@/components/ui/primitives'
import { dailyReturns, maxDrawdown, sharpeRatio } from '@/lib/metrics'
import { formatDate, formatNum, formatPct, formatUsd } from '@/lib/utils'

const PAGE_SIZE = 15

export default function AgentPage() {
  const { id = '', agentId = '' } = useParams()
  const detail = useAgentDetail(id, agentId)
  const agents = useAgents()
  const isLlm = detail.data?.agent.kind === 'llm'
  const memories = useMemories(id, { agent: agentId })
  const forum = useForum(id)
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState<string | null>(null)

  const stats = useMemo(() => {
    const eq = detail.data?.equity.map((p) => p.equity) ?? []
    if (eq.length < 2) return null
    return {
      equity: eq.at(-1)!,
      ret: eq.at(-1)! / eq[0]! - 1,
      sharpe: sharpeRatio(dailyReturns(eq)),
      mdd: maxDrawdown(eq),
    }
  }, [detail.data])

  const lines = useMemo(
    () =>
      detail.data
        ? [
            {
              id: agentId,
              name: detail.data.agent.name,
              points: detail.data.equity.map((p) => ({ time: p.day, value: p.equity })),
            },
          ]
        : [],
    [detail.data, agentId],
  )

  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  if (!detail.data) return <Skeleton className="h-[480px]" />

  const { agent, decisions, trustGiven, trustReceived } = detail.data
  const nameOf = (aid: string) => agents.data?.find((a) => a.id === aid)?.name ?? aid
  const memoryById = new Map(memories.data?.map((m) => [m.id, m]))
  const messageById = new Map(forum.data?.messages.map((m) => [m.id, m]))
  const pageItems = decisions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const pages = Math.ceil(decisions.length / PAGE_SIZE)

  return (
    <>
      <Link
        to={`/experiments/${id}/live`}
        className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Canlı ekrana dön
      </Link>
      <PageTitle
        title={agent.name}
        subtitle={agent.persona ?? `${agent.kind.toUpperCase()} ajanı`}
      />

      {stats && (
        <Card className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Portföy değeri" value={formatUsd(stats.equity)} />
          <Stat
            label="Toplam getiri"
            value={formatPct(stats.ret)}
            tone={stats.ret >= 0 ? 'up' : 'down'}
          />
          <Stat label="Sharpe (yıllık)" value={formatNum(stats.sharpe)} />
          <Stat label="Maksimum düşüş" value={formatPct(-stats.mdd)} tone="down" />
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Portföy geçmişi" />
            <MultiLineChart lines={lines} height={220} label={`${agent.name} portföy değeri`} />
          </Card>

          {isLlm && (
            <Card>
              <CardHeader
                title="Kararlar ve gerekçeleri"
                description="Her karar, kullandığı anılar ve okuduğu forum mesajlarıyla izlenebilir (F6, NF4)."
              />
              <ul className="divide-y">
                {pageItems.map((d) => (
                  <DecisionRow
                    key={d.id}
                    d={d}
                    expanded={open === d.id}
                    onToggle={() => setOpen(open === d.id ? null : d.id)}
                    memory={(mid) => memoryById.get(mid)?.lesson}
                    message={(fid) => {
                      const m = messageById.get(fid)
                      return m && `${nameOf(m.senderId)}: ${m.content}`
                    }}
                  />
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {decisions.length} karar · sayfa {page + 1}/{pages}
                </span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    Önceki
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page + 1 >= pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Güven skorları" description="Beta itibar: w = (a+1)/(a+b+2)" />
            {trustGiven.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Bu koşulda forum yok veya ajan foruma katılmıyor.
              </p>
            ) : (
              <Table className="text-xs">
                <thead>
                  <tr>
                    <th>Ajan</th>
                    <th className="text-right">Verdiği</th>
                    <th className="text-right">Aldığı</th>
                  </tr>
                </thead>
                <tbody>
                  {trustGiven.map((t) => {
                    const back = trustReceived.find((r) => r.trusterId === t.trusteeId)
                    return (
                      <tr key={t.trusteeId}>
                        <td>{nameOf(t.trusteeId)}</td>
                        <td
                          className="text-right font-mono"
                          title={`a=${t.confirmed}, b=${t.refuted}`}
                        >
                          {formatNum(t.score)}
                        </td>
                        <td className="text-right font-mono">
                          {back ? formatNum(back.score) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            )}
          </Card>

          {isLlm && (
            <Card>
              <CardHeader
                title="Hafıza"
                description={`${memories.data?.length ?? 0} kabul edilmiş ders`}
              />
              <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {memories.data?.slice(0, 20).map((m) => (
                  <li key={m.id} className="rounded-md bg-muted p-2 text-xs">
                    <div className="mb-1 flex items-center gap-2">
                      <RegimeBadge regime={m.regime} />
                      <span className="text-muted-foreground">{formatDate(m.day)}</span>
                      <span className="ml-auto font-mono">önem {formatNum(m.importance)}</span>
                    </div>
                    {m.lesson}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

function DecisionRow({
  d,
  expanded,
  onToggle,
  memory,
  message,
}: {
  d: Decision
  expanded: boolean
  onToggle: () => void
  memory: (id: string) => string | undefined
  message: (id: string) => string | undefined
}) {
  const weights = Object.entries(d.targetWeights)
  return (
    <li className="py-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 text-left"
      >
        <span className="w-20 shrink-0 text-xs text-muted-foreground">{formatDate(d.day)}</span>
        <span className="flex-1 text-sm">{d.rationale}</span>
        <span className="flex shrink-0 gap-1">
          {d.heldPosition && (
            <Badge tone="warn" className="gap-1">
              <ShieldAlert className="size-3" /> pozisyon korundu
            </Badge>
          )}
          {d.attempts > 1 && !d.heldPosition && (
            <Badge tone="neutral" className="gap-1">
              <RotateCw className="size-3" /> {d.attempts}. deneme
            </Badge>
          )}
        </span>
      </button>
      {expanded && (
        <div className="mt-2 ml-23 grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <p className="mb-1 font-medium">Karar (JSON)</p>
            <pre className="overflow-x-auto rounded-md bg-muted p-2 font-mono">
              {JSON.stringify(
                {
                  allocations: weights.map(([asset, weight]) => ({ asset, weight })),
                  confidence: d.confidence,
                  regime: d.regime,
                  latency_ms: d.latencyMs,
                },
                null,
                2,
              )}
            </pre>
          </div>
          <div className="space-y-2">
            <p className="flex items-center gap-1 font-medium">
              <BrainCircuit className="size-3" /> Kullanılan anılar ({d.memories.length})
            </p>
            {d.memories.length === 0 && (
              <p className="text-muted-foreground">Yok (hafızasız koşul veya henüz ders yok)</p>
            )}
            {d.memories.map((m) => (
              <p key={m.id} className="rounded bg-muted p-1.5">
                <span className="font-mono text-muted-foreground">{formatNum(m.score)}</span>{' '}
                {memory(m.id) ?? m.id}
              </p>
            ))}
            <p className="flex items-center gap-1 font-medium">
              <MessageSquareText className="size-3" /> Okunan forum mesajları (
              {d.forumMessageIds.length})
            </p>
            {d.forumMessageIds.map((fid) => (
              <p key={fid} className="rounded bg-muted p-1.5">
                {message(fid) ?? fid}
              </p>
            ))}
          </div>
        </div>
      )}
    </li>
  )
}
