import { useRef, useState } from 'react'
import { Starfield } from '../../components/Starfield'
import { Logo } from '../../components/Logo'
import { Btn } from '../../components/Btn'
import { DialFan } from '../../components/DialFan'

const ROOM_CODE_LENGTH = 4

const digitBoxStyle = (active: boolean) => ({
  height: 56,
  borderRadius: 14,
  background: active ? 'rgba(255,209,102,.08)' : 'var(--input-bg)',
  border: active ? '2px solid var(--gold)' : '1px solid var(--input-border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  font: '700 26px var(--font-display)',
  color: 'var(--text)',
})

export function Home({
  email,
  onCreate,
  onJoin,
  onOpenPacks,
  onSignOut,
  busy,
}: {
  email?: string | null
  onCreate: () => void
  onJoin: (roomCode: string) => void
  onOpenPacks?: () => void
  onSignOut?: () => void
  busy?: 'create' | 'join' | null
}) {
  const [roomCode, setRoomCode] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const chars = roomCode.padEnd(ROOM_CODE_LENGTH, ' ').split('')

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Starfield />
      <div
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 16px',
          boxSizing: 'border-box',
          gap: 14,
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Logo variant="inline" size="sm" />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
          <div style={{ maxWidth: 280, margin: '0 auto', width: '100%' }}>
            <DialFan value={0.6} revealedTarget={0.64} />
          </div>
          <h1
            style={{
              margin: 0,
              textAlign: 'center',
              font: '600 30px/1.15 var(--font-display)',
              color: 'var(--text)',
            }}
          >
            Game night?
          </h1>

          <Btn
            kind="primary"
            size="lg"
            label={busy === 'create' ? 'Creating…' : 'Create party'}
            onClick={onCreate}
            disabled={!!busy}
          />

          <div
            style={{
              background: 'linear-gradient(180deg, rgba(52,40,110,.55), rgba(24,18,56,.6))',
              border: '1px solid rgba(200,180,255,.12)',
              borderRadius: 24,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <span
              style={{
                font: '600 11px/1 var(--font-body)',
                letterSpacing: '.16em',
                color: 'var(--text-muted)',
                textAlign: 'center',
              }}
            >
              OR JOIN WITH A ROOM CODE
            </span>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (roomCode.length === ROOM_CODE_LENGTH) onJoin(roomCode.toUpperCase())
              }}
              style={{ display: 'flex', gap: 8, alignItems: 'center' }}
            >
              <div
                onClick={() => inputRef.current?.focus()}
                style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${ROOM_CODE_LENGTH}, minmax(0,1fr))`, gap: 6, cursor: 'text' }}
              >
                {chars.map((c, i) => (
                  <div key={i} style={digitBoxStyle(i === roomCode.length)}>
                    {c.trim()}
                  </div>
                ))}
              </div>
              <input
                ref={inputRef}
                id="room-code"
                aria-label="Room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, ROOM_CODE_LENGTH))}
                maxLength={ROOM_CODE_LENGTH}
                required
                autoComplete="off"
                style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
              />
              <div style={{ width: 92 }}>
                <Btn
                  kind="accent"
                  size="md"
                  label={busy === 'join' ? '…' : 'Join'}
                  disabled={roomCode.length !== ROOM_CODE_LENGTH || !!busy}
                />
              </div>
            </form>
          </div>

          {onOpenPacks && (
            <button
              onClick={onOpenPacks}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: 54,
                padding: '0 22px',
                borderRadius: 999,
                background: 'rgba(255,255,255,.06)',
                border: '1px solid rgba(200,180,255,.14)',
                color: 'var(--text)',
                font: '600 16px var(--font-body)',
                cursor: 'pointer',
              }}
            >
              <span>My packs</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>›</span>
            </button>
          )}

          {(email || onSignOut) && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              {email && (
                <span style={{ color: 'var(--text-subtle)', font: '500 12px var(--font-body)' }}>
                  Signed in as {email}
                </span>
              )}
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    font: '500 13px var(--font-body)',
                    cursor: 'pointer',
                    padding: 8,
                  }}
                >
                  Sign out
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
