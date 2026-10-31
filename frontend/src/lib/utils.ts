import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const usd = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})
const pct = new Intl.NumberFormat('tr-TR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
})
const num = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'negative',
})

export const formatUsd = (v: number) => usd.format(v)
export const formatPct = (v: number) => pct.format(v)
export const formatNum = (v: number) => num.format(v)
export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
