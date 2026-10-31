import { describe, expect, it } from 'vitest'
import { experimentCreateSchema, overlapsTestWindow } from './schemas'

const valid = {
  name: 'Doğrulama C3',
  mode: 'replay',
  condition: 'C3',
  startDate: '2025-10-01',
  endDate: '2026-03-31',
  assets: ['BTC'],
  agentIds: ['buy-hold-btc', 'llm-momentum'],
  seed: 1,
  commissionRate: 0.001,
  slippageBps: 5,
}

describe('experimentCreateSchema', () => {
  it('accepts a valid replay config', () => {
    expect(experimentCreateSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts live mode without an end date', () => {
    expect(
      experimentCreateSchema.safeParse({ ...valid, mode: 'live', endDate: null }).success,
    ).toBe(true)
  })

  it.each([
    ['end before start', { endDate: '2025-09-01' }, 'endDate'],
    ['replay without end', { endDate: null }, 'endDate'],
    ['no assets', { assets: [] }, 'assets'],
    ['single agent', { agentIds: ['ppo'] }, 'agentIds'],
    ['commission too high', { commissionRate: 0.05 }, 'commissionRate'],
    ['unknown condition', { condition: 'C9' }, 'condition'],
  ])('rejects %s', (_, patch, field) => {
    const res = experimentCreateSchema.safeParse({ ...valid, ...patch })
    expect(res.success).toBe(false)
    expect(res.error?.issues.map((i) => i.path[0])).toContain(field)
  })
})

describe('overlapsTestWindow', () => {
  it('detects overlap with the sealed test window', () => {
    expect(overlapsTestWindow('2025-10-01', '2026-03-31')).toBe(false)
    expect(overlapsTestWindow('2026-03-01', '2026-04-15')).toBe(true)
    expect(overlapsTestWindow('2026-01-01', null)).toBe(true)
  })
})
