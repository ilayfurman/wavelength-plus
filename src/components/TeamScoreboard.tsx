export function TeamScoreboard({
  teams,
  activeTeamId,
}: {
  teams: { id: string; name: string; score: number }[]
  activeTeamId: string
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {teams.map((t) => (
        <div key={t.id} style={{ opacity: t.id === activeTeamId ? 1 : 0.7 }}>
          <div>{t.name}</div>
          <div>{t.score}</div>
        </div>
      ))}
    </div>
  )
}
