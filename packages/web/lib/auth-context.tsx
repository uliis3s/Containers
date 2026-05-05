'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import Cookies from 'js-cookie'
import { api, setTokens, clearTokens } from './api'
import type { AuthUser } from '@/types'

interface AuthCtx {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = Cookies.get('auth_user')
    if (raw) {
      try {
        setUser(JSON.parse(raw))
      } catch {
        clearTokens()
      }
    }
    setLoading(false)
  }, [])

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password })
    const { accessToken, refreshToken, user: u } = data.data
    setTokens(accessToken, refreshToken)
    Cookies.set('auth_user', JSON.stringify(u), { expires: 7 })
    setUser(u)
  }

  function logout() {
    clearTokens()
    setUser(null)
    window.location.href = '/login'
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
