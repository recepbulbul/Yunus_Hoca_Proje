/** Deterministic PRNG (mulberry32) so the prototype shows identical data for the same seed (F3). */
export function createRng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    normal: () => {
      const u = Math.max(next(), 1e-12)
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next())
    },
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)]!,
    chance: (p: number) => next() < p,
  }
}

export type Rng = ReturnType<typeof createRng>

export function dayRange(start: string, end: string) {
  const DAY_MS = 86_400_000
  const out: string[] = []
  const last = Date.parse(`${end}T00:00:00Z`)
  for (let t = Date.parse(`${start}T00:00:00Z`); t <= last; t += DAY_MS)
    out.push(new Date(t).toISOString().slice(0, 10))
  return out
}
