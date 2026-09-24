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

  it('keeps lines that fail to import in the paste textarea instead of clearing them', async () => {
    vi.mocked(supabase.rpc).mockImplementation((fn: string, args?: unknown) => {
      const params = args as { p_left_label?: string } | undefined
      if (fn === 'add_spectrum' && params?.p_left_label === 'Bad line') {
        return Object.assign(Promise.resolve({ data: null, error: { message: 'boom' } }), {
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
        }) as never
      }
      return Object.assign(Promise.resolve({ data: {}, error: null }), {
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      }) as never
    })

    render(<PackEditor packId="pack-1" />)
    await waitFor(() => expect(screen.getByText(/awful beer/i)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /paste a list/i }))
    fireEvent.change(screen.getByLabelText(/paste a list/i), {
      target: { value: 'Good line | Ok\nBad line | Nope' },
    })

    fireEvent.click(await screen.findByRole('button', { name: /add 2 spectrums/i }))

    await waitFor(() => expect(screen.getByLabelText(/paste a list/i)).toHaveValue('Bad line | Nope'))
  })
})
