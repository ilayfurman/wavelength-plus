import { useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

export function useDialBroadcast(
  turnId: string,
  onRemoteMove: (v: number, playerId: string) => void,
  onRemoteDragEnd: (playerId: string) => void,
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel(`dial:${turnId}`)
      .on('broadcast', { event: 'move' }, (payload) => {
        onRemoteMove(payload.payload.value as number, payload.payload.playerId as string)
      })
      .on('broadcast', { event: 'drag-end' }, (payload) => {
        onRemoteDragEnd(payload.payload.playerId as string)
      })
      .subscribe()
    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnId])

  function broadcastMove(value: number, playerId: string) {
    channelRef.current?.send({ type: 'broadcast', event: 'move', payload: { value, playerId } })
  }

  function broadcastDragEnd(playerId: string) {
    channelRef.current?.send({ type: 'broadcast', event: 'drag-end', payload: { playerId } })
  }

  return { broadcastMove, broadcastDragEnd }
}
