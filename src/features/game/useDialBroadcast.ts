import { useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

export function useDialBroadcast(turnId: string, onRemoteMove: (v: number) => void) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel(`dial:${turnId}`)
      .on('broadcast', { event: 'move' }, (payload) => {
        onRemoteMove(payload.payload.value as number)
      })
      .subscribe()
    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnId])

  function broadcastMove(value: number) {
    channelRef.current?.send({ type: 'broadcast', event: 'move', payload: { value } })
  }

  return { broadcastMove }
}
