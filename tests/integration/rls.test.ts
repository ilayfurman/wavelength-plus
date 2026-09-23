import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Client } from 'pg'
import { signUpAndSignIn } from './helpers'

describe('turns_view hides the target until reveal', () => {
  let psychic: SupabaseClient
  let teammate: SupabaseClient
  let outsider: SupabaseClient
  let pg: Client
  let turnId: string

  beforeAll(async () => {
    psychic = await signUpAndSignIn()
    teammate = await signUpAndSignIn()
    outsider = await signUpAndSignIn()

    // Minimal manual fixture: real party/turn creation is exercised by
    // RPC integration tests in later tasks. Here we insert directly as
    // the service role equivalent (postgres) to isolate the view's
    // access-control behavior from RPC logic.
    // (Uses the local Postgres connection string printed by `supabase start`.)
    pg = new Client({ connectionString: process.env.SUPABASE_LOCAL_DB_URL! })
    await pg.connect()

    const psychicId = (await psychic.auth.getUser()).data.user!.id
    const teammateId = (await teammate.auth.getUser()).data.user!.id
    const outsiderId = (await outsider.auth.getUser()).data.user!.id
    await pg.query(
      `insert into public.profiles (id) values ($1), ($2), ($3) on conflict do nothing`,
      [psychicId, teammateId, outsiderId]
    )
    const roomCode = `T${Date.now().toString(36).slice(-8).toUpperCase()}`
    const partyId = (await pg.query(
      `insert into public.parties (room_code, host_id) values ($1, $2) returning id`,
      [roomCode, psychicId]
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
    // outsider is NOT inserted as a player in this party — used to prove
    // non-members get zero rows.
    const shareCode = `S${Date.now().toString(36).slice(-7).toUpperCase()}`
    const packId = (await pg.query(
      `insert into public.packs (name, share_code, is_public) values ('Starter', $1, true) returning id`,
      [shareCode]
    )).rows[0].id
    const spectrumId = (await pg.query(
      `insert into public.spectrums (pack_id, left_label, right_label) values ($1, 'Cold', 'Hot') returning id`,
      [packId]
    )).rows[0].id
    turnId = (await pg.query(
      `insert into public.turns (party_id, round_number, team_id, psychic_player_id, spectrum_id, target_position)
       values ($1, 1, $2, $3, $4, 0.42) returning id`,
      [partyId, teamId, psychicPlayerId, spectrumId]
    )).rows[0].id
  })

  afterAll(async () => {
    await pg.end()
  })

  it('returns null target_position for a non-psychic party member', async () => {
    const { data: asTeammate } = await teammate.from('turns_view').select('target_position').eq('id', turnId).single()
    expect(asTeammate?.target_position).toBeNull()
  })

  it('returns the real target_position for the psychic', async () => {
    const { data: asPsychic } = await psychic.from('turns_view').select('target_position').eq('id', turnId).single()
    expect(Number(asPsychic?.target_position)).toBeCloseTo(0.42)
  })

  it('denies direct reads of the base turns table entirely', async () => {
    const { data, error } = await teammate.from('turns').select('*').eq('id', turnId)
    // RLS has no select policy on `turns` at all, so this must come back
    // empty (not an error, and not the row) for every client role.
    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: asPsychicData } = await psychic.from('turns').select('*').eq('id', turnId)
    expect(asPsychicData).toEqual([])
  })

  it('returns zero rows for a caller who is not a member of the party', async () => {
    const { data } = await outsider.from('turns_view').select('*').eq('id', turnId)
    expect(data).toEqual([])
  })

  it('reveals the target to every party member once the turn is revealed', async () => {
    await pg.query(`update public.turns set status = 'revealed' where id = $1`, [turnId])

    const { data: asTeammate } = await teammate.from('turns_view').select('target_position').eq('id', turnId).single()
    expect(Number(asTeammate?.target_position)).toBeCloseTo(0.42)
  })
})

describe('turns_view security invariants', () => {
  // The entire hidden-target mechanism depends on `turns_view` being owned
  // by a role that bypasses RLS (so it can read the underlying `turns` rows
  // at all) and on the view NOT running with security_invoker=true (which
  // would make it execute as the querying role instead, and RLS would then
  // deny it access to `turns` since there's no select policy on that table).
  // This test pins that assumption so a future change to view ownership or
  // options fails loudly instead of silently reopening the leak.
  it('turns_view is owned by an RLS-bypassing role and does not use security_invoker', async () => {
    const pg = new Client({ connectionString: process.env.SUPABASE_LOCAL_DB_URL! })
    await pg.connect()
    const { rows } = await pg.query(`
      select c.relowner::regrole::text as owner, c.reloptions, r.rolbypassrls
      from pg_class c
      join pg_roles r on r.oid = c.relowner
      where c.relname = 'turns_view' and c.relnamespace = 'public'::regnamespace
    `)
    await pg.end()

    expect(rows).toHaveLength(1)
    expect(rows[0].rolbypassrls).toBe(true)

    const reloptions: string[] | null = rows[0].reloptions
    const hasSecurityInvoker = (reloptions ?? []).some((opt) => opt.startsWith('security_invoker=true'))
    expect(hasSecurityInvoker).toBe(false)
  })
})
