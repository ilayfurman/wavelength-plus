import { useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

const SOUNDS = ['airhorn', 'drumroll', 'applause', 'sad-trombone', 'boo', 'crickets', 'gasp', 'tada'] as const

export function Soundboard({
  partyId,
  myPlayerId,
  mutedUntil,
  isHost,
  players,
}: {
  partyId: string
  myPlayerId: string
  mutedUntil: string | null
  isHost: boolean
  players: { id: string; display_name: string }[]
}) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({})

  useEffect(() => {
    const channel = supabase
      .channel(`noises:${partyId}`)
      .on('broadcast', { event: 'noise' }, (payload) => {
        const sound = payload.payload.sound as string
        audioRefs.current[sound]?.play().catch(() => {})
      })
      .subscribe()
    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId])

  const isMuted = mutedUntil !== null && new Date(mutedUntil).getTime() > Date.now()

  function playSound(sound: string) {
    if (isMuted) return
    channelRef.current?.send({ type: 'broadcast', event: 'noise', payload: { sound } })
  }

  return (
    <div>
      {SOUNDS.map((s) => (
        <button key={s} onClick={() => playSound(s)} aria-label={s}>
          🔊 {s}
        </button>
      ))}
      {SOUNDS.map((s) => (
        <audio key={s} ref={(el) => { if (el) audioRefs.current[s] = el }} src={`/sounds/${s}.mp3`} preload="auto" />
      ))}
      {isHost && (
        <div>
          {players
            .filter((p) => p.id !== myPlayerId)
            .map((p) => (
              <button
                key={p.id}
                aria-label={`Mute ${p.display_name}`}
                onClick={() => supabase.rpc('mute_player', { p_party_id: partyId, p_player_id: p.id, p_seconds: 30 })}
              >
                Mute {p.display_name}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
