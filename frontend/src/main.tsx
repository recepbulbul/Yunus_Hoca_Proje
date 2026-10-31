import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { createQueryClient, Providers } from './app/providers'
import { routes } from './app/routes'
import './index.css'

async function enableMocking() {
  // The prototype (dev + GitHub Pages) runs entirely on the MSW mock API.
  if (!import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS !== 'true') return
  const { startMockApi } = await import('./mocks/browser')
  await startMockApi()
}

const router = createBrowserRouter(routes, {
  basename: import.meta.env.BASE_URL.replace(/\/$/, ''),
})
const queryClient = createQueryClient()

await enableMocking()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers client={queryClient}>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
)
