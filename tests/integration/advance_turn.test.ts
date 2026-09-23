import { describe, it, expect } from 'vitest'
import { signUpAndSignIn } from './helpers'

describe('advance_turn', () => {
  it('creates the next turn with a fresh target and increments turn_index', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', { p_team_size: 1, p_rounds: 3 }).single()
    await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
    await host.rpc('shuffle_teams', { p_party_id: party.id })
    const { data: firstTurn } = await host.rpc('start_game', { p_party_id: party.id }).single()

    await host.rpc('submit_clue', { p_turn_id: firstTurn.id, p_clue_text: 'x', p_skipped: false })
    await host.rpc('lock_guess', { p_turn_id: firstTurn.id, p_guess_position: 0.5 }) // co-op, auto-reveals

    const { data: nextTurn, error } = await host.rpc('advance_turn', { p_party_id: party.id }).single()
    expect(error).toBeNull()
    expect(nextTurn.round_number).toBeGreaterThanOrEqual(1)

    const { data: updatedParty } = await host.from('parties').select('turn_index, status').eq('id', party.id).single()
    expect(updatedParty!.turn_index).toBe(1)
    expect(updatedParty!.status).toBe('playing')
  })

  it('marks the party finished once turn_order is exhausted', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', { p_team_size: 1, p_rounds: 1 }).single()
    await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
    await host.rpc('shuffle_teams', { p_party_id: party.id }) // 1 player, 1 round -> turn_order length 1
    const { data: firstTurn } = await host.rpc('start_game', { p_party_id: party.id }).single()
    await host.rpc('submit_clue', { p_turn_id: firstTurn.id, p_clue_text: 'x', p_skipped: false })
    await host.rpc('lock_guess', { p_turn_id: firstTurn.id, p_guess_position: 0.5 })

    await host.rpc('advance_turn', { p_party_id: party.id })
    const { data: updatedParty } = await host.from('parties').select('status').eq('id', party.id).single()
    expect(updatedParty!.status).toBe('finished')
  })
})
