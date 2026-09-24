import { describe, it, expect } from 'vitest'
import { signUpAndSignIn } from './helpers'

describe('skip_turn', () => {
  it('marks the current turn revealed without changing scores', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', { p_team_size: 1, p_rounds: 1 }).single()
    await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
    await host.rpc('shuffle_teams', { p_party_id: party.id })
    const { data: firstTurn } = await host.rpc('start_game', { p_party_id: party.id }).single()

    const { data: skipped, error } = await host.rpc('skip_turn', { p_party_id: party.id }).single()
    expect(error).toBeNull()
    expect(skipped.status).toBe('revealed')

    const { data: teamsAfter } = await host.from('teams').select('score').eq('party_id', party.id)
    expect(teamsAfter!.every((t) => t.score === 0)).toBe(true)
    void firstTurn
  })

  it('rejects a non-host caller', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', { p_team_size: 2, p_rounds: 1 }).single()
    await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
    const guest = await signUpAndSignIn()
    await guest.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Guest', p_avatar: '🙂' })
    await host.rpc('shuffle_teams', { p_party_id: party.id })
    await host.rpc('start_game', { p_party_id: party.id })

    const { error } = await guest.rpc('skip_turn', { p_party_id: party.id })
    expect(error).not.toBeNull()
  })
})

describe('end_game', () => {
  it('sets the party status to finished for the host', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', {}).single()
    const { data: updated, error } = await host.rpc('end_game', { p_party_id: party.id }).single()
    expect(error).toBeNull()
    expect(updated.status).toBe('finished')
  })

  it('rejects a non-host caller', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', {}).single()
    const guest = await signUpAndSignIn()
    const { error } = await guest.rpc('end_game', { p_party_id: party.id })
    expect(error).not.toBeNull()
  })
})
