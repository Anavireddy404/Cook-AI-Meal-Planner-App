import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Leaf, LoaderCircle } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { AppShell } from '@/components/layout/app-shell'

const LoginPage = lazy(() => import('@/pages/login-page').then((module) => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/register-page').then((module) => ({ default: module.RegisterPage })))
const DashboardPage = lazy(() => import('@/pages/dashboard-page').then((module) => ({ default: module.DashboardPage })))
const SearchPage = lazy(() => import('@/pages/search-page').then((module) => ({ default: module.SearchPage })))
const PreferencesPage = lazy(() => import('@/pages/preferences-page').then((module) => ({ default: module.PreferencesPage })))
const PlannerPage = lazy(() => import('@/pages/planner-page').then((module) => ({ default: module.PlannerPage })))
const ProfilePage = lazy(() => import('@/pages/profile-page').then((module) => ({ default: module.ProfilePage })))
const SubscriptionPage = lazy(() => import('@/pages/subscription-page').then((module) => ({ default: module.SubscriptionPage })))

function AppLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4" role="status" aria-live="polite">
      <div className="flex flex-col items-center text-center">
        <span className="relative flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary shadow-card">
          <Leaf className="size-6" aria-hidden="true" />
          <LoaderCircle className="absolute -right-1 -top-1 size-5 animate-spin rounded-full bg-card p-0.5 text-primary" aria-hidden="true" />
        </span>
        <p className="mt-4 text-sm font-semibold text-foreground">Preparing your table</p>
      </div>
    </div>
  )
}

function ProtectedLayout() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <AppLoading />

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <AppShell />
}

function App() {
  return (
    <Suspense fallback={<AppLoading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/preferences" element={<PreferencesPage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
