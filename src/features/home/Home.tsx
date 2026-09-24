import { useState } from 'react'
import { Starfield } from '../../components/Starfield'
import { Logo } from '../../components/Logo'
import { Btn } from '../../components/Btn'

const inputStyle = {
  width: '100%',
  height: 52,
  padding: '0 16px',
  borderRadius: 14,
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  color: 'var(--text)',
  fontFamily: 'var(--font-body)',
  fontSize: 16,
  boxSizing: 'border-box' as const,
}

export function Home({ onCreate, onJoin }: { onCreate: () => void; onJoin: (roomCode: string) => void }) {
  const [roomCode, setRoomCode] = useState('')

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Starfield />
      <div
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 20px',
          boxSizing: 'border-box',
          gap: 48,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Logo variant="inline" size="sm" />
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 32,
          }}
        >
          <Btn kind="primary" size="lg" label="Create a party" onClick={onCreate} />

          <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                padding: 24,
                borderRadius: 16,
                border: '1px solid rgba(200,180,255,.18)',
                background: 'rgba(255,255,255,.04)',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label
                  htmlFor="room-code"
                  style={{
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                  }}
                >
                  Room code
                </label>
                <input
                  id="room-code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  maxLength={4}
                  required
                  style={inputStyle}
                />
              </div>
              <Btn
                kind="accent"
                size="lg"
                label="Join party"
                onClick={() => onJoin(roomCode.toUpperCase())}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
