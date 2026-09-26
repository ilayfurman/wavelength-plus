import { Starfield } from '../../components/Starfield'
import { Logo } from '../../components/Logo'
import { Btn } from '../../components/Btn'

type Player = { id: string; display_name: string; avatar: string; confirmed_rematch: boolean }

const avatarStyle = (confirmed: boolean, isMe: boolean) => ({
  width: 52,
  height: 52,
  borderRadius: '50%' as const,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 26,
  background: 'rgba(255,255,255,.08)',
  opacity: confirmed ? 1 : 0.35,
  filter: confirmed ? 'none' : 'grayscale(1)',
  boxShadow: isMe ? '0 0 0 3px #120F2E, 0 0 0 5px var(--gold)' : 'none',
  transition: 'opacity 0.2s ease, filter 0.2s ease',
})

export function RematchWaiting({
  players,
  myPlayerId,
  onLeave,
}: {
  players: Player[]
  myPlayerId: string
  onLeave: () => void
}) {
  return (
    <div style={{ position: 'relative', minHeight: '100dvh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Starfield />
      <div
        style={{
          position: 'relative',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '32px 20px',
          boxSizing: 'border-box',
          gap: 24,
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        <Logo variant="inline" size="sm" />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)' }} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', opacity: 0.6 }} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', opacity: 0.3 }} />
          </div>
          <h1 style={{ margin: 0, font: '700 30px/1.15 var(--font-display)', color: 'var(--text)', textAlign: 'center' }}>
            You're in!
          </h1>
          <p style={{ margin: 0, font: '400 15px var(--font-body)', color: 'var(--text-muted)', textAlign: 'center' }}>
            Waiting for the host to open the lobby for the next round.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
            {players.map((p) => {
              const isMe = p.id === myPlayerId
              return (
                <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={avatarStyle(p.confirmed_rematch, isMe)}>{p.avatar}</span>
                  <span style={{ font: '600 12px var(--font-body)', color: isMe ? 'var(--text)' : 'var(--text-muted)' }}>
                    {isMe ? 'You' : p.display_name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <Btn kind="ghost" size="sm" label="Leave game" onClick={onLeave} />
      </div>
    </div>
  )
}
