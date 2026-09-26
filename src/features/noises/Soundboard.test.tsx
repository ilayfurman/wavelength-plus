import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Soundboard } from './Soundboard'
import { supabase } from '../../lib/supabaseClient'

const mockChannel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis(), send: vi.fn() }

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
  },
}))

describe('Soundboard', () => {
  it('broadcasts a noise event when a sound button is tapped', () => {
    render(<Soundboard partyId="p1" myPlayerId="me" mutedUntil={null} isHost={false} players={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /fart/i }))
    expect(mockChannel.send).toHaveBeenCalledWith({ type: 'broadcast', event: 'noise', payload: { sound: 'fart' } })
  })

  it('does not broadcast while muted', () => {
    render(<Soundboard partyId="p1" myPlayerId="me" mutedUntil={new Date(Date.now() + 10000).toISOString()} isHost={false} players={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /fart/i }))
    expect(mockChannel.send).not.toHaveBeenCalled()
  })

  it('hides the sound buttons when noises are disabled', () => {
    render(<Soundboard partyId="p1" myPlayerId="me" mutedUntil={null} isHost={false} players={[]} noisesEnabled={false} />)
    expect(screen.queryByRole('button', { name: /fart/i })).not.toBeInTheDocument()
  })

  it('lets the host mute another player', async () => {
    render(
      <Soundboard
        partyId="p1"
        myPlayerId="host-1"
        mutedUntil={null}
        isHost={true}
        players={[{ id: 'p2', display_name: 'Riley' }]}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /mute riley/i }))
    expect(supabase.rpc).toHaveBeenCalledWith('mute_player', { p_party_id: 'p1', p_player_id: 'p2', p_seconds: 30 })
  })
})
