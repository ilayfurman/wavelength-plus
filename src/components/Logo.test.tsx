import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Logo } from './Logo'

describe('Logo', () => {
  it('renders "on the" and "retsef" for the inline variant', () => {
    render(<Logo variant="inline" size="md" />)
    expect(screen.getByText('on the')).toBeInTheDocument()
    expect(screen.getByText('retsef')).toBeInTheDocument()
  })

  it('renders a mini dial for the icon variant', () => {
    render(<Logo variant="icon" size="lg" />)
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })
})
