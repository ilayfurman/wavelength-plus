import { describe, it, expect } from 'vitest'
import { signUpAndSignIn } from './helpers'

describe('pack CRUD RPCs', () => {
  it('creates a pack with a unique share code, adds a spectrum, and lets another host attach it by code', async () => {
    const creator = await signUpAndSignIn()
    const { data: pack, error: createError } = await creator.rpc('create_pack', { p_name: 'Beer & Europe' }).single()
    expect(createError).toBeNull()
    expect(pack.share_code).toMatch(/^[A-Z0-9]{6}$/)

    const { error: spectrumError } = await creator.rpc('add_spectrum', {
      p_pack_id: pack.id, p_left_label: 'Awful beer', p_right_label: 'Great beer',
    })
    expect(spectrumError).toBeNull()

    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', {}).single()
    const { data: attached, error: attachError } = await host
      .rpc('add_pack_by_code', { p_party_id: party.id, p_share_code: pack.share_code })
      .single()
    expect(attachError).toBeNull()
    expect(attached.id).toBe(pack.id)
  })

  it('rejects adding a spectrum to a pack you do not own', async () => {
    const owner = await signUpAndSignIn()
    const { data: pack } = await owner.rpc('create_pack', { p_name: 'Mine' }).single()
    const stranger = await signUpAndSignIn()
    const { error } = await stranger.rpc('add_spectrum', { p_pack_id: pack.id, p_left_label: 'A', p_right_label: 'B' })
    expect(error).not.toBeNull()
  })
})

describe('mute_player', () => {
  it('lets the host mute a player for N seconds', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', {}).single()
    const guest = await signUpAndSignIn()
    const { data: player } = await guest
      .rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Riley', p_avatar: '🦊' })
      .single()

    const { data: muted, error } = await host
      .rpc('mute_player', { p_party_id: party.id, p_player_id: player.id, p_seconds: 30 })
      .single()
    expect(error).toBeNull()
    expect(new Date(muted.muted_until).getTime()).toBeGreaterThan(Date.now())
  })

  it('rejects muting from a non-host', async () => {
    const host = await signUpAndSignIn()
    const { data: party } = await host.rpc('create_party', {}).single()
    const guest = await signUpAndSignIn()
    const { data: player } = await guest
      .rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Riley', p_avatar: '🦊' })
      .single()
    const { error } = await guest.rpc('mute_player', { p_party_id: party.id, p_player_id: player.id, p_seconds: 30 })
    expect(error).not.toBeNull()
  })

  it('rejects a host muting a player from a different party by mismatching party/player ids', async () => {
    const hostA = await signUpAndSignIn()
    const { data: partyA } = await hostA.rpc('create_party', {}).single()

    const hostB = await signUpAndSignIn()
    const { data: partyB } = await hostB.rpc('create_party', {}).single()
    const guestB = await signUpAndSignIn()
    const { data: playerB } = await guestB
      .rpc('join_party', { p_room_code: partyB.room_code, p_display_name: 'Riley', p_avatar: '🦊' })
      .single()

    // hostA is a legitimate host of SOME party (partyA), but tries to mute a
    // player belonging to partyB by passing partyA's id with playerB's id.
    const { error } = await hostA.rpc('mute_player', {
      p_party_id: partyA.id,
      p_player_id: playerB.id,
      p_seconds: 30,
    })
    expect(error).not.toBeNull()
  })
})
