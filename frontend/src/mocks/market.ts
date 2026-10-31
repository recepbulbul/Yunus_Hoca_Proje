import { ASSETS, type Asset, type Candle, type Regime } from '@/api/types'
import { createRng, dayRange } from './random'

// One shared synthetic market, independent of experiment seed, so every experiment
// over the same dates sees the same prices (as with real Binance snapshots).
export const MARKET_START = '2025-08-01'
export const MARKET_END = '2026-10-30'

const PROFILE: Record<Asset, { price: number; beta: number; vol: number }> = {
  BTC: { price: 82_000, beta: 1.0, vol: 0.012 },
  ETH: { price: 1_850, beta: 1.2, vol: 0.02 },
  SOL: { price: 125, beta: 1.45, vol: 0.03 },
  BNB: { price: 590, beta: 0.8, vol: 0.014 },
  XRP: { price: 2.1, beta: 1.1, vol: 0.028 },
}

export interface Market {
  days: string[]
  index: Map<string, number>
  candles: Record<Asset, Candle[]>
  regimes: Regime[]
}

function buildMarket(): Market {
  const rng = createRng(2026)
  const days = dayRange(MARKET_START, MARKET_END)
  const candles = Object.fromEntries(ASSETS.map((a) => [a, [] as Candle[]])) as Record<
    Asset,
    Candle[]
  >
  const last = Object.fromEntries(ASSETS.map((a) => [a, PROFILE[a].price])) as Record<Asset, number>

  // Market factor follows slow drift "seasons" to create bull / bear / sideways stretches.
  let drift = 0.001
  days.forEach((time, i) => {
    if (i % 45 === 0) drift = rng.pick([0.004, 0.002, 0, -0.001, -0.004])
    const factor = drift + 0.022 * rng.normal()
    for (const a of ASSETS) {
      const p = PROFILE[a]
      const r = p.beta * factor + p.vol * rng.normal()
      const open = last[a]
      const close = open * Math.exp(r)
      const wick = Math.abs(rng.normal()) * 0.012 + 0.003
      candles[a].push({
        time,
        open,
        close,
        high: Math.max(open, close) * (1 + wick),
        low: Math.min(open, close) * (1 - wick * 0.9),
        volume: Math.round((1e9 / p.price) * (0.6 + rng.next())),
      })
      last[a] = close
    }
  })

  const btc = candles.BTC.map((c) => c.close)
  const regimes = btc.map((c, i): Regime => {
    const r20 = i >= 20 ? c / btc[i - 20]! - 1 : 0
    return r20 > 0.06 ? 'bull' : r20 < -0.06 ? 'bear' : 'sideways'
  })

  return { days, index: new Map(days.map((d, i) => [d, i])), candles, regimes }
}

let cached: Market | undefined
export const getMarket = () => (cached ??= buildMarket())
