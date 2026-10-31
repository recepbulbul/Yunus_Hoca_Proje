import { describe, expect, it } from 'vitest'
import { seedExperiments } from './fixtures'
import { simulate } from './simulation'

const byId = (id: string) => seedExperiments().find((e) => e.id === id)!

describe('mock simulation', () => {
  it('is deterministic for the same seed (F3)', () => {
    const a = simulate(byId('exp-test-c3'))
    const b = simulate(byId('exp-test-c3'))
    expect(a.runs.map((r) => r.equity.at(-1))).toEqual(b.runs.map((r) => r.equity.at(-1)))
  })

  it('changes with a different seed', () => {
    const a = simulate(byId('exp-test-c3'))
    const b = simulate({ ...byId('exp-test-c3'), seed: 99 })
    const llm = (s: typeof a) => s.runs.find((r) => r.agent.id === 'llm-momentum')!.equity.at(-1)
    expect(llm(a)).not.toEqual(llm(b))
  })

  it('keeps portfolios long-only without leverage', () => {
    const sim = simulate(byId('exp-test-c3'))
    for (const run of sim.runs)
      for (const w of run.weights) {
        const values = Object.values(w)
        expect(Math.min(...values)).toBeGreaterThanOrEqual(0)
        expect(values.reduce((s, x) => s + x, 0)).toBeLessThanOrEqual(1 + 1e-9)
      }
  })

  it('C0 has neither memory nor forum', () => {
    const sim = simulate(byId('exp-test-c0'))
    expect(sim.memories).toHaveLength(0)
    expect(sim.forum).toHaveLength(0)
    expect(sim.decisions.every((d) => d.memories.length === 0)).toBe(true)
  })

  it('C3 never feeds flagged (prompt injection) messages to agents', () => {
    const sim = simulate(byId('exp-test-c3'))
    const flagged = new Set(sim.forum.filter((m) => m.flagged).map((m) => m.id))
    expect(flagged.size).toBeGreaterThan(0)
    expect(sim.decisions.some((d) => d.forumMessageIds.some((id) => flagged.has(id)))).toBe(false)
  })

  it('trust scores follow the Beta formula', () => {
    const sim = simulate(byId('exp-test-c3'))
    for (const t of sim.trust)
      expect(t.score).toBeCloseTo((t.confirmed + 1) / (t.confirmed + t.refuted + 2), 3)
  })

  it('post-mortem lessons carry a counterfactual table', () => {
    const sim = simulate(byId('exp-test-c3'))
    expect(sim.memories.length).toBeGreaterThan(0)
    for (const m of sim.memories) {
      expect(m.counterfactual.skip).toBe(0)
      expect(m.counterfactual.half).toBeCloseTo(m.counterfactual.actual / 2)
    }
  })
})
