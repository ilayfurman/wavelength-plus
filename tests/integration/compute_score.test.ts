import { describe, it, expect } from 'vitest'
import { anonClient } from './helpers'

describe('compute_score', () => {
  it.each([
    [0.5, 0.5, 4],
    [0.5, 0.55, 4],
    [0.5, 0.58, 3],
    [0.5, 0.60, 3],
    [0.5, 0.63, 2],
    [0.5, 0.65, 2],
    [0.5, 0.70, 0],
    [0.0, 1.0, 0],
  ])('target=%f guess=%f -> %i', async (target, guess, expected) => {
    const client = anonClient()
    const { data, error } = await client.rpc('compute_score', { target, guess })
    expect(error).toBeNull()
    expect(data).toBe(expected)
  })
})
