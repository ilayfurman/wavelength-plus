import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NameAvatarStep } from './NameAvatarStep'

describe('NameAvatarStep', () => {
  it('pre-fills the given name/avatar and calls onContinue with the current values', () => {
    const onContinue = vi.fn()
    render(<NameAvatarStep initialName="Maya" initialAvatar="🌮" onContinue={onContinue} />)
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(onContinue).toHaveBeenCalledWith('Maya', '🌮')
  })
})
