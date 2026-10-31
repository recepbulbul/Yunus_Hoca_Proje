import { delay, http, HttpResponse } from 'msw'
import {
  CONDITIONS,
  type AgentDetail,
  type AgentMetrics,
  type ApiErrorBody,
  type ConditionSummary,
  type Experiment,
  type ExperimentCreate,
  type LoginRequest,
  type LoginResponse,
  type Report,
  type Timeline,
  type UserRole,
} from '@/api/types'
import { dailyReturns, herdCorrelation, maxDrawdown, sharpeRatio } from '@/lib/metrics'
import { experimentCreateSchema } from '@/lib/schemas'
import { AGENTS, DEMO_USERS, LLM_AGENT_IDS, seedExperiments } from './fixtures'
import { getSimulation, type Simulation } from './simulation'

// Paths use a wildcard origin/prefix so they match both dev ("/api") and GitHub Pages ("/<repo>/api").
const API = '*/api'

let experiments = seedExperiments()
export const resetMockDb = () => {
  experiments = seedExperiments()
}

const error = (status: number, detail: string, fields?: Record<string, string>) =>
  HttpResponse.json({ detail, fields } satisfies ApiErrorBody, { status })

function roleOf(request: Request): UserRole | null {
  const m = /^Bearer mock\.(researcher|viewer)\./.exec(request.headers.get('Authorization') ?? '')
  return (m?.[1] as UserRole | undefined) ?? null
}

function findExperiment(id: string | readonly string[] | undefined) {
  return experiments.find((e) => e.id === id)
}

function metricsFor(sim: Simulation, agentId: string): AgentMetrics {
  const run = sim.runs.find((r) => r.agent.id === agentId)!
  const eq = run.equity.map((p) => p.equity)
  return {
    agentId,
    totalReturn: eq.at(-1)! / eq[0]! - 1,
    sharpe: sharpeRatio(dailyReturns(eq)),
    maxDrawdown: maxDrawdown(eq),
    trades: sim.trades.filter((t) => t.agentId === agentId).length,
  }
}

function llmHerd(sim: Simulation) {
  const series = sim.runs
    .filter((r) => r.agent.kind === 'llm')
    .map((r) =>
      r.weights.slice(1).map((w, i) => {
        const prev = r.weights[i]!
        return (
          Object.values(w).reduce((s, x) => s + x, 0) -
          Object.values(prev).reduce((s, x) => s + x, 0)
        )
      }),
    )
  return herdCorrelation(series)
}

const SEEDS = [1, 2, 3, 4, 5]

// Mock aggregate over 5 seeds; the backend replaces min/max with a block-bootstrap 95% CI.
function conditionSummaries(exp: Experiment): ConditionSummary[] {
  if (!exp.agentIds.some((id) => LLM_AGENT_IDS.includes(id))) return []
  return CONDITIONS.map((condition) => {
    const perSeed = SEEDS.map((seed) => {
      const sim = getSimulation({ ...exp, id: `${exp.id}-${condition}-${seed}`, condition, seed })
      const llm = LLM_AGENT_IDS.filter((id) => exp.agentIds.includes(id)).map((id) =>
        metricsFor(sim, id),
      )
      const avg = (f: (x: AgentMetrics) => number) => llm.reduce((s, x) => s + f(x), 0) / llm.length
      return {
        sharpe: avg((x) => x.sharpe),
        mdd: avg((x) => x.maxDrawdown),
        ret: avg((x) => x.totalReturn),
        herd: llmHerd(sim),
        lessons: sim.memories.length,
      }
    })
    const mean = (f: (x: (typeof perSeed)[number]) => number) =>
      perSeed.reduce((s, x) => s + f(x), 0) / perSeed.length
    const sharpes = perSeed.map((x) => x.sharpe).sort((a, b) => a - b)
    return {
      condition,
      sharpeMean: mean((x) => x.sharpe),
      sharpeCiLow: sharpes[0]!,
      sharpeCiHigh: sharpes.at(-1)!,
      maxDrawdown: mean((x) => x.mdd),
      totalReturn: mean((x) => x.ret),
      herdCorrelation: mean((x) => x.herd),
      lessonConsistency: condition === 'C0' ? null : 0.9 + (mean((x) => x.lessons) % 7) / 100,
    }
  })
}

