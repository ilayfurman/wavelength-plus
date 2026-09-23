import { AuthProvider } from './features/auth/AuthProvider'
import { useAuth } from './features/auth/useAuth'
import { SignIn } from './features/auth/SignIn'

function Gate() {
  const { session, loading } = useAuth()
  if (loading) return <div data-testid="app-root">Loading…</div>
  if (!session) return <div data-testid="app-root"><SignIn /></div>
  return <div data-testid="app-root">Signed in</div> // replaced by Home in Task 15
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
