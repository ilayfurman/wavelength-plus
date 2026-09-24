import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Lobby } from './Lobby'
import { supabase } from '../../lib/supabaseClient'

const partyRow = { team_size: 2, rounds: 3, team_mode: 'random', noises_enabled: true }
const playersData = [{ id: 'p1', display_name: 'Alex', avatar: '🌮', team_id: null }]
const teamsData: { id: string; name: string }[] = []

function makeChain(resolveValue: unknown, arrayValue?: unknown) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.order = vi.fn(() => Promise.resolve(arrayValue !== undefined ? arrayValue : resolveValue))
  chain.single = vi.fn(() => Promise.resolve(resolveValue))
  return chain
}

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'players') {
        return makeChain({ data: playersData[0] }, { data: playersData })
      }
      if (table === 'parties') {
        return makeChain({ data: partyRow })
      }
      if (table === 'teams') {
        return makeChain({ data: teamsData }, { data: teamsData })
      }
      return makeChain({ data: null }, { data: null })
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
    },
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

  it('calls set_party_settings with p_team_mode when the host picks a team mode', async () => {
    render(<Lobby partyId="party-1" roomCode="ABCD" isHost={true} onStartGame={vi.fn()} />)
    const pickButton = await screen.findByRole('radio', { name: /pick/i })
    fireEvent.click(pickButton)
    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith(
        'set_party_settings',
        expect.objectContaining({ p_party_id: 'party-1', p_team_mode: 'manual' }),
      ),
    )
  })

  it('calls set_party_settings with p_noises_enabled when the host toggles noises', async () => {
    render(<Lobby partyId="party-1" roomCode="ABCD" isHost={true} onStartGame={vi.fn()} />)
    const noisesSwitch = await screen.findByRole('switch', { name: /noises/i })
    fireEvent.click(noisesSwitch)
    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith(
        'set_party_settings',
        expect.objectContaining({ p_party_id: 'party-1', p_noises_enabled: false }),
      ),
    )
  })

  it('shows an error message when onStartGame rejects', async () => {
    const onStartGame = vi.fn().mockRejectedValue(new Error('No teams assigned yet'))
    render(<Lobby partyId="party-1" roomCode="ABCD" isHost={true} onStartGame={onStartGame} />)
    fireEvent.click(await screen.findByRole('button', { name: /^start game$/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No teams assigned yet'))
  })

  it('calls assign_manual_team with the viewer own player id when joining a team in Pick mode', async () => {
    render(<Lobby partyId="party-1" roomCode="ABCD" isHost={true} onStartGame={vi.fn()} />)
    const pickButton = await screen.findByRole('radio', { name: /pick/i })
    fireEvent.click(pickButton)

    const input = await screen.findByLabelText('New team name')
    fireEvent.change(input, { target: { value: 'Team Rocket' } })
    fireEvent.click(screen.getByRole('button', { name: /create \/ join team/i }))

    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('assign_manual_team', {
        p_party_id: 'party-1',
        p_player_id: 'p1',
        p_team_name: 'Team Rocket',
      }),
    )
  })
})
