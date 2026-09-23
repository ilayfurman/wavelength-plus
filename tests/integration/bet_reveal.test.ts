import { describe, it, expect } from 'vitest'
import { signUpAndSignIn } from './helpers'
import type { SupabaseClient } from '@supabase/supabase-js'

// `players` rows are not returned in any guaranteed order, so we cannot assume
// clients[i] corresponds to players[i]. Instead, resolve each player row to its
// owning client by comparing account_id against each client's authenticated user id.
async function buildAccountIdToClient(clients: SupabaseClient[]): Promise<Map<string, SupabaseClient>> {
  const map = new Map<string, SupabaseClient>()
  for (const c of clients) {
    const { data } = await c.auth.getUser()
    map.set(data.user!.id, c)
  }
  return map
}

describe('place_bet / reveal_turn', () => {
  it('scores the active team and correct bettors, and is idempotent', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', { p_team_size: 2, p_rounds: 1 }).single()
    await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
    const clients = [host]
    for (let i = 1; i < 6; i++) {
      const c = await signUpAndSignIn()
      await c.rpc('join_party', { p_room_code: party.room_code, p_display_name: `P${i}`, p_avatar: '🙂' })
      clients.push(c)
    }
    await host.rpc('shuffle_teams', { p_party_id: party.id }) // 3 teams of 2
    const { data: firstTurn } = await host.rpc('start_game', { p_party_id: party.id }).single()

    const { data: players } = await host.from('players').select('*').eq('party_id', party.id)
    const accountIdToClient = await buildAccountIdToClient(clients)
    const psychicRow = players!.find((p) => p.id === firstTurn.psychic_player_id)!
    const psychicClient = accountIdToClient.get(psychicRow.account_id)!

    const { error: clueError } = await psychicClient.rpc('submit_clue', { p_turn_id: firstTurn.id, p_clue_text: 'x', p_skipped: false })
    expect(clueError).toBeNull()

    // The target position is random and hidden from everyone except the psychic
    // (via turns_view). Guess exactly at the target so compute_score deterministically
    // awards points, regardless of where the random target landed.
    const { data: turnForPsychic } = await psychicClient.from('turns_view').select('target_position').eq('id', firstTurn.id).single()
    const targetPosition = Number(turnForPsychic!.target_position)
    const { error: lockError } = await psychicClient.rpc('lock_guess', { p_turn_id: firstTurn.id, p_guess_position: targetPosition })
    expect(lockError).toBeNull()

    const { data: turnAfterLock } = await host.from('turns_view').select('team_id').eq('id', firstTurn.id).single()
    const otherTeamPlayers = players!.filter((p) => p.team_id !== turnAfterLock!.team_id)
    const betterTeamIds = [...new Set(otherTeamPlayers.map((p) => p.team_id))]

    for (const teamId of betterTeamIds) {
      const bettor = otherTeamPlayers.find((p) => p.team_id === teamId)!
      const bettorClient = accountIdToClient.get(bettor.account_id)!
      const { error: betError } = await bettorClient.rpc('place_bet', { p_turn_id: firstTurn.id, p_team_id: teamId, p_direction: 'left' })
      expect(betError).toBeNull()
    }

    const { data: revealed, error } = await host.rpc('reveal_turn', { p_turn_id: firstTurn.id }).single()
    expect(error).toBeNull()
    expect(revealed.status).toBe('revealed')
    expect(Number(revealed.target_position)).not.toBeNull()

    const { data: teamsAfter } = await host.from('teams').select('id, score').eq('party_id', party.id)
    const totalScore = teamsAfter!.reduce((sum, t) => sum + t.score, 0)
    // Guess was set exactly to the target, so compute_score guarantees a nonzero
    // score for the active team regardless of the (random) bet outcomes.
    expect(totalScore).toBeGreaterThan(0)

    // Idempotent: calling again does not throw and does not double-score
    const { error: secondError } = await host.rpc('reveal_turn', { p_turn_id: firstTurn.id })
    expect(secondError).toBeNull()
    const { data: teamsAfterSecond } = await host.from('teams').select('id, score').eq('party_id', party.id)
    const totalScoreSecond = teamsAfterSecond!.reduce((sum, t) => sum + t.score, 0)
    expect(totalScoreSecond).toBe(totalScore)
  })

  it('rejects a team betting on its own turn', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', { p_team_size: 2, p_rounds: 1 }).single()
    await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
    for (let i = 1; i < 4; i++) {
      const c = await signUpAndSignIn()
      await c.rpc('join_party', { p_room_code: party.room_code, p_display_name: `P${i}`, p_avatar: '🙂' })
    }
    await host.rpc('shuffle_teams', { p_party_id: party.id })
    const { data: firstTurn } = await host.rpc('start_game', { p_party_id: party.id }).single()
    const { error } = await host.rpc('place_bet', { p_turn_id: firstTurn.id, p_team_id: firstTurn.team_id, p_direction: 'left' })
    expect(error).not.toBeNull()
  })

  it('rejects reveal_turn before all other teams have bet', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', { p_team_size: 2, p_rounds: 1 }).single()
    await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
    const clients = [host]
    for (let i = 1; i < 6; i++) {
      const c = await signUpAndSignIn()
      await c.rpc('join_party', { p_room_code: party.room_code, p_display_name: `P${i}`, p_avatar: '🙂' })
      clients.push(c)
    }
    await host.rpc('shuffle_teams', { p_party_id: party.id }) // 3 teams of 2
    const { data: firstTurn } = await host.rpc('start_game', { p_party_id: party.id }).single()

    const { data: players } = await host.from('players').select('*').eq('party_id', party.id)
    const accountIdToClient = await buildAccountIdToClient(clients)
    const psychicRow = players!.find((p) => p.id === firstTurn.psychic_player_id)!
    const psychicClient = accountIdToClient.get(psychicRow.account_id)!

    const { error: clueError } = await psychicClient.rpc('submit_clue', { p_turn_id: firstTurn.id, p_clue_text: 'x', p_skipped: false })
    expect(clueError).toBeNull()
    const { error: lockError } = await psychicClient.rpc('lock_guess', { p_turn_id: firstTurn.id, p_guess_position: 0.5 })
    expect(lockError).toBeNull()

    const { data: turnAfterLock } = await host.from('turns_view').select('team_id').eq('id', firstTurn.id).single()
    const otherTeamPlayers = players!.filter((p) => p.team_id !== turnAfterLock!.team_id)
    const betterTeamIds = [...new Set(otherTeamPlayers.map((p) => p.team_id))]

    // Only one of the two other teams places a bet; the third team never bets.
    const firstBettorTeamId = betterTeamIds[0]
    const bettor = otherTeamPlayers.find((p) => p.team_id === firstBettorTeamId)!
    const bettorClient = accountIdToClient.get(bettor.account_id)!
    const { error: betError } = await bettorClient.rpc('place_bet', { p_turn_id: firstTurn.id, p_team_id: firstBettorTeamId, p_direction: 'left' })
    expect(betError).toBeNull()

    const { error } = await host.rpc('reveal_turn', { p_turn_id: firstTurn.id })
    expect(error).not.toBeNull()
  })

  it('rejects a bet whose team belongs to a different party than the turn', async () => {
    // Party A: the turn under bet.
    const hostA = await signUpAndSignIn()
    const { data: partyA } = await hostA.rpc('create_party', { p_team_size: 2, p_rounds: 1 }).single()
    await hostA.rpc('join_party', { p_room_code: partyA.room_code, p_display_name: 'HostA', p_avatar: '🧠' })
    const clientsA = [hostA]
    for (let i = 1; i < 4; i++) {
      const c = await signUpAndSignIn()
      await c.rpc('join_party', { p_room_code: partyA.room_code, p_display_name: `A${i}`, p_avatar: '🙂' })
      clientsA.push(c)
    }
    await hostA.rpc('shuffle_teams', { p_party_id: partyA.id }) // 2 teams of 2
    const { data: firstTurnA } = await hostA.rpc('start_game', { p_party_id: partyA.id }).single()
    const { data: playersA } = await hostA.from('players').select('*').eq('party_id', partyA.id)
    const accountIdToClientA = await buildAccountIdToClient(clientsA)
    const psychicRowA = playersA!.find((p) => p.id === firstTurnA.psychic_player_id)!
    const psychicClientA = accountIdToClientA.get(psychicRowA.account_id)!
    await psychicClientA.rpc('submit_clue', { p_turn_id: firstTurnA.id, p_clue_text: 'x', p_skipped: false })
    await psychicClientA.rpc('lock_guess', { p_turn_id: firstTurnA.id, p_guess_position: 0.5 })
    // firstTurnA is now in 'betting' status.

    // Party B: unrelated party. One of its players genuinely belongs to a
    // team_id that is NOT firstTurnA's active team_id (trivially true, since
    // it's a different party's team altogether).
    const hostB = await signUpAndSignIn()
    const { data: partyB } = await hostB.rpc('create_party', { p_team_size: 2, p_rounds: 1 }).single()
    await hostB.rpc('join_party', { p_room_code: partyB.room_code, p_display_name: 'HostB', p_avatar: '🧠' })
    await hostB.rpc('shuffle_teams', { p_party_id: partyB.id })
    const { data: teamsB } = await hostB.from('teams').select('*').eq('party_id', partyB.id)
    const hostBTeamId = teamsB![0].id

    // hostB is genuinely a member of hostBTeamId, and hostBTeamId != firstTurnA.team_id,
    // so both of place_bet's pre-fix checks would have passed. The new party-match
    // check must reject this cross-party bet.
    const { error } = await hostB.rpc('place_bet', { p_turn_id: firstTurnA.id, p_team_id: hostBTeamId, p_direction: 'left' })
    expect(error).not.toBeNull()
  })

  it('rejects reveal_turn from a caller who is not a member of the turn\'s party', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', { p_team_size: 2, p_rounds: 1 }).single()
    await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
    for (let i = 1; i < 4; i++) {
      const c = await signUpAndSignIn()
      await c.rpc('join_party', { p_room_code: party.room_code, p_display_name: `P${i}`, p_avatar: '🙂' })
    }
    await host.rpc('shuffle_teams', { p_party_id: party.id })
    const { data: firstTurn } = await host.rpc('start_game', { p_party_id: party.id }).single()

    // A totally unrelated authenticated user, not a member of this party at all.
    const outsider = await signUpAndSignIn()
    const { error } = await outsider.rpc('reveal_turn', { p_turn_id: firstTurn.id })
    expect(error).not.toBeNull()
  })
})
