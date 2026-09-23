import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PackEditor } from './PackEditor'
import { supabase } from '../../lib/supabaseClient'

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ id: 's1', left_label: 'Awful beer', right_label: 'Great beer' }] }),
    })),
    rpc: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
  },
}))

describe('PackEditor', () => {
  it('lists spectrums and adds a new one', async () => {
    render(<PackEditor packId="pack-1" />)
    await waitFor(() => expect(screen.getByText(/awful beer/i)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/left label/i), { target: { value: 'Worst country' } })
    fireEvent.change(screen.getByLabelText(/right label/i), { target: { value: 'Best country' } })
    fireEvent.click(screen.getByRole('button', { name: /add spectrum/i }))
    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('add_spectrum', {
        p_pack_id: 'pack-1', p_left_label: 'Worst country', p_right_label: 'Best country',
      })
    )
  })
})
