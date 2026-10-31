import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, onUnauthorized, tokenStore } from '@/api/client'
import type { LoginRequest, LoginResponse, User } from '@/api/types'

const USER_KEY = 'mindex.user'

interface AuthState {
  user: User | null
  login: (req: LoginRequest) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

function readUser(): User | null {
  if (!tokenStore.get()) return null
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY) ?? 'null') as User | null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readUser)
  const qc = useQueryClient()

  const logout = useCallback(() => {
    tokenStore.clear()
    sessionStorage.removeItem(USER_KEY)
    qc.clear()
    setUser(null)
  }, [qc])

  useEffect(() => onUnauthorized(logout), [logout])

  const login = useCallback(async (req: LoginRequest) => {
    const res = await api.post<LoginResponse>('/auth/login', req)
    tokenStore.set(res.token)
    sessionStorage.setItem(USER_KEY, JSON.stringify(res.user))
    setUser(res.user)
    return res.user
  }, [])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])
  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
