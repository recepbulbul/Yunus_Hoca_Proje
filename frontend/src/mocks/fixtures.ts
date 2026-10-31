import type { Agent, Experiment, UserRole } from '@/api/types'
import { ASSETS } from '@/api/types'

export const AGENTS: Agent[] = [
  { id: 'buy-hold-btc', name: 'Al-ve-tut BTC', kind: 'rule', persona: null },
  { id: 'equal-weight', name: 'Eşit ağırlık', kind: 'rule', persona: null },
  { id: 'ma-cross', name: 'MA kesişimi (10/30)', kind: 'rule', persona: null },
  { id: 'ppo', name: 'PPO', kind: 'rl', persona: null },
  {
    id: 'llm-momentum',
    name: 'LLM · Momentum',
    kind: 'llm',
    persona: 'Trendi takip eder; güçlenen varlıklara ağırlık verir.',
  },
  {
    id: 'llm-mean-reversion',
    name: 'LLM · Ortalamaya dönüş',
    kind: 'llm',
    persona: 'Sert düşüşlerden sonra tepki alımı arar.',
  },
  {
    id: 'llm-sentiment',
    name: 'LLM · Duyarlılık',
    kind: 'llm',
    persona: 'Fear & Greed ve funding oranına göre pozisyon alır.',
  },
  {
    id: 'llm-risk-averse',
    name: 'LLM · Riskten kaçınan',
    kind: 'llm',
    persona: 'Sermayeyi korumayı önceler; ayı rejiminde nakde geçer.',
  },
  {
    id: 'mcp-guest',
    name: 'MCP misafir ajanı',
    kind: 'external',
    persona: 'MCP sunucusu üzerinden katılan dış LLM ajanı.',
  },
]

export const LLM_AGENT_IDS = AGENTS.filter((a) => a.kind === 'llm').map((a) => a.id)
const CORE_AGENT_IDS = AGENTS.filter((a) => a.kind !== 'external').map((a) => a.id)

const base = {
  assets: [...ASSETS],
  commissionRate: 0.001,
  slippageBps: 5,
  modelVersion: 'qwen3.5-9b-q4_k_m',
  promptVersion: 'decision-v3',
} as const

export const seedExperiments = (): Experiment[] => [
  {
    ...base,
    assets: [...base.assets],
    id: 'exp-test-c3',
    name: 'Test dönemi · güven ağırlıklı forum',
    mode: 'replay',
    condition: 'C3',
    status: 'completed',
    startDate: '2026-04-01',
    endDate: '2026-09-30',
    agentIds: [...CORE_AGENT_IDS, 'mcp-guest'],
    seed: 1,
    createdAt: '2026-10-02T09:12:00Z',
  },
  {
    ...base,
    assets: [...base.assets],
    id: 'exp-test-c2',
    name: 'Test dönemi · düz forum',
    mode: 'replay',
    condition: 'C2',
    status: 'completed',
    startDate: '2026-04-01',
    endDate: '2026-09-30',
    agentIds: CORE_AGENT_IDS,
    seed: 1,
    createdAt: '2026-10-02T09:10:00Z',
  },
  {
    ...base,
    assets: [...base.assets],
    id: 'exp-test-c0',
    name: 'Test dönemi · hafızasız (kontrol)',
    mode: 'replay',
    condition: 'C0',
    status: 'completed',
    startDate: '2026-04-01',
    endDate: '2026-09-30',
    agentIds: CORE_AGENT_IDS,
    seed: 1,
    createdAt: '2026-10-02T09:05:00Z',
  },
  {
    ...base,
    assets: [...base.assets],
    id: 'exp-live-c3',
    name: 'Canlı ileri test · paper-trading',
    mode: 'live',
    condition: 'C3',
    status: 'running',
    startDate: '2026-10-01',
    endDate: null,
    agentIds: CORE_AGENT_IDS,
    seed: 7,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    ...base,
    assets: ['BTC', 'ETH', 'SOL'],
    id: 'exp-val-c1',
    name: 'Doğrulama · prompt ayarı',
    mode: 'replay',
    condition: 'C1',
    status: 'draft',
    startDate: '2025-10-01',
    endDate: '2026-03-31',
    agentIds: CORE_AGENT_IDS,
    seed: 3,
    createdAt: '2026-10-20T14:30:00Z',
  },
]

/** Demo accounts shown on the login screen. Mock only: the real API uses Argon2id hashes. */
export const DEMO_USERS: Record<string, { password: string; role: UserRole }> = {
  'arastirmaci@mindex.dev': { password: 'mindex-demo', role: 'researcher' },
  'izleyici@mindex.dev': { password: 'mindex-demo', role: 'viewer' },
}
