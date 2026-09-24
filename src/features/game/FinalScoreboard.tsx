import type { CSSProperties } from 'react'
import { Starfield } from '../../components/Starfield'
import { Btn } from '../../components/Btn'

type Team = { id: string; name: string; score: number }

const GOLD = '#FFD166'
const GOLD_GRADIENT = 'linear-gradient(180deg,#FFE08A 0%,#FFC94D 55%,#F2A93B 100%)'

const containerStyle: CSSProperties = {
  position: 'relative',
  minHeight: '100vh',
  overflow: 'hidden',
  background: 'var(--bg)',
}

const contentStyle: CSSProperties = {
  position: 'relative',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  padding: '32px 20px',
  boxSizing: 'border-box',
  gap: 32,
}

const headerStyle: CSSProperties = {
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

const headlineStyle: CSSProperties = {
  font: '700 32px/1.2 Fredoka, system-ui, sans-serif',
  background: GOLD_GRADIENT,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  margin: 0,
}

const scoresContainerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  maxWidth: 480,
  margin: '0 auto',
}

function rowStyle(isWinner: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '16px 20px',
    borderRadius: 12,
    background: isWinner
      ? GOLD_GRADIENT
      : 'linear-gradient(180deg, rgba(52,40,110,.55), rgba(24,18,56,.6))',
    border: isWinner ? `1.5px solid ${GOLD}` : '1px solid rgba(200,180,255,.12)',
    boxShadow: isWinner ? `0 0 24px ${GOLD}40, inset 0 1px 0 rgba(255,255,255,.3)` : 'none',
    color: isWinner ? '#1A1233' : 'var(--text)',
    fontWeight: isWinner ? 700 : 600,
  }
}

const rankStyle: CSSProperties = {
  minWidth: 32,
  textAlign: 'center',
  fontSize: 18,
  fontFamily: 'Fredoka, system-ui, sans-serif',
  fontWeight: 700,
}

const teamNameStyle: CSSProperties = {
  flex: 1,
  fontSize: 16,
  fontFamily: 'Rubik, system-ui, sans-serif',
}

const scoreStyle: CSSProperties = {
  fontSize: 20,
  fontFamily: 'Fredoka, system-ui, sans-serif',
  fontWeight: 700,
  minWidth: 40,
  textAlign: 'right',
}

const buttonsContainerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  width: '100%',
  maxWidth: 480,
  margin: '0 auto',
}

export function FinalScoreboard({
  teams,
  onPlayAgain,
  onNewTeams,
}: {
  teams: Team[]
  onPlayAgain: () => void
  onNewTeams: () => void
}) {
  const sorted = [...teams].sort((a, b) => b.score - a.score)
  const winner = sorted[0]

  return (
    <div style={containerStyle}>
      <Starfield />
      <div style={contentStyle}>
        <div style={headerStyle}>
          {winner && (
            <h2 style={headlineStyle}>Team {winner.name} wins! 🎉</h2>
          )}
        </div>

        <div style={scoresContainerStyle}>
          {sorted.map((t, index) => {
            const isWinner = index === 0
            return (
              <div key={t.id} style={rowStyle(isWinner)} data-testid="final-team-row">
                <div style={rankStyle}>{index + 1}</div>
                <div style={teamNameStyle}>{t.name}</div>
                <div style={scoreStyle}>{t.score}</div>
              </div>
            )
          })}
        </div>

        <div style={buttonsContainerStyle}>
          <Btn kind="primary" size="lg" label="Play again" onClick={onPlayAgain} />
          <Btn kind="secondary" size="lg" label="New teams" onClick={onNewTeams} />
        </div>
      </div>
    </div>
  )
}
