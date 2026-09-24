import { describe, it, expect } from 'vitest'
import { signUpAndSignIn } from './helpers'

describe('set_noises_enabled', () => {
  it('lets the host toggle noises at any party status', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', {}).single()
    await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
    await host.rpc('shuffle_teams', { p_party_id: party.id })
    await host.rpc('start_game', { p_party_id: party.id })

    const { data: updated, error } = await host.rpc('set_noises_enabled', {
      p_party_id: party.id,
      p_noises_enabled: false,
    }).single()
    expect(error).toBeNull()
    expect(updated.noises_enabled).toBe(false)
  })

  it('rejects a non-host caller', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', {}).single()
    const guest = await signUpAndSignIn()
    const { error } = await guest.rpc('set_noises_enabled', { p_party_id: party.id, p_noises_enabled: false })
    expect(error).not.toBeNull()
  })
})
