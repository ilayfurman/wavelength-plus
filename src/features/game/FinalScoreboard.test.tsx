import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FinalScoreboard } from './FinalScoreboard'

describe('FinalScoreboard', () => {
  it('lists teams sorted by score, highest first', () => {
    render(
      <FinalScoreboard
        teams={[{ id: 'a', name: 'Tacos', score: 5 }, { id: 'b', name: 'Yikes', score: 9 }]}
        onPlayAgain={vi.fn()}
        onNewTeams={vi.fn()}
      />
    )
    const rows = screen.getAllByTestId('final-team-row')
    expect(rows[0]).toHaveTextContent('Yikes')
    expect(rows[1]).toHaveTextContent('Tacos')
  })

  it('calls onPlayAgain and onNewTeams', () => {
    const onPlayAgain = vi.fn()
    const onNewTeams = vi.fn()
    render(<FinalScoreboard teams={[]} onPlayAgain={onPlayAgain} onNewTeams={onNewTeams} />)
    fireEvent.click(screen.getByRole('button', { name: /play again/i }))
    fireEvent.click(screen.getByRole('button', { name: /new teams/i }))
    expect(onPlayAgain).toHaveBeenCalled()
    expect(onNewTeams).toHaveBeenCalled()
  })
})
