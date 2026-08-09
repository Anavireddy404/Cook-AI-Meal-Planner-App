import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type HealthProfile, type User } from '@/lib/api'

const STORAGE_KEY = 'meal-planner-auth'

interface StoredAuth {
  userId: string
  username: string
  token: string
}

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (
    username: string,
    password: string,
    preferences: string[],
    healthProfile: HealthProfile,
  ) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as StoredAuth
    return value.userId && value.token ? value : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const userId = user?._id

  useEffect(() => {
    const stored = readStoredAuth()
    if (!stored) {
      setIsLoading(false)
      return
    }

    api
      .getUser(stored.userId)
      .then(setUser)
      .catch(() => localStorage.removeItem(STORAGE_KEY))
      .finally(() => setIsLoading(false))
  }, [])

  async function login(username: string, password: string) {
    const { userId, token } = await api.login(username, password)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, username, token }))
    const freshUser = await api.getUser(userId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, username: freshUser.username, token }))
    setUser(freshUser)
  }

  async function register(
    username: string,
    password: string,
    preferences: string[],
    healthProfile: HealthProfile,
  ) {
    const { user: newUser, token } = await api.register(username, password, preferences, healthProfile)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId: newUser._id, username: newUser.username, token }))
    setUser(newUser)
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  const refreshUser = useCallback(async () => {
    if (!userId) return
    const freshUser = await api.getUser(userId)
    setUser(freshUser)
  }, [userId])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
