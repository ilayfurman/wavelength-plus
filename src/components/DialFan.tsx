import { useId, useRef, type PointerEvent } from 'react'
import { WEDGE_THRESHOLDS } from '../lib/scoringConstants'

// Geometry constants from docs/design/reference/Dial.dc.html's renderVals().
const CX = 180
const CY = 178
const RO = 150 // outer radius of the ring / bands
const RI = 98 // inner radius of the ring / bands
const RM = 124 // radius at which score labels sit

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x))
}

/** P(v, r) — a point at value v (0..1) on a circle of radius r around the pivot. */
function P(v: number, r: number): [number, number] {
  const a = Math.PI * (1 - v)
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)]
}

function f(q: [number, number]) {
  return `${q[0].toFixed(1)} ${q[1].toFixed(1)}`
}

/** An annular-sector path between radius RI and RO, spanning values [a,b]. */
function band(a: number, b: number) {
  a = clamp01(a)
  b = clamp01(b)
  if (b - a < 0.001) return ''
  return `M${f(P(a, RO))} A${RO} ${RO} 0 0 1 ${f(P(b, RO))} L${f(P(b, RI))} A${RI} ${RI} 0 0 0 ${f(P(a, RI))} Z`
}

/**
 * Pure angle-to-value conversion, ported from the reference's `setFrom()`.
 * Given a point (x, y) in the dial's local 360x250 coordinate space and the
 * pivot (cx, cy), returns the value in [0,1] that a pointer at that position
 * corresponds to. Angles below the semicircle (a < 0, i.e. the pointer is
 * below the pivot line) are clamped to whichever end of the dial (0 or 1)
 * they're nearest to, so a drag that overshoots past either tip still
 * produces a sane in-range value instead of jumping to the opposite end.
 */
export function angleToValue(x: number, y: number, cx: number, cy: number): number {
  let a = Math.atan2(cy - y, x - cx)
  if (a < 0) a = x < cx ? Math.PI : 0
  return Math.round((1 - a / Math.PI) * 100) / 100
}

/** Label position + rotation for the score number at value m along radius RM. */
function lbl(m: number) {
  const q = P(m, RM)
  return {
    x: q[0].toFixed(1),
    y: q[1].toFixed(1),
    tf: `rotate(${((m - 0.5) * 180).toFixed(1)} ${q[0].toFixed(1)} ${q[1].toFixed(1)})`,
    op: m > 0.02 && m < 0.98 ? 1 : 0,
  }
}

export function DialFan({
  value,
  interactive = false,
  onChange,
  revealedTarget,
}: {
  value: number
  interactive?: boolean
  onChange?: (v: number) => void
  revealedTarget?: number
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const draggingRef = useRef(false)
  const isInteractive = interactive && !!onChange
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')

  function valueFromPointer(e: PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return value
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) * 360) / rect.width
    const y = ((e.clientY - rect.top) * 250) / rect.height
    return angleToValue(x, y, CX, CY)
  }

  function handlePointerDown(e: PointerEvent<SVGSVGElement>) {
    if (!isInteractive) return
    draggingRef.current = true
    e.currentTarget.setPointerCapture?.(e.pointerId)
    onChange?.(valueFromPointer(e))
  }

  function handlePointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!isInteractive || !draggingRef.current) return
    onChange?.(valueFromPointer(e))
  }

  function handlePointerUp() {
    draggingRef.current = false
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isInteractive) return
    if (e.key === 'ArrowRight') onChange?.(Math.min(1, Math.round((value + 0.01) * 100) / 100))
    if (e.key === 'ArrowLeft') onChange?.(Math.max(0, Math.round((value - 0.01) * 100) / 100))
  }

  const t = WEDGE_THRESHOLDS

  // Needle: tapered polygon per reference.
  const a = Math.PI * (1 - value)
  const tip = P(value, RO + 2)
  const qx = Math.sin(a) * 6
  const qy = Math.cos(a) * 6
  const needle = `${tip[0].toFixed(1)},${tip[1].toFixed(1)} ${(CX + qx).toFixed(1)},${(CY + qy).toFixed(1)} ${(CX - qx).toFixed(1)},${(CY - qy).toFixed(1)}`

  const showBands = revealedTarget !== undefined
  const target = revealedTarget ?? 0

  return (
    <svg
      ref={svgRef}
      role="slider"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-readonly={!isInteractive}
      tabIndex={isInteractive ? 0 : -1}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      viewBox="0 0 360 250"
      style={{
        width: '100%',
        height: 'auto',
        touchAction: 'none',
        overflow: 'visible',
        filter: 'drop-shadow(0 0 28px rgba(140,110,255,.4))',
        cursor: isInteractive ? 'grab' : 'default',
      }}
    >
      <defs>
        <linearGradient id={`rg${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2E2266" />
          <stop offset="1" stopColor="#15103A" />
        </linearGradient>
        <radialGradient id={`nd${uid}`} cx="40%" cy="38%" r="60%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".45" stopColor="#FFE9A8" />
          <stop offset="1" stopColor="#F2A93B" />
        </radialGradient>
        <radialGradient id={`pl${uid}`} cx="38%" cy="30%" r="75%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".5" stopColor="#D9D3F2" />
          <stop offset="1" stopColor="#7E73B8" />
        </radialGradient>
      </defs>

      {/* Ring background: filled annular arc from RI to RO. */}
      <path
        d="M30 178 A150 150 0 0 1 330 178 L278 178 A98 98 0 0 0 82 178 Z"
        fill={`url(#rg${uid})`}
        stroke="rgba(190,170,255,.4)"
        strokeWidth={1.5}
      />

      {showBands && (
        <>
          <path d={band(target - t.outer, target - t.inner)} fill="#8C6BFF" />
          <path d={band(target - t.inner, target - t.center)} fill="#FF6FA3" />
          <path d={band(target - t.center, target + t.center)} fill="#FFD166" />
          <path d={band(target + t.center, target + t.inner)} fill="#FF6FA3" />
          <path d={band(target + t.inner, target + t.outer)} fill="#8C6BFF" />
          {[
            { m: target - (t.outer + t.inner) / 2, label: '2' },
            { m: target - (t.inner + t.center) / 2, label: '3' },
            { m: target, label: '4' },
            { m: target + (t.inner + t.center) / 2, label: '3' },
            { m: target + (t.outer + t.inner) / 2, label: '2' },
          ].map(({ m, label }, i) => {
            const o = lbl(m)
            return (
              <text
                key={i}
                x={o.x}
                y={o.y}
                transform={o.tf}
                opacity={o.op}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ font: '700 16px Rubik, sans-serif' }}
                fill="#1A1233"
              >
                {label}
              </text>
            )
          })}
        </>
      )}

      {/* Needle drop shadow, drawn underneath the main needle. */}
      <polygon points={needle} fill="#FFD166" opacity={0.25} transform="translate(0 3)" />
      <polygon points={needle} fill={`url(#nd${uid})`} stroke="#FFF4D6" strokeWidth={1} strokeLinejoin="round" />

      {/* Pivot cap. */}
      <path d="M148 181 A32 32 0 0 1 212 181 Z" fill={`url(#pl${uid})`} />
      <ellipse cx={172} cy={162} rx={10} ry={5} fill="#fff" opacity={0.6} transform="rotate(-20 172 162)" />
    </svg>
  )
}
