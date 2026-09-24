import type { CSSProperties } from 'react'
import { DialFan } from './DialFan'

export type LogoVariant = 'inline' | 'stacked' | 'icon'
export type LogoSize = 'sm' | 'md' | 'lg' | 'xl'

// [wordmark px, "on the" px, icon square px] per size, matching Logo.dc.html.
const SIZE_TABLE: Record<LogoSize, [number, number, number]> = {
  sm: [26, 13, 40],
  md: [40, 17, 64],
  lg: [64, 20, 112],
  xl: [84, 24, 160],
}

const FONT_STACK = "'Fredoka', 'Rubik', sans-serif"

function OnThe({ size, extraStyle }: { size: number; extraStyle?: CSSProperties }) {
  return (
    <span
      style={{
        font: `600 ${size}px/1 ${FONT_STACK}`,
        color: 'var(--lavender)',
        ...extraStyle,
      }}
    >
      on the
    </span>
  )
}

function Retsef({ size, lineHeight = '1' }: { size: number; lineHeight?: string }) {
  return (
    <span
      style={{
        font: `700 ${size}px/${lineHeight} ${FONT_STACK}`,
        letterSpacing: lineHeight === '1' ? '-.01em' : '-.02em',
        background: 'var(--wordmark-gradient)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
      }}
    >
      retsef
    </span>
  )
}

export function Logo({
  variant,
  size = 'md',
  align = 'center',
}: {
  variant: LogoVariant
  size?: LogoSize
  align?: 'center' | 'flex-start'
}) {
  const [w, p, iconSize] = SIZE_TABLE[size]

  if (variant === 'inline') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap' }}>
        <OnThe size={p} />
        <Retsef size={w} />
      </div>
    )
  }

  if (variant === 'stacked') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: align, gap: 2, whiteSpace: 'nowrap' }}>
        <OnThe size={p} extraStyle={{ padding: '0 4px' }} />
        <Retsef size={w} lineHeight=".95" />
      </div>
    )
  }

  // variant === 'icon'
  const rad = Math.round(iconSize * 0.25)
  const inner = Math.round(iconSize * 0.85)
  const mt = Math.round(iconSize * 0.11)
  const shadow =
    iconSize >= 100
      ? '0 0 60px rgba(140,110,255,.35), 0 14px 34px rgba(0,0,0,.45)'
      : '0 6px 16px rgba(0,0,0,.35)'
  const scale = inner / 360 // DialFan's native SVG width is 360px (Task 4 geometry)

  return (
    <div
      style={{
        width: iconSize,
        height: iconSize,
        borderRadius: rad,
        background: 'radial-gradient(100% 100% at 50% 20%, #3A2D80, #15103A)',
        border: '1px solid rgba(200,180,255,.25)',
        boxShadow: shadow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: inner,
          height: Math.round((250 / 360) * inner),
          marginTop: mt,
          overflow: 'hidden',
        }}
      >
        {/* Non-interactive mini dial, scaled down via CSS transform from
            DialFan's native 360x250 viewBox (Task 4 geometry). */}
        <div style={{ width: 360, height: 250, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <DialFan value={0.62} />
        </div>
      </div>
    </div>
  )
}
