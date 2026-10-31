// Mirrors backend/src/mindex/domain/metrics.py so prototype numbers match the real definitions.

const PERIODS_PER_YEAR = 365

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

function stdev(xs: number[]) {
  const m = mean(xs)
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1))
}

export function dailyReturns(equity: number[]) {
  return equity.slice(1).map((v, i) => v / equity[i]! - 1)
}

export function sharpeRatio(returns: number[], periodsPerYear = PERIODS_PER_YEAR) {
  if (returns.length < 2) return 0
  const sigma = stdev(returns)
  return sigma === 0 ? 0 : (mean(returns) / sigma) * Math.sqrt(periodsPerYear)
}

export function maxDrawdown(equity: number[]) {
  let peak = -Infinity
  let worst = 0
  for (const v of equity) {
    peak = Math.max(peak, v)
    worst = Math.max(worst, 1 - v / peak)
  }
  return worst
}

export function pearson(x: number[], y: number[]) {
  if (x.length !== y.length || x.length < 2) throw new Error('series must have equal length >= 2')
  const mx = mean(x)
  const my = mean(y)
  let cov = 0
  let vx = 0
  let vy = 0
  x.forEach((a, i) => {
    const b = y[i]!
    cov += (a - mx) * (b - my)
    vx += (a - mx) ** 2
    vy += (b - my) ** 2
  })
  return vx === 0 || vy === 0 ? 0 : cov / Math.sqrt(vx * vy)
}

export function herdCorrelation(series: number[][]) {
  const pairs: number[] = []
  for (let i = 0; i < series.length; i++)
    for (let j = i + 1; j < series.length; j++) pairs.push(pearson(series[i]!, series[j]!))
  return pairs.length ? mean(pairs) : 0
}

export function betaTrust(confirmed: number, refuted: number) {
  return (confirmed + 1) / (confirmed + refuted + 2)
}
