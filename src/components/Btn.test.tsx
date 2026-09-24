import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Btn } from './Btn'

describe('Btn', () => {
  it('renders the label and calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Btn kind="primary" size="lg" label="Create party" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Create party' }))
    expect(onClick).toHaveBeenCalled()
  })

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn()
    render(<Btn kind="primary" size="lg" label="Create party" onClick={onClick} disabled />)
    fireEvent.click(screen.getByRole('button', { name: 'Create party' }))
    expect(onClick).not.toHaveBeenCalled()
  })
})
