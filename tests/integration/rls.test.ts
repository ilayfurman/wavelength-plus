import { describe, it, expect } from 'vitest'
import { signUpAndSignIn } from './helpers'

describe('turns_view hides the target until reveal', () => {
  it('returns null target_position for a non-psychic party member', async () => {
    const psychic = await signUpAndSignIn()
    const teammate = await signUpAndSignIn()

    // Minimal manual fixture: real party/turn creation is exercised by
    // RPC integration tests in later tasks. Here we insert directly as
    // the service role equivalent (postgres) to isolate the view's
    // access-control behavior from RPC logic.
    // (Uses the local Postgres connection string printed by `supabase start`.)
    const { Client } = await import('pg')
    const pg = new Client({ connectionString: process.env.SUPABASE_LOCAL_DB_URL! })
    await pg.connect()

    const psychicId = (await psychic.auth.getUser()).data.user!.id
    const teammateId = (await teammate.auth.getUser()).data.user!.id
    await pg.query(`insert into public.profiles (id) values ($1), ($2) on conflict do nothing`, [psychicId, teammateId])
    const partyId = (await pg.query(
      `insert into public.parties (room_code, host_id) values ('TEST', $1) returning id`,
      [psychicId]
    )).rows[0].id
    const teamId = (await pg.query(
      `insert into public.teams (party_id, name) values ($1, 'Team Test') returning id`,
      [partyId]
    )).rows[0].id
    const psychicPlayerId = (await pg.query(
      `insert into public.players (party_id, account_id, display_name, avatar, team_id) values ($1, $2, 'Psychic', '🧠', $3) returning id`,
      [partyId, psychicId, teamId]
    )).rows[0].id
    await pg.query(
      `insert into public.players (party_id, account_id, display_name, avatar, team_id) values ($1, $2, 'Mate', '🦊', $3)`,
      [partyId, teammateId, teamId]
    )
    const packId = (await pg.query(
      `insert into public.packs (name, share_code, is_public) values ('Starter', 'STARTR', true) returning id`
    )).rows[0].id
    const spectrumId = (await pg.query(
      `insert into public.spectrums (pack_id, left_label, right_label) values ($1, 'Cold', 'Hot') returning id`,
      [packId]
    )).rows[0].id
    const turnId = (await pg.query(
      `insert into public.turns (party_id, round_number, team_id, psychic_player_id, spectrum_id, target_position)
       values ($1, 1, $2, $3, $4, 0.42) returning id`,
      [partyId, teamId, psychicPlayerId, spectrumId]
    )).rows[0].id
    await pg.end()

    const { data: asTeammate } = await teammate.from('turns_view').select('target_position').eq('id', turnId).single()
    expect(asTeammate?.target_position).toBeNull()

    const { data: asPsychic } = await psychic.from('turns_view').select('target_position').eq('id', turnId).single()
    expect(Number(asPsychic?.target_position)).toBeCloseTo(0.42)
  })
})
