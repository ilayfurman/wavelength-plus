import { describe, it, expect } from 'vitest'
import { signUpAndSignIn } from './helpers'

async function createPartyWithPlayers(n: number) {
  const host = await signUpAndSignIn()
  const { data: party } = await host.rpc('create_party', { p_team_size: 2, p_rounds: 3 }).single()
  const clients = [host]
  for (let i = 1; i < n; i++) {
    const c = await signUpAndSignIn()
    await c.rpc('join_party', { p_room_code: party.room_code, p_display_name: `P${i}`, p_avatar: '🙂' })
    clients.push(c)
  }
  await host.rpc('join_party', { p_room_code: party.room_code, p_display_name: 'Host', p_avatar: '🧠' })
  return { host, party, clients }
}

describe('shuffle_teams', () => {
  it('splits 6 players into 3 teams of 2 when team_size=2', async () => {
    const { host, party } = await createPartyWithPlayers(6)
    const { data: teams, error } = await host.rpc('shuffle_teams', { p_party_id: party.id })
    expect(error).toBeNull()
    expect(teams?.length).toBe(3)

    const { data: players } = await host.from('players').select('team_id').eq('party_id', party.id)
    const counts: Record<string, number> = {}
    for (const p of players ?? []) counts[p.team_id] = (counts[p.team_id] ?? 0) + 1
    expect(Object.values(counts).sort()).toEqual([2, 2, 2])
  })

  it('rejects shuffle from a non-host', async () => {
    const { party, clients } = await createPartyWithPlayers(4)
    const { error } = await clients[1].rpc('shuffle_teams', { p_party_id: party.id })
    expect(error).not.toBeNull()
  })
})

describe('assign_manual_team', () => {
  it('lets a player join a named team, creating it if needed', async () => {
    const { host, party } = await createPartyWithPlayers(2)
    const { data: me } = await host.from('players').select('id').eq('party_id', party.id).eq('account_id', (await host.auth.getUser()).data.user!.id).single()
    const { data: updated, error } = await host.rpc('assign_manual_team', {
      p_party_id: party.id, p_player_id: me!.id, p_team_name: 'Custom Team',
    }).single()
    expect(error).toBeNull()
    expect(updated.team_id).not.toBeNull()
  })
})
