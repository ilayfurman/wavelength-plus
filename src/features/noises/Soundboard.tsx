import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabaseClient'

const SOUNDS = [
  { key: 'airhorn', emoji: '📯', label: 'Airhorn' },
  { key: 'drumroll', emoji: '🥁', label: 'Drumroll' },
  { key: 'applause', emoji: '👏', label: 'Applause' },
  { key: 'sad-trombone', emoji: '🎺', label: 'Trombone' },
  { key: 'boo', emoji: '👎', label: 'Boo' },
  { key: 'crickets', emoji: '🦗', label: 'Crickets' },
  { key: 'gasp', emoji: '😱', label: 'Gasp' },
  { key: 'tada', emoji: '🎉', label: 'Ta-da' },
] as const

const GLOW_MS = 450

const rowStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  gap: '8px',
  overflowX: 'auto',
  scrollbarWidth: 'none',
  padding: '2px 2px 0',
  fontFamily: 'Rubik, system-ui, sans-serif',
}

const buttonStyle: CSSProperties = {
  flex: 'none',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
}

const captionStyle: CSSProperties = {
  font: '500 10px/1 Rubik, sans-serif',
  color: '#93A2BF',
  whiteSpace: 'nowrap',
}

const mutedOverlayWrapStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const mutedOverlayBadgeStyle: CSSProperties = {
  padding: '8px 14px',
  borderRadius: '999px',
  background: '#221B4F',
  border: '1px solid rgba(200,180,255,.2)',
  font: '600 13px Rubik, sans-serif',
  color: '#F4F2FB',
}

function iconStyle(isHit: boolean): CSSProperties {
  return {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    background: isHit ? 'rgba(255,209,102,.35)' : 'rgba(255,255,255,.07)',
    border: '1px solid rgba(255,255,255,.12)',
    boxShadow: isHit ? '0 0 18px rgba(255,209,102,.6)' : 'none',
    transition: 'all .2s',
    transform: isHit ? 'scale(.9)' : 'scale(1)',
  }
}

function secondsRemaining(mutedUntil: string | null): number {
  if (mutedUntil === null) return 0
  return Math.max(0, Math.ceil((new Date(mutedUntil).getTime() - Date.now()) / 1000))
}

export function Soundboard({
  partyId,
  myPlayerId,
  mutedUntil,
  isHost,
  players,
  noisesEnabled = true,
}: {
  partyId: string
  myPlayerId: string
  mutedUntil: string | null
  isHost: boolean
  players: { id: string; display_name: string }[]
  noisesEnabled?: boolean
}) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({})
  const glowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hitSound, setHitSound] = useState<string | null>(null)

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

  useEffect(() => {
    return () => {
      if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current)
    }
  }, [])

  const isMuted = mutedUntil !== null && new Date(mutedUntil).getTime() > Date.now()
  const remainingSeconds = secondsRemaining(mutedUntil)

  function playSound(sound: string) {
    if (isMuted || !noisesEnabled) return
    channelRef.current?.send({ type: 'broadcast', event: 'noise', payload: { sound } })
    setHitSound(sound)
    if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current)
    glowTimeoutRef.current = setTimeout(() => setHitSound(null), GLOW_MS)
  }

  return (
    <div style={rowStyle}>
      {noisesEnabled &&
        SOUNDS.map(({ key, emoji, label }) => (
          <button
            key={key}
            onClick={() => playSound(key)}
            aria-label={key}
            disabled={isMuted}
            style={{ ...buttonStyle, opacity: isMuted ? 0.25 : 1 }}
          >
            <span style={iconStyle(hitSound === key)}>{emoji}</span>
            <span style={captionStyle}>{label}</span>
          </button>
        ))}
      {SOUNDS.map(({ key }) => (
        <audio key={key} ref={(el) => { if (el) audioRefs.current[key] = el }} src={`/sounds/${key}.mp3`} preload="auto" />
      ))}
      {noisesEnabled && isMuted && (
        <div style={mutedOverlayWrapStyle}>
          <span style={mutedOverlayBadgeStyle}>
            Host muted you · 0:{String(remainingSeconds).padStart(2, '0')}
          </span>
        </div>
      )}
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
