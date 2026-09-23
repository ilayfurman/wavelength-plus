import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PacksList } from './PacksList'
import { supabase } from '../../lib/supabaseClient'

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ id: 'pack-1', name: 'Beer & Europe', share_code: 'ABC123' }] }),
    })),
    rpc: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'pack-2', name: 'New pack' }, error: null }) }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'me' } } }) },
  },
}))

describe('PacksList', () => {
  it('lists existing packs and creates a new one', async () => {
    const onOpenPack = vi.fn()
    render(<PacksList onOpenPack={onOpenPack} />)
    await waitFor(() => expect(screen.getByText('Beer & Europe')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/new pack name/i), { target: { value: 'New pack' } })
    fireEvent.click(screen.getByRole('button', { name: /create pack/i }))
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledWith('create_pack', { p_name: 'New pack' }))
  })
})
