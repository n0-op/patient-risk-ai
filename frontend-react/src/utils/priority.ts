import type { Priority } from '../types'

export function detectPriority(text: string): Priority | null {
  const lower = text.toLowerCase()
  const m = lower.match(/(?:priority|follow[- ]?up)[:\s*]+(\w+)/)
  if (m) {
    if (m[1] === 'high') return 'high'
    if (m[1] === 'medium' || m[1] === 'moderate') return 'medium'
    if (m[1] === 'low') return 'low'
  }
  const tail = lower.slice(-120)
  if (tail.includes('high')) return 'high'
  if (tail.includes('medium') || tail.includes('moderate')) return 'medium'
  if (tail.includes('low')) return 'low'
  return null
}
