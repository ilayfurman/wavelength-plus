import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { GameHeader } from './GameHeader'

describe('GameHeader', () => {
  it('shows the round progress and calls onMenu when the menu button is tapped', () => {
    const onMenu = vi.fn()
    render(<GameHeader round={2} total={3} onMenu={onMenu} />)
    expect(screen.getByText('Round 2/3')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /menu/i }))
    expect(onMenu).toHaveBeenCalled()
  })

  it('shows a room code chip when room is provided', () => {
    render(<GameHeader round={1} total={1} room="TQXK" onMenu={vi.fn()} />)
    expect(screen.getByText(/TQXK/)).toBeInTheDocument()
  })
})
