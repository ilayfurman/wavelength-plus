import { describe, it, expect } from 'vitest'
import { signUpAndSignIn } from './helpers'

describe('create_party / join_party', () => {
  it('creates a party with a 4-letter room code and the starter pack attached', async () => {
    const host = await signUpAndSignIn()
    const { data, error } = await host.rpc('create_party', { p_team_size: 2, p_rounds: 3 }).single()
    expect(error).toBeNull()
    expect(data.room_code).toMatch(/^[A-Z]{4}$/)
    expect(data.status).toBe('lobby')

    const { data: packs } = await host.from('party_packs').select('pack_id').eq('party_id', data.id)
    expect(packs?.length).toBe(1)
  })

  it('lets a second user join by room code and creates a players row', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', {}).single()

    const guest = await signUpAndSignIn()
    const { data: player, error } = await guest
      .rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Riley', p_avatar: '🦊' })
      .single()

    expect(error).toBeNull()
    expect(player.party_id).toBe(party.id)
    expect(player.display_name).toBe('Riley')
  })

  it('rejects joining a room code that does not exist', async () => {
    const guest = await signUpAndSignIn()
    const { error } = await guest.rpc('join_party', { p_room_code: 'ZZZZ', p_display_name: 'X', p_avatar: '🙂' })
    expect(error).not.toBeNull()
  })
})
