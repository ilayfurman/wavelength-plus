import { supabase } from '../../lib/supabaseClient'

export async function createParty(): Promise<{ id: string; room_code: string }> {
  const { data, error } = await supabase.rpc('create_party', {}).single()
  if (error) throw error
  return data as { id: string; room_code: string }
}
