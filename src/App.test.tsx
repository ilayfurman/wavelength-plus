import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from './App'

vi.mock('./lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
    },
  },
}))

describe('App', () => {
  it('renders the app shell without crashing', () => {
    render(<App />)
    expect(screen.getByTestId('app-root')).toBeInTheDocument()
  })
})
