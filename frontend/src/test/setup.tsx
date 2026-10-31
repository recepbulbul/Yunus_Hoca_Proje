import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { handlers, resetMockDb } from '@/mocks/handlers'

// Canvas charts cannot render in jsdom; tests assert on data, not pixels.
vi.mock('@/components/charts/charts', () => ({
  CandleChart: ({ label }: { label: string }) => <div role="img" aria-label={label} />,
  MultiLineChart: ({ label }: { label: string }) => <div role="img" aria-label={label} />,
}))

export const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetMockDb()
  sessionStorage.clear()
})
afterAll(() => server.close())
