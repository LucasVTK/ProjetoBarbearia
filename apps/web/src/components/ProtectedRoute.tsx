import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated   = useAuthStore(s => s.isAuthenticated)
  const hydrated          = useAuthStore(s => s._hydrated)
  const accessToken       = useAuthStore(s => s.accessToken)
  const sessionChecked    = useAuthStore(s => s.sessionChecked)
  const bootstrapSession  = useAuthStore(s => s.bootstrapSession)

  // F5 apaga o access token (memória) — renova em silêncio pelo cookie
  const needsBootstrap = hydrated && isAuthenticated && !accessToken && !sessionChecked

  useEffect(() => {
    if (needsBootstrap) bootstrapSession()
  }, [needsBootstrap, bootstrapSession])

  // Aguarda o store carregar do localStorage e a sessão ser restaurada
  if (!hydrated || needsBootstrap) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
