import { describe, it, expect } from 'vitest'
import { parsePasteLines } from './pasteImport'

describe('parsePasteLines', () => {
  it('parses lines separated by |, ↔, <->, tab, or vs', () => {
    const text = 'Awful beer | Great beer\nCold ↔ Hot\nBoring <-> Exciting\nSmall vs Big\n1. Quiet vs. Loud'
    const { valid, results } = parsePasteLines(text, [])
    expect(valid).toEqual([
      { left: 'Awful beer', right: 'Great beer' },
      { left: 'Cold', right: 'Hot' },
      { left: 'Boring', right: 'Exciting' },
      { left: 'Small', right: 'Big' },
      { left: 'Quiet', right: 'Loud' },
    ])
    expect(results.every((r) => r.status === 'ok')).toBe(true)
  })

  it('flags a line that does not split into exactly 2 parts as needs-format', () => {
    const { results } = parsePasteLines('just one thing with no separator', [])
    expect(results[0].status).toBe('needs-format')
  })

  it('flags a case-insensitive duplicate against existing pack contents', () => {
    const { results } = parsePasteLines('cold | hot', [{ left_label: 'Cold', right_label: 'Hot' }])
    expect(results[0].status).toBe('duplicate')
  })

  it('flags a duplicate against an earlier line in the same paste', () => {
    const { results } = parsePasteLines('Cold | Hot\ncold | hot', [])
    expect(results[0].status).toBe('ok')
    expect(results[1].status).toBe('duplicate')
  })

  it('strips leading numbering and bullet markers', () => {
    const { valid } = parsePasteLines('1. Cold | Hot\n- Small | Big\n* Quiet | Loud\n• Old | New', [])
    expect(valid.map((v) => v.left)).toEqual(['Cold', 'Small', 'Quiet', 'Old'])
  })
})
