import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DialFan } from './DialFan'

describe('DialFan', () => {
  it('renders a slider with the given value', () => {
    render(<DialFan value={0.5} interactive onChange={vi.fn()} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuenow', '0.5')
  })

  it('calls onChange when dragged via arrow keys', () => {
    const onChange = vi.fn()
    render(<DialFan value={0.5} interactive onChange={onChange} />)
    const slider = screen.getByRole('slider')
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith(0.51)
  })

  it('is not interactive without onChange', () => {
    render(<DialFan value={0.5} />)
    expect(screen.getByRole('slider')).toHaveAttribute('aria-readonly', 'true')
  })
})
