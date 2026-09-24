const GLOW_LAYER: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'radial-gradient(120% 55% at 50% 58%, #2C2266 0%, #16123A 46%, #09081A 100%)',
}

const STARS_LAYER_1: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  opacity: 0.75,
  backgroundImage:
    'radial-gradient(1.3px 1.3px at 12px 18px,#fff 50%,transparent 51%),' +
    'radial-gradient(1px 1px at 64px 82px,rgba(255,255,255,.85) 50%,transparent 51%),' +
    'radial-gradient(1px 1px at 101px 34px,rgba(200,190,255,.9) 50%,transparent 51%),' +
    'radial-gradient(1.5px 1.5px at 143px 122px,rgba(255,255,255,.7) 50%,transparent 51%),' +
    'radial-gradient(1px 1px at 31px 151px,rgba(255,255,255,.6) 50%,transparent 51%)',
  backgroundSize: '170px 170px',
}

const STARS_LAYER_2: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  opacity: 0.45,
  backgroundImage:
    'radial-gradient(1px 1px at 44px 12px,#fff 50%,transparent 51%),' +
    'radial-gradient(1.2px 1.2px at 190px 70px,rgba(215,205,255,.9) 50%,transparent 51%),' +
    'radial-gradient(1px 1px at 120px 200px,#fff 50%,transparent 51%),' +
    'radial-gradient(1.8px 1.8px at 210px 160px,rgba(255,255,255,.5) 50%,transparent 51%)',
  backgroundSize: '236px 236px',
  backgroundPosition: '40px 60px',
}

/**
 * Layered starfield background: a radial purple glow plus two tiled
 * star-dot layers. Renders as an absolutely-positioned, non-interactive
 * layer meant to sit behind page content (parent should be `position:
 * relative` with `overflow: hidden` or similar).
 */
export function Starfield() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <div style={GLOW_LAYER} />
      <div style={STARS_LAYER_1} />
      <div style={STARS_LAYER_2} />
    </div>
  )
}
