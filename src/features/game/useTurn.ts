import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export type Turn = {
  id: string
  party_id: string
  round_number: number
  team_id: string
  psychic_player_id: string
  spectrum_id: string
  target_position: number | null
  clue_text: string | null
  guess_position: number | null
  status: 'clue' | 'guessing' | 'betting' | 'revealed'
}

export function useTurn(turnId: string) {
  const [turn, setTurn] = useState<Turn | null>(null)

  async function reload() {
    const { data } = await supabase.from('turns_view').select('*').eq('id', turnId).single()
    setTurn(data as Turn)
  }

  useEffect(() => {
    reload()
    const channel = supabase
      .channel(`turn:${turnId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turns', filter: `id=eq.${turnId}` }, () => {
        reload()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnId])

  return turn
}
