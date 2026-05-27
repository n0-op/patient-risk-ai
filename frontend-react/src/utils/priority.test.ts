import { describe, expect, it } from 'vitest'
import { detectPriority } from './priority'

describe('detectPriority', () => {
  it('returns high when priority is stated explicitly', () => {
    expect(detectPriority('Follow-up priority: high')).toBe('high')
  })

  it('returns medium for moderate wording', () => {
    expect(detectPriority('priority: moderate')).toBe('medium')
  })

  it('returns null when no priority signal', () => {
    expect(detectPriority('Stable patient, continue current plan.')).toBeNull()
  })
})
