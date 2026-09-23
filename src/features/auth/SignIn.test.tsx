import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SignIn } from './SignIn'
import { supabase } from '../../lib/supabaseClient'

vi.mock('../../lib/supabaseClient', () => ({
  supabase: { auth: { signInWithOtp: vi.fn(), verifyOtp: vi.fn() } },
}))

describe('SignIn', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requests a code for the entered email', async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({ data: {}, error: null } as never)
    render(<SignIn />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'me@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() => expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({ email: 'me@example.com' }))
    expect(await screen.findByLabelText(/6-digit code/i)).toBeInTheDocument()
  })

  it('verifies the entered code', async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({ data: {}, error: null } as never)
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({ data: {}, error: null } as never)
    render(<SignIn />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'me@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /send code/i }))
    fireEvent.change(await screen.findByLabelText(/6-digit code/i), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /verify/i }))
    await waitFor(() =>
      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ email: 'me@example.com', token: '123456', type: 'email' })
    )
  })
})
