import { describe, it, expect } from 'vitest'
import { signUpAndSignIn } from './helpers'

async function setUpGame(teamCount: 1 | 2) {
  const host = await signUpAndSignIn()
  const totalPlayers = teamCount === 1 ? 2 : 4
  const { data: party } = await host.rpc('create_party', { p_team_size: totalPlayers / teamCount, p_rounds: 1 }).single()
  await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
  const others = []
  for (let i = 1; i < totalPlayers; i++) {
    const c = await signUpAndSignIn()
    await c.rpc('join_party', { p_room_code: party.room_code, p_display_name: `P${i}`, p_avatar: '🙂' })
    others.push(c)
  }
  await host.rpc('shuffle_teams', { p_party_id: party.id })
  const { data: firstTurn } = await host.rpc('start_game', { p_party_id: party.id }).single()

  const { data: players } = await host.from('players').select('*').eq('party_id', party.id)
  const psychicPlayer = players!.find((p) => p.id === firstTurn.psychic_player_id)!
  const allClients = [host, ...others]
  const accountIdToClient = new Map<string, (typeof allClients)[number]>()
  for (const c of allClients) {
    const { data: userData } = await c.auth.getUser()
    accountIdToClient.set(userData.user!.id, c)
  }
  const psychicClient = accountIdToClient.get(psychicPlayer.account_id)!

  // A client on a different team than the active team, if one exists (teamCount === 2).
  // Derived from actual team membership rather than signup order, so it stays correct
  // even if psychic-selection logic changes in the future.
  const otherTeamPlayer = players!.find((p) => p.team_id !== firstTurn.team_id)
  const otherTeamClient = otherTeamPlayer ? accountIdToClient.get(otherTeamPlayer.account_id)! : undefined

  return { host, others, party, firstTurn, psychicClient, otherTeamClient }
}

describe('submit_clue', () => {
  it('lets the psychic submit a typed clue and advances status to guessing', async () => {
    const { psychicClient, firstTurn } = await setUpGame(2)
    const { data, error } = await psychicClient
      .rpc('submit_clue', { p_turn_id: firstTurn.id, p_clue_text: 'A sauna in August', p_skipped: false })
      .single()
    expect(error).toBeNull()
    expect(data.clue_text).toBe('A sauna in August')
    expect(data.status).toBe('guessing')
  })

  it('rejects a clue from someone who is not the psychic', async () => {
    const { otherTeamClient, firstTurn } = await setUpGame(2)
    const { error } = await otherTeamClient!.rpc('submit_clue', { p_turn_id: firstTurn.id, p_clue_text: 'x', p_skipped: false })
    expect(error).not.toBeNull()
  })
})

describe('lock_guess', () => {
  it('moves a 2-team game to betting status', async () => {
    const { psychicClient, firstTurn } = await setUpGame(2)
    await psychicClient.rpc('submit_clue', { p_turn_id: firstTurn.id, p_clue_text: 'x', p_skipped: false })
    const { data, error } = await psychicClient.rpc('lock_guess', { p_turn_id: firstTurn.id, p_guess_position: 0.6 }).single()
    expect(error).toBeNull()
    expect(data.status).toBe('betting')
  })

  it('reveals immediately in a 1-team (co-op) game', async () => {
    const { psychicClient, firstTurn } = await setUpGame(1)
    await psychicClient.rpc('submit_clue', { p_turn_id: firstTurn.id, p_clue_text: 'x', p_skipped: false })
    const { data, error } = await psychicClient.rpc('lock_guess', { p_turn_id: firstTurn.id, p_guess_position: 0.6 }).single()
    expect(error).toBeNull()
    expect(data.status).toBe('revealed')
  })

  it('rejects a guess from a player not on the active team', async () => {
    const { psychicClient, otherTeamClient, firstTurn } = await setUpGame(2)
    await psychicClient.rpc('submit_clue', { p_turn_id: firstTurn.id, p_clue_text: 'x', p_skipped: false })
    const { error } = await otherTeamClient!.rpc('lock_guess', { p_turn_id: firstTurn.id, p_guess_position: 0.6 })
    expect(error).not.toBeNull()
  })

  it('rejects a guess that is out of range', async () => {
    const { psychicClient, firstTurn } = await setUpGame(2)
    await psychicClient.rpc('submit_clue', { p_turn_id: firstTurn.id, p_clue_text: 'x', p_skipped: false })
    const { error } = await psychicClient.rpc('lock_guess', { p_turn_id: firstTurn.id, p_guess_position: 1.5 })
    expect(error).not.toBeNull()
  })
})