export const handlers = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    await delay()
    const body = (await request.json()) as LoginRequest
    const user = DEMO_USERS[body.email.toLowerCase()]
    if (!user || user.password !== body.password) return error(401, 'E-posta veya parola hatalı.')
    return HttpResponse.json({
      token: `mock.${user.role}.${crypto.randomUUID()}`,
      user: { email: body.email.toLowerCase(), role: user.role },
    } satisfies LoginResponse)
  }),

  // Every route below requires a bearer token (F1).
  http.all(`${API}/*`, ({ request }) => {
    if (!roleOf(request)) return error(401, 'Oturum gerekli.')
    return undefined
  }),

  http.get(`${API}/agents`, () => HttpResponse.json(AGENTS)),

  http.get(`${API}/experiments`, async () => {
    await delay()
    return HttpResponse.json(
      [...experiments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    )
  }),

  http.post(`${API}/experiments`, async ({ request }) => {
    await delay()
    if (roleOf(request) !== 'researcher')
      return error(403, 'Deney oluşturmak için araştırmacı rolü gerekir.')
    const parsed = experimentCreateSchema.safeParse(await request.json())
    if (!parsed.success) {
      const fields = Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join('.'), i.message]),
      )
      return error(422, 'Geçersiz deney yapılandırması.', fields)
    }
    const body: ExperimentCreate = parsed.data
    const exp: Experiment = {
      ...body,
      id: `exp-${crypto.randomUUID().slice(0, 8)}`,
      status: 'draft',
      modelVersion: 'qwen3.5-9b-q4_k_m',
      promptVersion: 'decision-v3',
      createdAt: new Date().toISOString(),
    }
    experiments.push(exp)
    return HttpResponse.json(exp, { status: 201 })
  }),

  http.get(`${API}/experiments/:id`, ({ params }) => {
    const exp = findExperiment(params.id)
    return exp ? HttpResponse.json(exp) : error(404, 'Deney bulunamadı.')
  }),

  http.post(`${API}/experiments/:id/start`, ({ params, request }) => {
    if (roleOf(request) !== 'researcher') return error(403, 'Yetkisiz.')
    const exp = findExperiment(params.id)
    if (!exp) return error(404, 'Deney bulunamadı.')
    if (exp.status !== 'draft' && exp.status !== 'paused')
      return error(409, `"${exp.status}" durumundaki deney başlatılamaz.`)
    exp.status = 'completed' // mock runs instantly; the real worker streams progress
    return HttpResponse.json(exp)
  }),

  http.get(`${API}/experiments/:id/export.yaml`, ({ params }) => {
    const exp = findExperiment(params.id)
    if (!exp) return error(404, 'Deney bulunamadı.')
    const yaml = [
      `# Mindex deney yapılandırması (F2)`,
      `name: "${exp.name}"`,
      `mode: ${exp.mode}`,
      `condition: ${exp.condition}`,
      `period:`,
      `  start: ${exp.startDate}`,
      `  end: ${exp.endDate ?? 'null'}`,
      `assets: [${exp.assets.join(', ')}]`,
      `agents:`,
      ...exp.agentIds.map((a) => `  - ${a}`),
      `seed: ${exp.seed}`,
      `execution:`,
      `  commission_rate: ${exp.commissionRate}`,
      `  slippage_bps: ${exp.slippageBps}`,
      `llm:`,
      `  model: ${exp.modelVersion}`,
      `  prompt_version: ${exp.promptVersion}`,
      '',
    ].join('\n')
    return new HttpResponse(yaml, { headers: { 'Content-Type': 'application/yaml' } })
  }),

  http.get(`${API}/experiments/:id/timeline`, async ({ params }) => {
    await delay()
    const exp = findExperiment(params.id)
    if (!exp) return error(404, 'Deney bulunamadı.')
    if (exp.status === 'draft') return error(409, 'Deney henüz başlatılmadı.')
    const { experimentId, days, regimes, candles, runs, trades } = getSimulation(exp)
    return HttpResponse.json({
      experimentId,
      days,
      regimes,
      candles,
      runs,
      trades,
    } satisfies Timeline)
  }),

  http.get(`${API}/experiments/:id/agents/:agentId`, async ({ params }) => {
    await delay()
    const exp = findExperiment(params.id)
    if (!exp || exp.status === 'draft') return error(404, 'Deney bulunamadı.')
    const sim = getSimulation(exp)
    const run = sim.runs.find((r) => r.agent.id === params.agentId)
    if (!run) return error(404, 'Ajan bu deneyde yok.')
    return HttpResponse.json({
      agent: run.agent,
      equity: run.equity,
      decisions: sim.decisions.filter((d) => d.agentId === run.agent.id).reverse(),
      trustGiven: sim.trust.filter((t) => t.trusterId === run.agent.id),
      trustReceived: sim.trust.filter((t) => t.trusteeId === run.agent.id),
    } satisfies AgentDetail)
  }),

  http.get(`${API}/experiments/:id/memories`, async ({ params, request }) => {
    await delay()
    const exp = findExperiment(params.id)
    if (!exp || exp.status === 'draft') return error(404, 'Deney bulunamadı.')
    const url = new URL(request.url)
    const regime = url.searchParams.get('regime')
    const agent = url.searchParams.get('agent')
    const q = url.searchParams.get('q')?.toLocaleLowerCase('tr') ?? ''
    const items = getSimulation(exp)
      .memories.filter(
        (x) =>
          (!regime || x.regime === regime) &&
          (!agent || x.agentId === agent) &&
          (!q || x.lesson.toLocaleLowerCase('tr').includes(q)),
      )
      .sort((a, b) => b.importance - a.importance)
    return HttpResponse.json(items)
  }),

  http.get(`${API}/experiments/:id/forum`, async ({ params }) => {
    await delay()
    const exp = findExperiment(params.id)
    if (!exp || exp.status === 'draft') return error(404, 'Deney bulunamadı.')
    const { forum, trust, trustHistory } = getSimulation(exp)
    return HttpResponse.json({ messages: [...forum].reverse(), trust, trustHistory })
  }),

  http.get(`${API}/experiments/:id/report`, async ({ params }) => {
    await delay()
    const exp = findExperiment(params.id)
    if (!exp || exp.status === 'draft') return error(404, 'Deney bulunamadı.')
    const sim = getSimulation(exp)
    return HttpResponse.json({
      experimentId: exp.id,
      agents: sim.runs.map((r) => metricsFor(sim, r.agent.id)),
      benchmark: metricsFor(
        getSimulation({ ...exp, id: `${exp.id}-benchmark`, agentIds: ['buy-hold-btc'] }),
        'buy-hold-btc',
      ),
      herdCorrelation: llmHerd(sim),
      conditions: exp.mode === 'replay' ? conditionSummaries(exp) : [],
    } satisfies Report)
  }),
]
