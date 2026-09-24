import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ClueCard } from './ClueCard'

describe('ClueCard', () => {
  it('shows the label and clue text when not editable', () => {
    render(<ClueCard label="Alex's clue" clue="Coffee" tone="default" editable={false} />)
    expect(screen.getByText("Alex's clue")).toBeInTheDocument()
    expect(screen.getByText('Coffee')).toBeInTheDocument()
  })

  it('renders an editable input and calls onClueChange when editable', () => {
    const onClueChange = vi.fn()
    render(<ClueCard label="Your clue" clue="" tone="gold" editable onClueChange={onClueChange} placeholder="Type a clue…" />)
    const input = screen.getByPlaceholderText('Type a clue…')
    fireEvent.change(input, { target: { value: 'Sauna' } })
    expect(onClueChange).toHaveBeenCalledWith('Sauna')
  })

  it('shows a LIVE badge when live is true', () => {
    render(<ClueCard label="Watching" clue="Coffee" tone="nova" editable={false} live />)
    expect(screen.getByText('LIVE')).toBeInTheDocument()
  })
})
