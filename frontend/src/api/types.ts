// API contract shared by the MSW mock and (from P5) the FastAPI backend.
// In P4 these are generated from OpenAPI; keep names aligned with docs/06-data-dictionary.md.

export const ASSETS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP'] as const
export type Asset = (typeof ASSETS)[number]

export const CONDITIONS = ['C0', 'C1', 'C1_NO_REGIME', 'C2', 'C3'] as const
export type Condition = (typeof CONDITIONS)[number]

export const CONDITION_LABELS: Record<Condition, string> = {
  C0: 'C0 · Hafızasız',
  C1: 'C1 · Kişisel hafıza',
  C1_NO_REGIME: 'C1′ · Rejimsiz hafıza',
  C2: 'C2 · Düz forum',
  C3: 'C3 · Güven ağırlıklı forum',
}

export type UserRole = 'researcher' | 'viewer'
export type ExperimentMode = 'replay' | 'live'
export type ExperimentStatus = 'draft' | 'queued' | 'running' | 'paused' | 'completed' | 'failed'
export type AgentKind = 'rule' | 'rl' | 'llm' | 'external'
export type Regime = 'bull' | 'bear' | 'sideways'
export type Stance = 'bullish' | 'bearish' | 'neutral'

export interface User {
  email: string
  role: UserRole
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface Agent {
  id: string
  name: string
  kind: AgentKind
  persona: string | null
}

export interface Experiment {
  id: string
  name: string
  mode: ExperimentMode
  condition: Condition
  status: ExperimentStatus
  startDate: string
  endDate: string | null
  assets: Asset[]
  agentIds: string[]
  seed: number
  commissionRate: number
  slippageBps: number
  modelVersion: string
  promptVersion: string
  createdAt: string
}

export type ExperimentCreate = Pick<
  Experiment,
  | 'name'
  | 'mode'
  | 'condition'
  | 'startDate'
  | 'endDate'
  | 'assets'
  | 'agentIds'
  | 'seed'
  | 'commissionRate'
  | 'slippageBps'
>

export interface Candle {
  time: string // YYYY-MM-DD (UTC)
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Trade {
  id: string
  agentId: string
  day: string
  asset: Asset
  side: 'buy' | 'sell'
  quantity: number
  price: number
  fee: number
}

export interface EquityPoint {
  day: string
  equity: number
}

export interface AgentRun {
  agent: Agent
  equity: EquityPoint[]
  weights: Record<Asset, number>[] // target weights per day
}

export interface Timeline {
  experimentId: string
  days: string[]
  regimes: Regime[]
  candles: Record<Asset, Candle[]>
  runs: AgentRun[]
  trades: Trade[]
}

export interface MemoryRef {
  id: string
  score: number
}

export interface Decision {
  id: string
  agentId: string
  day: string
  targetWeights: Partial<Record<Asset, number>>
  confidence: number
  rationale: string
  regime: Regime
  attempts: number
  heldPosition: boolean
  latencyMs: number
  memories: MemoryRef[]
  forumMessageIds: string[]
}

export interface Counterfactual {
  actual: number
  skip: number
  half: number
  stopLoss: number
}

export interface Memory {
  id: string
  agentId: string
  day: string
  lesson: string
  counterfactual: Counterfactual
  regime: Regime
  importance: number
}

export interface ForumMessage {
  id: string
  senderId: string
  day: string
  content: string
  asset: Asset
  stance: Stance
  flagged: boolean
  verified: boolean | null
}

export interface TrustScore {
  trusterId: string
  trusteeId: string
  confirmed: number
  refuted: number
  score: number
}

export interface TrustHistoryPoint {
  day: string
  trusteeId: string
  score: number // mean trust other agents place in trustee
}

export interface AgentDetail {
  agent: Agent
  equity: EquityPoint[]
  decisions: Decision[]
  trustGiven: TrustScore[]
  trustReceived: TrustScore[]
}

export interface AgentMetrics {
  agentId: string
  totalReturn: number
  sharpe: number
  maxDrawdown: number
  trades: number
}

export interface ConditionSummary {
  condition: Condition
  sharpeMean: number
  sharpeCiLow: number
  sharpeCiHigh: number
  maxDrawdown: number
  totalReturn: number
  herdCorrelation: number
  lessonConsistency: number | null
}

export interface Report {
  experimentId: string
  agents: AgentMetrics[]
  benchmark: AgentMetrics
  herdCorrelation: number
  conditions: ConditionSummary[]
}

export interface ApiErrorBody {
  detail: string
  fields?: Record<string, string>
}
