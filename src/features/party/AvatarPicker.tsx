const AVATARS = ['🌮', '😬', '🐝', '🦄', '🦊', '🐙', '🌶️', '🎈', '🧠', '🐸', '🦁', '🍩']

export function AvatarPicker({ value, onChange }: { value: string; onChange: (a: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Choose an avatar">
      {AVATARS.map((a) => (
        <button
          key={a}
          type="button"
          role="radio"
          aria-checked={value === a}
          onClick={() => onChange(a)}
          style={{ fontSize: 24, opacity: value === a ? 1 : 0.5 }}
        >
          {a}
        </button>
      ))}
    </div>
  )
}
