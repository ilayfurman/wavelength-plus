import { supabase } from '../../lib/supabaseClient'

export async function joinParty(roomCode: string, displayName: string, avatar: string) {
  const { data, error } = await supabase
    .rpc('join_party', { p_room_code: roomCode, p_display_name: displayName, p_avatar: avatar })
    .single()
  if (error) throw error
  return data
}
