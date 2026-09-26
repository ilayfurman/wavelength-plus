import { supabase } from '../../lib/supabaseClient'

export async function createParty(): Promise<{ id: string; room_code: string }> {
  const { data, error } = await supabase.rpc('create_party', {}).single()
  if (error) throw error
  return data as { id: string; room_code: string }
}

/** Combines create_party + join_party into one round trip (see migration 20260924150000). */
export async function createAndJoinParty(
  displayName: string,
  avatar: string,
): Promise<{ partyId: string; roomCode: string; playerId: string }> {
  const { data, error } = await supabase
    .rpc('create_and_join_party', { p_display_name: displayName, p_avatar: avatar })
    .single()
  if (error) throw error
  const result = data as { party_id: string; room_code: string; player_id: string }
  return { partyId: result.party_id, roomCode: result.room_code, playerId: result.player_id }
}
