import { describe, expect, it } from 'vitest'
import {
  betaTrust,
  dailyReturns,
  herdCorrelation,
  maxDrawdown,
  pearson,
  sharpeRatio,
} from './metrics'

// Same cases as backend/tests/test_metrics.py so both implementations stay in sync.
describe('metrics', () => {
  it('sharpe is zero for flat or short series', () => {
    expect(sharpeRatio([0.01, 0.01, 0.01])).toBe(0)
    expect(sharpeRatio([0.01])).toBe(0)
  })

  it('sharpe annualises with sqrt(365)', () => {
    const r = [0.01, 0.02, -0.005, 0.015]
    expect(sharpeRatio(r, 1) * Math.sqrt(365)).toBeCloseTo(sharpeRatio(r))
  })

  it('max drawdown', () => {
    expect(maxDrawdown([100, 120, 90, 130, 65])).toBeCloseTo(0.5)
    expect(maxDrawdown([1, 2, 3])).toBe(0)
  })

  it('pearson extremes and herd correlation', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1)
    expect(pearson([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1)
    expect(
      herdCorrelation([
        [0.1, -0.2, 0.3],
        [0.1, -0.2, 0.3],
      ]),
    ).toBeCloseTo(1)
  })

  it('daily returns', () => {
    expect(dailyReturns([100, 110, 99])).toEqual([0.10000000000000009, -0.09999999999999998])
  })

  it('beta trust starts neutral', () => {
    expect(betaTrust(0, 0)).toBe(0.5)
    expect(betaTrust(3, 1)).toBeCloseTo(4 / 6)
  })
})
