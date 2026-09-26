import type { CSSProperties } from 'react'
import { Starfield } from '../../components/Starfield'
import { Logo } from '../../components/Logo'
import { Btn } from '../../components/Btn'

type Team = { id: string; name: string; score: number }

// Same rotation and same sort-by-id determinism as TeamScoreboard, so a
// team's color stays consistent between the in-game view and this screen.
const TEAM_COLORS = ['#FF6FA3', '#5BD6FF', '#8C6BFF', '#FFD166']

const containerStyle: CSSProperties = {
  position: 'relative',
  minHeight: '100dvh',
  overflow: 'hidden',
  background: 'var(--bg)',
}

const contentStyle: CSSProperties = {
  position: 'relative',
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  padding: '32px 16px',
  boxSizing: 'border-box',
  gap: 14,
  maxWidth: 480,
  margin: '0 auto',
}

function winnerCardStyle(color: string): CSSProperties {
  return {
    borderRadius: 28,
    padding: '20px 18px',
    background: `radial-gradient(120% 100% at 50% 0%, ${color}61, ${color}0F 70%)`,
    border: `1.5px solid ${color}99`,
    boxShadow: `0 0 40px ${color}38`,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    marginTop: 10,
  }
}

const runnerUpRowStyle: CSSProperties = {
  borderRadius: 24,
  padding: '14px 18px',
  background: 'linear-gradient(180deg, rgba(52,40,110,.55), rgba(24,18,56,.6))',
  border: '1px solid rgba(200,180,255,.14)',
  display: 'flex',
  alignItems: 'center',
  gap: 14,
}

function rankBadgeStyle(isWinner: boolean): CSSProperties {
  return {
    width: isWinner ? 44 : 36,
    height: isWinner ? 44 : 36,
    borderRadius: '50%',
    background: isWinner ? 'var(--gold)' : 'rgba(255,255,255,.12)',
    color: isWinner ? '#1A1233' : 'var(--text)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: isWinner ? 22 : 18,
    flex: 'none',
  }
}

export function FinalScoreboard({
  teams,
  onPlayAgain,
  onLeave,
  endedReason,
}: {
  teams: Team[]
  onPlayAgain: () => void
  onLeave: () => void
  /** Set when the game was cut short rather than reaching its natural end — e.g. 'player_left' left a team below 2 players. */
  endedReason?: string | null
}) {
  // Color assignment matches TeamScoreboard: stable by id, independent of score order.
  const colorById = new Map(
    [...teams].sort((a, b) => a.id.localeCompare(b.id)).map((t, i) => [t.id, TEAM_COLORS[i % TEAM_COLORS.length]])
  )
  const sorted = [...teams].sort((a, b) => b.score - a.score)
  const winner = sorted[0]
  const runnersUp = sorted.slice(1)

  return (
    <div style={containerStyle}>
      <Starfield />
      <div style={contentStyle}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Logo variant="inline" size="sm" />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 22 }}>
          <span
            style={{
              font: '600 11px/1 var(--font-body)',
              letterSpacing: '.2em',
              color: 'var(--text-muted)',
            }}
          >
            GAME OVER
          </span>
          {winner && (
            <h1
              style={{
                margin: 0,
                font: '700 44px/1.05 var(--font-display)',
                textAlign: 'center',
                color: 'var(--text)',
              }}
            >
              The {winner.name}
              <br />
              called it!
            </h1>
          )}
          {endedReason === 'player_left' && (
            <p
              style={{
                margin: '4px 0 0',
                textAlign: 'center',
                font: '500 14px var(--font-body)',
                color: 'var(--text-muted)',
                maxWidth: 320,
              }}
            >
              A player left and their team couldn't keep going, so the game ended early.
            </p>
          )}
        </div>

        {winner && (
          <div style={winnerCardStyle(colorById.get(winner.id) ?? TEAM_COLORS[0])} data-testid="final-team-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={rankBadgeStyle(true)}>1</div>
              <span style={{ flex: 1, font: '700 22px var(--font-body)', color: 'var(--text)' }}>{winner.name}</span>
              <span
                style={{
                  font: '700 50px/1 var(--font-display)',
                  color: colorById.get(winner.id) ?? TEAM_COLORS[0],
                }}
              >
                {winner.score}
              </span>
            </div>
          </div>
        )}

        {runnersUp.map((t, i) => (
          <div key={t.id} style={runnerUpRowStyle} data-testid="final-team-row">
            <div style={rankBadgeStyle(false)}>{i + 2}</div>
            <span style={{ flex: 1, font: '600 18px var(--font-body)', color: 'var(--text)' }}>{t.name}</span>
            <span style={{ font: '700 32px/1 var(--font-display)', color: colorById.get(t.id) ?? TEAM_COLORS[0] }}>
              {t.score}
            </span>
          </div>
        ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Btn kind="primary" size="lg" label="Play again" onClick={onPlayAgain} />
          <Btn kind="ghost" size="sm" label="Leave game" onClick={onLeave} />
        </div>
      </div>
    </div>
  )
}
