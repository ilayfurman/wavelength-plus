import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { HostMenu } from './HostMenu'
import { supabase } from '../../lib/supabaseClient'

const partySettings = { num_teams: 2, rounds: 3, team_mode: 'random', noises_enabled: true }
const players = [
  { id: 'host-1', display_name: 'Host' },
  { id: 'p2', display_name: 'Riley' },
]

function makeChain(resolveValue: unknown) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.single = vi.fn(() => Promise.resolve(resolveValue))
  return chain
}

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => makeChain({ data: partySettings })),
    rpc: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
  },
}))

describe('HostMenu', () => {
  it('does not render when closed', () => {
    render(
      <HostMenu
        open={false}
        onClose={vi.fn()}
        partyId="party-1"
        players={players}
        myPlayerId="host-1"
      />
    )
    expect(screen.queryByText('Host menu')).not.toBeInTheDocument()
  })

  it('renders the sheet and player list when open', async () => {
    render(
      <HostMenu
        open
        onClose={vi.fn()}
        partyId="party-1"
        players={players}
        myPlayerId="host-1"
      />
    )
    expect(screen.getByText('Host menu')).toBeInTheDocument()
    expect(screen.getByText('Riley')).toBeInTheDocument()
    expect(screen.queryByText('Host')).not.toBeInTheDocument()
  })

  it('calls mute_player with the right args and fires onMuteSuccess', async () => {
    const onMuteSuccess = vi.fn()
    render(
      <HostMenu
        open
        onClose={vi.fn()}
        partyId="party-1"
        players={players}
        myPlayerId="host-1"
        onMuteSuccess={onMuteSuccess}
      />
    )
    fireEvent.click(await screen.findByRole('button', { name: /mute riley/i }))
    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('mute_player', { p_party_id: 'party-1', p_player_id: 'p2', p_seconds: 30 })
    )
    expect(onMuteSuccess).toHaveBeenCalled()
  })

  it('toggles noises via set_noises_enabled (not set_party_settings, which is lobby-only)', async () => {
    render(
      <HostMenu
        open
        onClose={vi.fn()}
        partyId="party-1"
        players={players}
        myPlayerId="host-1"
      />
    )
    const toggle = await screen.findByRole('switch', { name: /toggle noises/i })
    fireEvent.click(toggle)
    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('set_noises_enabled', {
        p_party_id: 'party-1',
        p_noises_enabled: false,
      })
    )
    expect(supabase.rpc).not.toHaveBeenCalledWith('set_party_settings', expect.anything())
  })

  it('reverts the noises toggle and shows an error when set_noises_enabled fails', async () => {
    // `toggleNoises` awaits `supabase.rpc(...)` directly (no `.single()`), so returning a
    // plain `{ error }` object here is enough: `await` on a non-thenable resolves to itself.
    vi.mocked(supabase.rpc).mockReturnValueOnce({ data: null, error: { message: 'nope' } } as never)
    render(
      <HostMenu
        open
        onClose={vi.fn()}
        partyId="party-1"
        players={players}
        myPlayerId="host-1"
      />
    )
    const toggle = await screen.findByRole('switch', { name: /toggle noises/i })
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(toggle)
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not change noises/i)
  })

  it('calls onClose when the close button is tapped', () => {
    const onClose = vi.fn()
    render(
      <HostMenu
        open
        onClose={onClose}
        partyId="party-1"
        players={players}
        myPlayerId="host-1"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /close menu/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
