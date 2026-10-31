import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { ApiError } from '@/api/client'
import { useAgents, useCreateExperiment } from '@/api/queries'
import { ASSETS, CONDITION_LABELS, CONDITIONS } from '@/api/types'
import { PageTitle } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, Field, Input, Select } from '@/components/ui/primitives'
import {
  experimentCreateSchema,
  overlapsTestWindow,
  TEST_WINDOW,
  type ExperimentCreateForm,
} from '@/lib/schemas'
import { cn } from '@/lib/utils'

const KIND_LABEL = { rule: 'Kural', rl: 'RL', llm: 'LLM', external: 'MCP' } as const

const DEFAULTS: ExperimentCreateForm = {
  name: '',
  mode: 'replay',
  condition: 'C3',
  startDate: '2025-10-01',
  endDate: '2026-03-31',
  assets: [...ASSETS],
  agentIds: [
    'buy-hold-btc',
    'equal-weight',
    'ma-cross',
    'ppo',
    'llm-momentum',
    'llm-mean-reversion',
    'llm-sentiment',
    'llm-risk-averse',
  ],
  seed: 1,
  commissionRate: 0.001,
  slippageBps: 5,
}

function toggle<T>(list: T[], item: T) {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

function ChipGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
  error,
  render,
}: {
  legend: string
  options: readonly T[]
  value: T[]
  onChange: (v: T[]) => void
  error?: string
  render?: (o: T) => React.ReactNode
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm has-focus-visible:ring-2 has-focus-visible:ring-ring',
              value.includes(o) ? 'border-primary bg-primary/10' : 'text-muted-foreground',
            )}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={value.includes(o)}
              onChange={() => onChange(toggle(value, o))}
            />
            {render ? render(o) : o}
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  )
}

export default function NewExperimentPage() {
  const navigate = useNavigate()
  const agents = useAgents()
  const create = useCreateExperiment()

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExperimentCreateForm>({
    resolver: zodResolver(experimentCreateSchema),
    defaultValues: DEFAULTS,
  })

  const [mode, startDate, endDate] = useWatch({ control, name: ['mode', 'startDate', 'endDate'] })
  const touchesTestSet = overlapsTestWindow(startDate, mode === 'live' ? null : endDate)

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync({
        ...values,
        endDate: values.mode === 'live' ? null : values.endDate,
      })
      await navigate('/experiments')
    } catch (err) {
      if (err instanceof ApiError)
        for (const [field, message] of Object.entries(err.fields))
          setError(field as keyof ExperimentCreateForm, { message })
      setError('root', { message: err instanceof Error ? err.message : 'Kaydedilemedi.' })
    }
  })

  const agentName = (id: string) => agents.data?.find((a) => a.id === id)

  return (
    <>
      <PageTitle
        title="Yeni deney"
        subtitle="Varlık, dönem, ajan seti, koşul, seed ve maliyet parametreleriyle deney tanımlayın (F2)."
      />
      <form onSubmit={onSubmit} noValidate className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-4 lg:col-span-2">
          <CardHeader title="Genel" />
          <Field label="Deney adı" htmlFor="name" error={errors.name?.message}>
            <Input
              id="name"
              placeholder="örn. Doğrulama · C3 · seed 2"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mod" htmlFor="mode">
              <Select
                id="mode"
                {...register('mode', {
                  onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
                    e.target.value === 'live' && setValue('endDate', null),
                })}
              >
                <option value="replay">Replay (geçmiş veri)</option>
                <option value="live">Canlı paper-trading</option>
              </Select>
            </Field>
            <Field
              label="Deney koşulu"
              htmlFor="condition"
              hint="Ablasyon: hafıza ve forumun etkisi"
            >
              <Select id="condition" {...register('condition')}>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {CONDITION_LABELS[c]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Başlangıç" htmlFor="startDate" error={errors.startDate?.message}>
              <Input id="startDate" type="date" {...register('startDate')} />
            </Field>
            <Field label="Bitiş" htmlFor="endDate" error={errors.endDate?.message}>
              <Input
                id="endDate"
                type="date"
                disabled={mode === 'live'}
                aria-invalid={!!errors.endDate}
                {...register('endDate', { setValueAs: (v: string | null) => v || null })}
              />
            </Field>
          </div>

          {touchesTestSet && (
            <div
              role="status"
              className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs"
            >
              <AlertTriangle className="size-4 shrink-0 text-amber-500" />
              <p>
                Seçilen dönem test penceresiyle ({TEST_WINDOW.start} – {TEST_WINDOW.end}) çakışıyor.
                Look-ahead protokolü gereği test seti yalnızca nihai değerlendirmede açılmalıdır.
              </p>
            </div>
          )}

          <Controller
            control={control}
            name="assets"
            render={({ field }) => (
              <ChipGroup
                legend="Varlıklar (USDT paritesi)"
                options={ASSETS}
                value={field.value}
                onChange={field.onChange}
                error={errors.assets?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="agentIds"
            render={({ field }) => (
              <ChipGroup
                legend="Ajan seti"
                options={agents.data?.map((a) => a.id) ?? []}
                value={field.value}
                onChange={field.onChange}
                error={errors.agentIds?.message}
                render={(id) => {
                  const a = agentName(id)
                  return (
                    <>
                      <span className="text-[10px] uppercase opacity-70">
                        {a ? KIND_LABEL[a.kind] : ''}
                      </span>
                      {a?.name ?? id}
                    </>
                  )
                }}
              />
            )}
          />
        </Card>

        <Card className="space-y-4">
          <CardHeader
            title="Tekrarlanabilirlik ve maliyet"
            description="Aynı seed → birebir aynı sonuç (F3)"
          />
          <Field label="Seed" htmlFor="seed" error={errors.seed?.message}>
            <Input id="seed" type="number" {...register('seed', { valueAsNumber: true })} />
          </Field>
          <Field
            label="Komisyon oranı"
            htmlFor="commissionRate"
            error={errors.commissionRate?.message}
            hint="0,001 = %0,1"
          >
            <Input
              id="commissionRate"
              type="number"
              step="0.0001"
              {...register('commissionRate', { valueAsNumber: true })}
            />
          </Field>
          <Field label="Kayma (baz puan)" htmlFor="slippageBps" error={errors.slippageBps?.message}>
            <Input
              id="slippageBps"
              type="number"
              step="1"
              {...register('slippageBps', { valueAsNumber: true })}
            />
          </Field>
          <dl className="space-y-1 rounded-md bg-muted p-3 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Model</dt>
              <dd className="font-mono">qwen3.5-9b-q4_k_m</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Prompt sürümü</dt>
              <dd className="font-mono">decision-v3</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Yürütme</dt>
              <dd>t kapanış → t+1 açılış</dd>
            </div>
          </dl>
          {errors.root && (
            <p role="alert" className="text-sm text-destructive">
              {errors.root.message}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Kaydediliyor…' : 'Deneyi oluştur'}
            </Button>
            <Button variant="outline" onClick={() => void navigate(-1)}>
              Vazgeç
            </Button>
          </div>
        </Card>
      </form>
    </>
  )
}
