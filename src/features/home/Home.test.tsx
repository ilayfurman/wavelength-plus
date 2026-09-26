import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Home } from './Home'

describe('Home', () => {
  it('calls onCreate when Create party is clicked', () => {
    const onCreate = vi.fn()
    render(<Home onCreate={onCreate} onJoin={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /create party/i }))
    expect(onCreate).toHaveBeenCalled()
  })

  it('calls onJoin with the entered room code', () => {
    const onJoin = vi.fn()
    render(<Home onCreate={vi.fn()} onJoin={onJoin} />)
    fireEvent.change(screen.getByLabelText(/room code/i), { target: { value: 'abcd' } })
    fireEvent.click(screen.getByRole('button', { name: /^join$/i }))
    expect(onJoin).toHaveBeenCalledWith('ABCD')
  })
})
