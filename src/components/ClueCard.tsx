import { useState } from 'react'
import type { CSSProperties } from 'react'

type Tone = 'default' | 'gold' | 'nova'
type Size = 'md' | 'lg'

interface ClueCardProps {
  label: string
  clue: string
  tone: Tone
  editable: boolean
  onClueChange?: (v: string) => void
  live?: boolean
  size?: Size
  placeholder?: string
}

const toneColors: Record<Tone, { border: string; labelColor: string }> = {
  default: {
    border: 'rgba(200,180,255,.12)',
    labelColor: '#A9A3C9',
  },
  gold: {
    border: 'rgba(255,209,102,.5)',
    labelColor: '#FFD166',
  },
  nova: {
    border: 'rgba(91,214,255,.5)',
    labelColor: '#8FE3FF',
  },
}

const sizeConfig: Record<Size, { fs: number; lh: number; ls: number; rad: number; pad: string }> = {
  md: { fs: 36, lh: 44, ls: 11, rad: 18, pad: '12px 14px' },
  lg: { fs: 52, lh: 58, ls: 12, rad: 22, pad: '16px 18px' },
}

/** Scales the clue's font size down as it gets longer, so a wordy clue stays
 * inside the card (wrapping onto a second line at the smaller sizes) instead
 * of overflowing past its edges at a fixed size meant for a short phrase. */
function clueFontSize(text: string, base: number): number {
  const len = text.length
  if (len <= 18) return base
  if (len <= 26) return base * 0.82
  if (len <= 36) return base * 0.68
  return base * 0.56
}

export function ClueCard({
  label,
  clue,
  tone,
  editable,
  onClueChange,
  live = false,
  size = 'md',
  placeholder = 'Type a clue…',
}: ClueCardProps) {
  const [inputValue, setInputValue] = useState(clue || '')

  const colors = toneColors[tone]
  const config = sizeConfig[size]

  const containerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    boxSizing: 'border-box',
    background: `linear-gradient(180deg,rgba(52,40,110,.55),rgba(24,18,56,.6))`,
    border: `1px solid ${colors.border}`,
    borderRadius: `${config.rad}px`,
    padding: config.pad,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    fontFamily: 'Rubik, system-ui, sans-serif',
    color: '#F4F2FB',
  }

  const labelStyle: CSSProperties = {
    font: `600 ${config.ls}px/1 Rubik, sans-serif`,
    letterSpacing: '.16em',
    color: colors.labelColor,
    textAlign: 'center',
    whiteSpace: 'nowrap',
  }

  const clueStyle: CSSProperties = {
    font: `600 ${clueFontSize(clue, config.fs)}px/1.15 Fredoka, Rubik, sans-serif`,
    whiteSpace: 'normal',
    overflowWrap: 'break-word',
    textAlign: 'center',
    maxWidth: '100%',
  }

  const inputStyle: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    height: `${config.lh}px`,
    textAlign: 'center',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    font: `600 ${clueFontSize(inputValue, config.fs)}px/1 Fredoka, Rubik, sans-serif`,
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    if (onClueChange) {
      onClueChange(value)
    }
  }

  const liveStyle: CSSProperties = {
    position: 'absolute',
    top: '10px',
    right: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    font: '700 10px/1 Rubik, sans-serif',
    letterSpacing: '.12em',
    color: '#FF8FB8',
  }

  const dotStyle: CSSProperties = {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: '#FF6FA3',
    boxShadow: '0 0 8px #FF6FA3',
    animation: 'pulse 1.5s infinite',
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <div style={containerStyle}>
        {live && (
          <span style={liveStyle}>
            <span style={dotStyle} />
            LIVE
          </span>
        )}
        <span style={labelStyle}>{label}</span>
        {editable ? (
          <input
            style={inputStyle}
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
          />
        ) : (
          <span style={clueStyle}>{clue}</span>
        )}
      </div>
    </>
  )
}
