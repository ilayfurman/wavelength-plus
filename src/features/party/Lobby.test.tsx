import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Lobby } from './Lobby'
import { supabase } from '../../lib/supabaseClient'

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ id: 'p1', display_name: 'Alex', avatar: '🌮', team_id: null }] }),
    })),
    rpc: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}))

describe('Lobby', () => {
  it('shows the room code and lists joined players', async () => {
    render(<Lobby partyId="party-1" roomCode="ABCD" isHost={true} onStartGame={vi.fn()} />)
    expect(screen.getByText('ABCD')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Alex')).toBeInTheDocument())
  })

  it('calls shuffle_teams when the host clicks Reshuffle', async () => {
    render(<Lobby partyId="party-1" roomCode="ABCD" isHost={true} onStartGame={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: /reshuffle/i }))
    expect(supabase.rpc).toHaveBeenCalledWith('shuffle_teams', { p_party_id: 'party-1' })
  })
})
