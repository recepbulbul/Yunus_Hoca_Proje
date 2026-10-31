import { CheckCircle2, Search, ShieldAlert, XCircle } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { useAgents, useForum, useMemories, type MemoryFilter } from '@/api/queries'
import type { Regime, TrustScore } from '@/api/types'
import { MultiLineChart } from '@/components/charts/charts'
import { PageTitle, RegimeBadge } from '@/components/common'
import { REGIME_LABEL } from '@/lib/labels'
import {
  Badge,
  Card,
  CardHeader,
  ErrorState,
  Input,
  Select,
  Skeleton,
} from '@/components/ui/primitives'
import { cn, formatDate, formatNum, formatPct } from '@/lib/utils'

type Tab = 'forum' | 'memory'

export default function ForumPage() {
  const { id = '' } = useParams()
  const [tab, setTab] = useState<Tab>('forum')

  return (
    <>
      <PageTitle
        title="Forum ve hafıza"
        subtitle="Ajanlar arası mesajlar, güven ağırlıkları ve rejim etiketli dersler (F7)."
      />
      <div role="tablist" aria-label="Görünüm" className="mb-4 inline-flex rounded-md border p-0.5">
        {(
          [
            ['forum', 'Forum'],
            ['memory', 'Hafıza tarayıcı'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'rounded px-3 py-1 text-sm',
              tab === key ? 'bg-muted' : 'text-muted-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'forum' ? <ForumView id={id} /> : <MemoryView id={id} />}
    </>
  )
}

function ForumView({ id }: { id: string }) {
  const forum = useForum(id)
  const agents = useAgents()
  const [sender, setSender] = useState('')
  const [onlyFlagged, setOnlyFlagged] = useState(false)
  const nameOf = (aid: string) => agents.data?.find((a) => a.id === aid)?.name ?? aid

  const lines = useMemo(() => {
    const history = forum.data?.trustHistory ?? []
    const ids = [...new Set(history.map((h) => h.trusteeId))]
    return ids.map((tid) => ({
      id: tid,
      name: tid.replace('llm-', ''),
      points: history
        .filter((h) => h.trusteeId === tid)
        .map((h) => ({ time: h.day, value: h.score })),
    }))
  }, [forum.data])

  if (forum.error) return <ErrorState error={forum.error} onRetry={() => void forum.refetch()} />
  if (!forum.data) return <Skeleton className="h-96" />
  if (forum.data.messages.length === 0)
    return (
      <Card className="text-sm text-muted-foreground">
        Bu deney koşulunda (C0/C1) forum kapalı.
      </Card>
    )

  const { messages, trust } = forum.data
  const senders = [...new Set(messages.map((m) => m.senderId))]
  const shown = messages
    .filter((m) => (!sender || m.senderId === sender) && (!onlyFlagged || m.flagged))
    .slice(0, 100)
  const avgTrust = (sid: string) => {
    const xs = trust.filter((t) => t.trusteeId === sid)
    return xs.length ? xs.reduce((s, t) => s + t.score, 0) / xs.length : null
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
      <Card>
        <CardHeader
          title="Mesaj akışı"
          description="Mesajlar güvenilmeyen veri olarak işlenir; talimat içerenler filtrelenir (OWASP LLM01)."
          action={
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={onlyFlagged}
                  onChange={(e) => setOnlyFlagged(e.target.checked)}
                />
                Yalnızca filtrelenenler
              </label>
              <Select
                aria-label="Gönderen"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                className="h-8 w-44 text-xs"
              >
                <option value="">Tüm ajanlar</option>
                {senders.map((s) => (
                  <option key={s} value={s}>
                    {nameOf(s)}
                  </option>
                ))}
              </Select>
            </div>
          }
        />
        <ul className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
          {shown.map((m) => {
            const w = avgTrust(m.senderId)
            return (
              <li
                key={m.id}
                className={cn(
                  'rounded-md border p-3 text-sm',
                  m.flagged && 'border-destructive/50 bg-destructive/10',
                )}
              >
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium">{nameOf(m.senderId)}</span>
                  {w !== null && (
                    <span className="font-mono text-muted-foreground">güven {formatNum(w)}</span>
                  )}
                  <Badge
                    tone={
                      m.stance === 'bullish' ? 'up' : m.stance === 'bearish' ? 'down' : 'neutral'
                    }
                  >
                    {m.asset} ·{' '}
                    {m.stance === 'bullish'
                      ? 'yükseliş'
                      : m.stance === 'bearish'
                        ? 'düşüş'
                        : 'nötr'}
                  </Badge>
                  <span className="ml-auto text-muted-foreground">{formatDate(m.day)}</span>
                </div>
                <p className={cn(m.flagged && 'line-through opacity-70')}>{m.content}</p>
                <div className="mt-1 text-xs">
                  {m.flagged ? (
                    <span className="flex items-center gap-1 text-destructive">
                      <ShieldAlert className="size-3" /> Prompt injection şüphesi · ajanlara
                      iletilmedi
                    </span>
                  ) : m.verified === true ? (
                    <span className="flex items-center gap-1 text-up">
                      <CheckCircle2 className="size-3" /> 5 gün sonra doğrulandı (a+1)
                    </span>
                  ) : m.verified === false ? (
                    <span className="flex items-center gap-1 text-down">
                      <XCircle className="size-3" /> Çürüdü (b+1)
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Değerlendirme bekleniyor</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader
            title="Güven matrisi"
            description="Satır güvenir → sütun güvenilen; w = (a+1)/(a+b+2)"
          />
          <TrustMatrix trust={trust} label={(x) => x.replace('llm-', '')} />
        </Card>
        <Card>
          <CardHeader
            title="Güvenin zaman içindeki değişimi"
            description="Diğer ajanların ortalama güveni"
          />
          <MultiLineChart
            lines={lines}
            height={240}
            label="Ajanlara duyulan ortalama güvenin zaman serisi"
          />
        </Card>
      </div>
    </div>
  )
}

function TrustMatrix({ trust, label }: { trust: TrustScore[]; label: (id: string) => string }) {
  const ids = [...new Set(trust.flatMap((t) => [t.trusterId, t.trusteeId]))]
  const cell = (a: string, b: string) => trust.find((t) => t.trusterId === a && t.trusteeId === b)
  return (
    <table className="w-full table-fixed text-center text-xs">
      <thead>
        <tr>
          <th scope="col">
            <span className="sr-only">Güvenen ajan</span>
          </th>
          {ids.map((b) => (
            <th key={b} scope="col" className="truncate pb-1 font-medium text-muted-foreground">
              {label(b)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ids.map((a) => (
          <tr key={a}>
            <th scope="row" className="truncate pr-1 text-left font-medium text-muted-foreground">
              {label(a)}
            </th>
            {ids.map((b) => {
              const c = cell(a, b)
              if (!c)
                return (
                  <td key={b} className="text-muted-foreground">
                    —
                  </td>
                )
              // Diverging scale around the neutral prior 0.5.
              const alpha = Math.min(1, Math.abs(c.score - 0.5) * 4)
              const color =
                c.score >= 0.5 ? `rgb(34 197 94 / ${alpha})` : `rgb(239 68 68 / ${alpha})`
              return (
                <td key={b} className="p-0.5">
                  <div
                    className="rounded py-2 font-mono"
                    style={{ background: color }}
                    title={`a=${c.confirmed}, b=${c.refuted}`}
                  >
                    {formatNum(c.score)}
                  </div>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MemoryView({ id }: { id: string }) {
  const agents = useAgents()
  const [regime, setRegime] = useState<Regime | ''>('')
  const [agent, setAgent] = useState('')
  const [q, setQ] = useState('')
  const deferredQ = useDeferredValue(q)
  const filter: MemoryFilter = { regime, agent, q: deferredQ }
  const memories = useMemories(id, filter)
  const llmAgents = agents.data?.filter((a) => a.kind === 'llm') ?? []

  return (
    <Card>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            aria-label="Derslerde ara"
            placeholder="Derslerde ara (örn. zarar-kes, BTC)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          aria-label="Rejim"
          value={regime}
          onChange={(e) => setRegime(e.target.value as Regime | '')}
          className="w-40"
        >
          <option value="">Tüm rejimler</option>
          {(Object.keys(REGIME_LABEL) as Regime[]).map((r) => (
            <option key={r} value={r}>
              {REGIME_LABEL[r]}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Ajan"
          value={agent}
          onChange={(e) => setAgent(e.target.value)}
          className="w-52"
        >
          <option value="">Tüm LLM ajanları</option>
          {llmAgents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>

      {memories.error ? (
        <ErrorState error={memories.error} />
      ) : !memories.data ? (
        <Skeleton className="h-64" />
      ) : memories.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Eşleşen ders yok. C0 koşulunda hafıza kapalıdır.
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground" aria-live="polite">
            {memories.data.length} ders
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {memories.data.slice(0, 60).map((m) => (
              <li key={m.id} className="rounded-md border p-3 text-sm">
                <div className="mb-2 flex items-center gap-2 text-xs">
                  <RegimeBadge regime={m.regime} />
                  <span>{agents.data?.find((a) => a.id === m.agentId)?.name}</span>
                  <span className="ml-auto text-muted-foreground">{formatDate(m.day)}</span>
                </div>
                <p>{m.lesson}</p>
                <dl className="mt-2 grid grid-cols-4 gap-1 rounded bg-muted p-2 text-center text-xs">
                  {(
                    [
                      ['Gerçekleşen', m.counterfactual.actual],
                      ['Girmemek', m.counterfactual.skip],
                      ['Yarım', m.counterfactual.half],
                      ['Zarar-kes', m.counterfactual.stopLoss],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className={cn('font-mono', v > 0 ? 'text-up' : v < 0 ? 'text-down' : '')}>
                        {formatPct(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}
