import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp, signIn } from '@/test/render'

describe('login (F1)', () => {
  it('redirects anonymous users to login', async () => {
    const { router } = renderApp('/experiments')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })

  it('shows field validation before calling the API', async () => {
    const { user } = renderApp('/login')
    await user.click(screen.getByRole('button', { name: 'Giriş yap' }))
    expect(await screen.findByText('Geçerli bir e-posta girin')).toBeInTheDocument()
  })

  it('rejects wrong credentials', async () => {
    const { user } = renderApp('/login')
    await user.type(screen.getByLabelText('E-posta'), 'arastirmaci@mindex.dev')
    await user.type(screen.getByLabelText('Parola'), 'yanlis-parola')
    await user.click(screen.getByRole('button', { name: 'Giriş yap' }))
    expect(await screen.findByText('E-posta veya parola hatalı.')).toBeInTheDocument()
  })

  it('logs in with a demo account and lands on experiments', async () => {
    const { user, router } = renderApp('/login')
    await user.click(screen.getByRole('button', { name: /Araştırmacı · arastirmaci/ }))
    await user.click(screen.getByRole('button', { name: 'Giriş yap' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/experiments'))
    expect(await screen.findByText('Test dönemi · güven ağırlıklı forum')).toBeInTheDocument()
  })
})

describe('roles', () => {
  it('viewer cannot open the new experiment form', async () => {
    signIn('viewer')
    const { router } = renderApp('/experiments/new')
    await waitFor(() => expect(router.state.location.pathname).toBe('/experiments'))
    expect(screen.queryByRole('link', { name: /Yeni deney/ })).not.toBeInTheDocument()
  })
})

describe('experiment setup (F2)', () => {
  it('validates and creates a draft experiment', async () => {
    signIn('researcher')
    const { user, router } = renderApp('/experiments/new')
    const submit = await screen.findByRole('button', { name: 'Deneyi oluştur' })

    await user.click(submit)
    expect(await screen.findByText('En az 3 karakter')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Deney adı'), 'Yeni doğrulama deneyi')
    await user.click(submit)

    await waitFor(() => expect(router.state.location.pathname).toBe('/experiments'))
    const row = (await screen.findByText('Yeni doğrulama deneyi')).closest('tr')!
    expect(within(row).getByText('Taslak')).toBeInTheDocument()
  })

  it('warns when the period touches the sealed test window', async () => {
    signIn('researcher')
    const { user } = renderApp('/experiments/new')
    const end = await screen.findByLabelText('Bitiş')
    await user.clear(end)
    await user.type(end, '2026-05-01')
    expect(await screen.findByText(/test penceresiyle/)).toBeInTheDocument()
  })
})

describe('live screen (F5)', () => {
  it('shows chart, leaderboard and replay controls', async () => {
    signIn('viewer')
    const { user } = renderApp('/experiments/exp-test-c3/live')
    expect(await screen.findByRole('img', { name: /BTC\/USDT/ })).toBeInTheDocument()
    expect(screen.getByText('Lider tablosu')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /LLM · Momentum/ })).toBeInTheDocument()

    const slider = screen.getByLabelText('Simülasyon günü')
    expect(slider).toHaveValue('30')
    await user.click(screen.getByRole('button', { name: 'Sona git' }))
    expect(slider).toHaveValue('182')
  })

  it('explains that a draft has not started', async () => {
    signIn('viewer')
    renderApp('/experiments/exp-val-c1/live')
    expect(await screen.findByText('Bu deney henüz başlatılmadı.')).toBeInTheDocument()
  })
})

describe('agent detail (F6)', () => {
  it('lists decisions with rationale and trust scores', async () => {
    signIn('viewer')
    renderApp('/experiments/exp-test-c3/agents/llm-momentum')
    expect(await screen.findByRole('heading', { name: 'LLM · Momentum' })).toBeInTheDocument()
    expect(await screen.findByText('Kararlar ve gerekçeleri')).toBeInTheDocument()
    expect(screen.getByText(/183 karar/)).toBeInTheDocument()
    expect(screen.getByText('Güven skorları')).toBeInTheDocument()
  })
})

describe('forum and memory (F7)', () => {
  it('marks prompt-injection messages as filtered', async () => {
    signIn('viewer')
    const { user } = renderApp('/experiments/exp-test-c3/forum')
    await user.click(await screen.findByLabelText('Yalnızca filtrelenenler'))
    expect(await screen.findByText(/ajanlara iletilmedi/)).toBeInTheDocument()
  })

  it('filters lessons by regime', async () => {
    signIn('viewer')
    const { user } = renderApp('/experiments/exp-test-c3/forum')
    await user.click(await screen.findByRole('tab', { name: 'Hafıza tarayıcı' }))
    await screen.findByText(/\d+ ders/)
    await user.selectOptions(screen.getByLabelText('Rejim'), 'bear')
    await waitFor(() => {
      const badges = screen.getAllByText(/^(Boğa|Ayı|Yatay)$/).filter((el) => el.tagName === 'SPAN')
      expect(badges.length).toBeGreaterThan(0)
      expect(badges.every((b) => b.textContent === 'Ayı')).toBe(true)
    })
  })
})

describe('report (F8)', () => {
  it('shows agent metrics and the condition comparison', async () => {
    signIn('viewer')
    renderApp('/experiments/exp-test-c3/report')
    expect(await screen.findByText('Ajan metrikleri')).toBeInTheDocument()
    expect(screen.getByText(/Koşul karşılaştırması/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /CSV/ })).toBeInTheDocument()
  })
})
