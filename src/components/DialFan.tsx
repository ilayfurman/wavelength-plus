import { useRef, type PointerEvent } from 'react'
import { WEDGE_THRESHOLDS } from '../lib/scoringConstants'

const CX = 110
const CY = 112
const R = 100

function angleForValue(v: number) {
  // v in [0,1] maps to [180deg, 0deg] (left = 0, right = 1), matching
  // the "Hot ← / → Cold" label order used throughout the mockups.
  return Math.PI * (1 - v)
}

function pointOnArc(v: number, radius: number) {
  const angle = angleForValue(v)
  return { x: CX + radius * Math.cos(angle), y: CY - radius * Math.sin(angle) }
}

function wedgePath(fromV: number, toV: number, radius: number) {
  const p1 = pointOnArc(fromV, radius)
  const p2 = pointOnArc(toV, radius)
  return `M ${CX} ${CY} L ${p1.x} ${p1.y} A ${radius} ${radius} 0 0 1 ${p2.x} ${p2.y} Z`
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
  const isInteractive = interactive && !!onChange

  function valueFromPointer(e: PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return value
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const angle = Math.atan2(CY - y, x - CX)
    const clamped = Math.max(0, Math.min(Math.PI, angle))
    return Math.round((1 - clamped / Math.PI) * 100) / 100
  }

  function handlePointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!isInteractive || e.buttons !== 1) return
    onChange?.(valueFromPointer(e))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isInteractive) return
    if (e.key === 'ArrowRight') onChange?.(Math.min(1, Math.round((value + 0.01) * 100) / 100))
    if (e.key === 'ArrowLeft') onChange?.(Math.max(0, Math.round((value - 0.01) * 100) / 100))
  }

  const t = WEDGE_THRESHOLDS
  const needleAngle = angleForValue(value)
  const needleTip = pointOnArc(value, R * 0.68)

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
      onPointerMove={handlePointerMove}
      width={220}
      height={125}
      viewBox="0 0 220 125"
    >
      <path d={`M 10 ${CY} A ${R} ${R} 0 0 1 210 ${CY} Z`} fill="#F3ECDD" />
      <path d={wedgePath(0.5 + t.outer, 0.5 + t.inner, R)} fill="#E8A33D" />
      <path d={wedgePath(0.5 + t.inner, 0.5 + t.center, R)} fill="#D9482F" />
      <path d={wedgePath(0.5 + t.center, 0.5 - t.center, R)} fill="#4FB8AE" />
      <path d={wedgePath(0.5 - t.center, 0.5 - t.inner, R)} fill="#D9482F" />
      <path d={wedgePath(0.5 - t.inner, 0.5 - t.outer, R)} fill="#E8A33D" />
      {revealedTarget !== undefined && (
        <circle cx={pointOnArc(revealedTarget, R * 0.85).x} cy={pointOnArc(revealedTarget, R * 0.85).y} r={6} fill="#2E7D6B" />
      )}
      <line x1={CX} y1={CY} x2={needleTip.x} y2={needleTip.y} stroke="#E8394A" strokeWidth={7} strokeLinecap="round" />
      <circle cx={CX} cy={CY} r={30} fill="#E8394A" />
      {needleAngle >= 0 && null}
    </svg>
  )
}
