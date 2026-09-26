import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabaseClient'

const SOUNDS = [
  { key: 'clapping', emoji: '👏', label: 'Applause' },
  { key: 'fart', emoji: '💨', label: 'Fart' },
  { key: 'woohoo', emoji: '🙌', label: 'Woohoo' },
  { key: 'fortnight', emoji: '🕺', label: 'Fortnite' },
  { key: 'vine-boom', emoji: '💥', label: 'Vine Boom' },
  { key: 'anime-wow', emoji: '😲', label: 'Anime Wow' },
  { key: 'bruh', emoji: '💀', label: 'Bruh' },
  { key: 'faa', emoji: '😩', label: 'Faaa' },
  { key: 'confetti-pop', emoji: '🎉', label: 'Confetti' },
  { key: 'emotional-damage', emoji: '💔', label: 'Emotional Damage' },
] as const

const GLOW_MS = 450
const POP_MS = 1130 // ~1700ms base sequence at 1.5x speed

// The pop is deliberately NOT anchored to the button that was clicked — it's
// a big, shared moment in the middle of everyone's screen (that's the point:
// every player in the party sees it, not just whoever's looking at the
// soundboard row), fading in, drifting up, then fading out again.
function popStyle(offsetX: number): CSSProperties {
  return {
    position: 'fixed',
    top: '42%',
    left: `calc(50% + ${offsetX}px)`,
    fontSize: '40px',
    zIndex: 60,
    pointerEvents: 'none',
    filter: 'drop-shadow(0 4px 18px rgba(0,0,0,.35))',
    animation: `sound-pop-float ${POP_MS}ms ease-out forwards`,
  }
}

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
  const popIdRef = useRef(0)
  const [hitSound, setHitSound] = useState<string | null>(null)
  const [pops, setPops] = useState<{ id: number; emoji: string; offsetX: number }[]>([])

  useEffect(() => {
    // self: false (the default) so the sender doesn't get their own click
    // echoed back — playLocalEffect below already fires for them
    // immediately, without waiting on a round trip.
    const channel = supabase
      .channel(`noises:${partyId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'noise' }, (payload) => {
        const sound = payload.payload.sound as string
        playLocalEffect(sound)
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

  /** Plays + animates for THIS client only — called directly for the player
   * who clicked (so it's instant, not waiting on their own broadcast to come
   * back) and again whenever a broadcast from someone else arrives, so every
   * player in the party sees/hears the same thing. */
  function playLocalEffect(sound: string) {
    const audio = audioRefs.current[sound]
    if (audio) {
      // Rewinding before play (rather than relying on the previous playback
      // finishing) is what lets spamming the same button restart it every
      // time instead of the repeat clicks doing nothing until it ends.
      audio.currentTime = 0
      // jsdom's play() returns undefined rather than a Promise in tests.
      audio.play()?.catch(() => {})
    }
    setHitSound(sound)
    if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current)
    glowTimeoutRef.current = setTimeout(() => setHitSound(null), GLOW_MS)
    const emoji = SOUNDS.find((s) => s.key === sound)?.emoji ?? ''
    const id = ++popIdRef.current
    // Random horizontal jitter so spamming the same sound (or several
    // players triggering different ones close together) fans out instead of
    // every pop stacking exactly on top of the last.
    const offsetX = Math.round((Math.random() - 0.5) * 140)
    setPops((prev) => [...prev, { id, emoji, offsetX }])
    setTimeout(() => setPops((prev) => prev.filter((p) => p.id !== id)), POP_MS)
  }

  function playSound(sound: string) {
    if (isMuted || !noisesEnabled) return
    channelRef.current?.send({ type: 'broadcast', event: 'noise', payload: { sound } })
    playLocalEffect(sound)
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
      {pops.map((p) => (
        <span key={p.id} style={popStyle(p.offsetX)}>
          {p.emoji}
        </span>
      ))}
      {noisesEnabled && isMuted && (
        <div style={mutedOverlayWrapStyle}>
          <span style={mutedOverlayBadgeStyle}>
            Host muted you · 0:{String(remainingSeconds).padStart(2, '0')}
          </span>
        </div>
      )}
      {isHost && noisesEnabled && (
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
