import type { CSSProperties } from 'react'
import { Logo } from './Logo'

interface GameHeaderProps {
  round: number
  total: number
  room?: string
  onMenu?: () => void
}

export function GameHeader({ round, total, room, onMenu }: GameHeaderProps) {
  const hasRoom = !!room
  const logoSize = hasRoom ? 'md' : 'sm'
  const fontSize = hasRoom ? 15 : 12
  const dotSize = hasRoom ? 10 : 8

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontFamily: 'Rubik, system-ui, sans-serif',
    color: '#F4F2FB',
  }

  const progressTextStyle: CSSProperties = {
    font: `500 ${fontSize}px/1 Rubik, sans-serif`,
    whiteSpace: 'nowrap',
  }

  const dotsContainerStyle: CSSProperties = {
    display: 'flex',
    gap: 4,
  }

  const dotStyle: CSSProperties = {
    width: dotSize,
    height: dotSize,
    borderRadius: '50%',
  }

  const roomChipStyle: CSSProperties = {
    height: 40,
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    marginLeft: 10,
    borderRadius: 999,
    background: 'rgba(255, 255, 255, 0.07)',
    border: '1px solid rgba(200, 180, 255, 0.16)',
    font: '600 14px Rubik, sans-serif',
    whiteSpace: 'nowrap',
  }

  const roomCodeStyle: CSSProperties = {
    fontFamily: 'ui-monospace, Menlo, monospace',
    letterSpacing: '0.14em',
    marginLeft: 6,
    color: '#FFD166',
  }

  const hamburgerButtonStyle: CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(200, 180, 255, 0.16)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    cursor: 'pointer',
    padding: 0,
    flex: 'none',
  }

  const hamburgerLineStyle: CSSProperties = {
    width: 16,
    height: 2,
    borderRadius: 1,
    background: '#F4F2FB',
  }

  return (
    <div style={containerStyle}>
      <Logo variant="inline" size={logoSize} />
      <div style={{ flex: 1 }} />
      <span style={progressTextStyle}>Round {round}/{total}</span>
      <div style={dotsContainerStyle}>
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            style={{
              ...dotStyle,
              background: i < round ? '#FFD166' : 'rgba(255, 255, 255, 0.18)',
            }}
          />
        ))}
      </div>
      {hasRoom && (
        <span style={roomChipStyle}>
          Join at retsef.app ·{' '}
          <span style={roomCodeStyle}>{room}</span>
        </span>
      )}
      {onMenu && (
        <button
          onClick={onMenu}
          style={hamburgerButtonStyle}
          aria-label="Menu"
        >
          <span style={hamburgerLineStyle} />
          <span style={hamburgerLineStyle} />
          <span style={hamburgerLineStyle} />
        </button>
      )}
    </div>
  )
}
