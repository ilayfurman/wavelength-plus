import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AiPromptSheet } from './AiPromptSheet'

describe('AiPromptSheet', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  it('fills the template with the given topic and copies it', async () => {
    render(<AiPromptSheet />)
    fireEvent.change(screen.getByLabelText(/topic/i), { target: { value: 'beer' } })
    fireEvent.click(screen.getByRole('button', { name: /generate/i }))
    expect(screen.getByText(/about "beer"/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /copy/i }))
    expect(navigator.clipboard.writeText).toHaveBeenCalled()
  })
})
