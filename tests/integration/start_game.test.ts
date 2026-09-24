import { describe, it, expect } from 'vitest'
import { signUpAndSignIn } from './helpers'

describe('start_game', () => {
  it('creates a first turn and a turn_order covering every player, per round', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', { p_team_size: 2, p_rounds: 2 }).single()
    await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
    for (let i = 0; i < 3; i++) {
      const c = await signUpAndSignIn()
      await c.rpc('join_party', { p_room_code: party.room_code, p_display_name: `P${i}`, p_avatar: '🙂' })
    }
    await host.rpc('shuffle_teams', { p_party_id: party.id })

    const { data: firstTurn, error } = await host.rpc('start_game', { p_party_id: party.id }).single()
    expect(error).toBeNull()
    expect(firstTurn.round_number).toBe(1)
    expect(firstTurn.status).toBe('clue')

    const { data: updatedParty } = await host.from('parties').select('turn_order, status').eq('id', party.id).single()
    expect(updatedParty!.status).toBe('playing')
    // 4 players total, 2 rounds -> 8 turn_order entries
    expect((updatedParty!.turn_order as unknown[]).length).toBe(8)
  })

  it('gives each team turns equal to its own player count per round, even when teams are uneven', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', { p_team_size: 3, p_rounds: 1 }).single()
    await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
    // 5 total players with team_size=3 -> shuffle_teams should produce one team of 3 and one team of 2
    for (let i = 0; i < 4; i++) {
      const c = await signUpAndSignIn()
      await c.rpc('join_party', { p_room_code: party.room_code, p_display_name: `P${i}`, p_avatar: '🙂' })
    }
    await host.rpc('shuffle_teams', { p_party_id: party.id })

    const { data: teams } = await host.from('teams').select('id').eq('party_id', party.id)
    const { data: players } = await host.from('players').select('team_id').eq('party_id', party.id)
    const counts = teams!.map((t) => players!.filter((p) => p.team_id === t.id).length)
    // Sanity-check the fixture is actually uneven before trusting the turn_order assertion below
    expect(new Set(counts).size).toBeGreaterThan(1)

    await host.rpc('start_game', { p_party_id: party.id })
    const { data: updatedParty } = await host.from('parties').select('turn_order').eq('id', party.id).single()
    const order = updatedParty!.turn_order as { team_id: string }[]

    // With 1 round, total turn_order length should equal total player count (5),
    // and each team's entry count should equal that team's own player count.
    expect(order.length).toBe(5)
    for (const team of teams!) {
      const teamPlayerCount = players!.filter((p) => p.team_id === team.id).length
      const teamTurnCount = order.filter((entry) => entry.team_id === team.id).length
      expect(teamTurnCount).toBe(teamPlayerCount)
    }
  })

  it('succeeds when a team has been left with zero players via assign_manual_team', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', { p_team_size: 2, p_rounds: 1 }).single()
    const { data: hostPlayer } = await host
      .rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
      .single()
    const guest = await signUpAndSignIn()
    const { data: guestPlayer } = await guest
      .rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Guest', p_avatar: '🙂' })
      .single()

    // Manually create two teams, then move the host off Team A onto Team B,
    // leaving Team A with zero players (but the team row still exists).
    await host.rpc('assign_manual_team', { p_party_id: party.id, p_player_id: hostPlayer.id, p_team_name: 'Team A' })
    await guest.rpc('assign_manual_team', { p_party_id: party.id, p_player_id: guestPlayer.id, p_team_name: 'Team B' })
    await host.rpc('assign_manual_team', { p_party_id: party.id, p_player_id: hostPlayer.id, p_team_name: 'Team B' })

    const { data: teams } = await host.from('teams').select('id, name').eq('party_id', party.id)
    const teamA = teams!.find((t) => t.name === 'Team A')
    const { data: teamAPlayers } = await host.from('players').select('id').eq('team_id', teamA!.id)
    expect(teamAPlayers).toEqual([])

    const { data: firstTurn, error } = await host.rpc('start_game', { p_party_id: party.id }).single()
    expect(error).toBeNull()
    expect(firstTurn.status).toBe('clue')
  })
})
