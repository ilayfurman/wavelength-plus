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

  it('uses the new 360x250 viewBox with pivot at (180,178)', () => {
    render(<DialFan value={0.5} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('viewBox', '0 0 360 250')
  })

  it('does not render scoring bands or labels when revealedTarget is undefined', () => {
    const { container } = render(<DialFan value={0.5} />)
    // Band fill colors that are only ever used for the target-centered bands
    // (not shared with the needle/pivot gradients) should be absent, and so
    // should the score-number <text> labels.
    const html = container.innerHTML
    expect(html).not.toContain('#8C6BFF')
    expect(html).not.toContain('#FF6FA3')
    expect(container.querySelectorAll('text')).toHaveLength(0)
  })

  it('renders target-centered scoring bands and labels when revealedTarget is set', () => {
    const { container } = render(<DialFan value={0.5} revealedTarget={0.66} />)
    const html = container.innerHTML
    expect(html).toContain('#8C6BFF')
    expect(html).toContain('#FF6FA3')
    expect(html).toContain('#FFD166')
    const labels = Array.from(container.querySelectorAll('text')).map((el) => el.textContent)
    expect(labels).toEqual(['2', '3', '4', '3', '2'])
  })
})
