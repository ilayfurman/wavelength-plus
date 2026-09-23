type Team = { id: string; name: string; score: number }

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
  return (
    <div>
      <h2>Final scores</h2>
      <ol>
        {sorted.map((t) => (
          <li key={t.id} data-testid="final-team-row">
            {t.name}: {t.score}
          </li>
        ))}
      </ol>
      <button onClick={onPlayAgain}>Play again</button>
      <button onClick={onNewTeams}>New teams</button>
    </div>
  )
}
