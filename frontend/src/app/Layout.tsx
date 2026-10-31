import { Activity, BarChart3, FlaskConical, LogOut, MessagesSquare } from 'lucide-react'
import { Link, NavLink, Outlet, useParams } from 'react-router'
import { useAuth } from '@/auth/AuthContext'
import { Badge } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors [&_svg]:size-4',
    isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
  )

export function Layout() {
  const { user, logout } = useAuth()
  const { id } = useParams()

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-2">
        İçeriğe geç
      </a>
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <Link to="/experiments" className="flex items-center gap-2 font-semibold">
            <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
              M
            </span>
            Mindex
          </Link>
          <nav aria-label="Ana menü" className="flex items-center gap-1 overflow-x-auto">
            <NavLink to="/experiments" end className={navClass}>
              <FlaskConical /> Deneyler
            </NavLink>
            {id && (
              <>
                <NavLink to={`/experiments/${id}/live`} className={navClass}>
                  <Activity /> Canlı borsa
                </NavLink>
                <NavLink to={`/experiments/${id}/forum`} className={navClass}>
                  <MessagesSquare /> Forum & hafıza
                </NavLink>
                <NavLink to={`/experiments/${id}/report`} className={navClass}>
                  <BarChart3 /> Rapor
                </NavLink>
              </>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{user?.email}</span>
            <Badge tone={user?.role === 'researcher' ? 'info' : 'neutral'}>
              {user?.role === 'researcher' ? 'Araştırmacı' : 'İzleyici'}
            </Badge>
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Çıkış yap">
              <LogOut />
            </Button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-7xl px-4 pb-6 text-xs text-muted-foreground print:hidden">
        Prototip · tüm veriler sahte (MSW) · gerçek para kullanılmaz
      </footer>
    </div>
  )
}
