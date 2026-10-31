import { z } from 'zod'
import { ASSETS, CONDITIONS } from '@/api/types'

// Test window is sealed until final evaluation (look-ahead bias protocol).
export const TEST_WINDOW = { start: '2026-04-01', end: '2026-09-30' } as const

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-AA-GG olmalı')

export const loginSchema = z.object({
  email: z.email('Geçerli bir e-posta girin'),
  password: z.string().min(8, 'Parola en az 8 karakter olmalı'),
})
export type LoginForm = z.infer<typeof loginSchema>

export const experimentCreateSchema = z
  .object({
    name: z.string().trim().min(3, 'En az 3 karakter').max(120, 'En fazla 120 karakter'),
    mode: z.enum(['replay', 'live']),
    condition: z.enum(CONDITIONS),
    startDate: isoDate,
    endDate: isoDate.nullable(),
    assets: z.array(z.enum(ASSETS)).min(1, 'En az bir varlık seçin'),
    agentIds: z.array(z.string()).min(2, 'En az iki ajan seçin'),
    seed: z
      .number()
      .int('Tam sayı olmalı')
      .min(0)
      .max(2 ** 31 - 1),
    commissionRate: z.number().min(0).max(0.01, 'En fazla %1'),
    slippageBps: z.number().min(0).max(100, 'En fazla 100 bp'),
  })
  .refine((v) => v.mode === 'live' || v.endDate !== null, {
    path: ['endDate'],
    message: 'Replay modunda bitiş tarihi zorunlu',
  })
  .refine((v) => v.endDate === null || v.endDate > v.startDate, {
    path: ['endDate'],
    message: 'Bitiş, başlangıçtan sonra olmalı',
  })

export type ExperimentCreateForm = z.infer<typeof experimentCreateSchema>

export const overlapsTestWindow = (start: string, end: string | null) =>
  start <= TEST_WINDOW.end && (end ?? '9999-12-31') >= TEST_WINDOW.start
