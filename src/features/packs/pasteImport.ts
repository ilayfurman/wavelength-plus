export type PasteLineStatus = 'ok' | 'needs-format' | 'duplicate'

export interface PasteLineResult {
  line: string
  status: PasteLineStatus
}

export interface ParsePasteLinesResult {
  valid: { left: string; right: string }[]
  results: PasteLineResult[]
}

const MARKER_RE = /^\s*(?:\d+[.)]|[-*•])\s*/
const SEPARATOR_RE = /\s*(?:\||↔|<->|\t|\s+vs\.?\s+)\s*/i

/**
 * Parses a block of pasted text into spectrum pairs, per the paste-a-list
 * format in docs/design/reference/HANDOFF.md §5.
 */
export function parsePasteLines(
  text: string,
  existing: { left_label: string; right_label: string }[]
): ParsePasteLinesResult {
  const seen = new Set(
    existing.map((e) => `${e.left_label.trim().toLowerCase()}|${e.right_label.trim().toLowerCase()}`)
  )

  const valid: { left: string; right: string }[] = []
  const results: PasteLineResult[] = []

  const lines = text.split('\n').filter((l) => l.trim().length > 0)

  for (const rawLine of lines) {
    const stripped = rawLine.replace(MARKER_RE, '')
    const parts = stripped.split(SEPARATOR_RE).map((p) => p.trim())

    if (parts.length !== 2 || parts.some((p) => p.length === 0)) {
      results.push({ line: rawLine, status: 'needs-format' })
      continue
    }

    const [left, right] = parts
    const key = `${left.toLowerCase()}|${right.toLowerCase()}`

    if (seen.has(key)) {
      results.push({ line: rawLine, status: 'duplicate' })
      continue
    }

    seen.add(key)
    valid.push({ left, right })
    results.push({ line: rawLine, status: 'ok' })
  }

  return { valid, results }
}
