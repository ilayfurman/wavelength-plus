import { describe, it, expect } from 'vitest'
import { signUpAndSignIn } from './helpers'

describe('restart_party', () => {
  it('lets the host restart a finished party back to lobby so it can be started again', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', { p_team_size: 1, p_rounds: 1 }).single()
    await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
    await host.rpc('shuffle_teams', { p_party_id: party.id })
    await host.rpc('start_game', { p_party_id: party.id })
    await host.rpc('end_game', { p_party_id: party.id })

    const { data: finished } = await host.from('parties').select('status').eq('id', party.id).single()
    expect(finished!.status).toBe('finished')

    const { data: restarted, error } = await host.rpc('restart_party', { p_party_id: party.id }).single()
    expect(error).toBeNull()
    expect(restarted.status).toBe('lobby')
    expect(restarted.turn_order).toEqual([])
    expect(restarted.turn_index).toBe(0)
    expect(restarted.used_spectrum_ids).toEqual([])

    // shuffle_teams + start_game should now work again.
    const { error: shuffleError } = await host.rpc('shuffle_teams', { p_party_id: party.id })
    expect(shuffleError).toBeNull()
    const { data: secondTurn, error: startError } = await host.rpc('start_game', { p_party_id: party.id }).single()
    expect(startError).toBeNull()
    expect(secondTurn.status).toBe('clue')
  })

  it('rejects a non-host caller', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', {}).single()
    await host.rpc('end_game', { p_party_id: party.id })
    const guest = await signUpAndSignIn()
    const { error } = await guest.rpc('restart_party', { p_party_id: party.id })
    expect(error).not.toBeNull()
  })
})
