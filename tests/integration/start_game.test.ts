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
})
