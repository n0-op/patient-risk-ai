import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('escapes HTML in input', () => {
    expect(renderMarkdown('<script>')).toContain('&lt;script&gt;')
  })

  it('renders bold markdown', () => {
    expect(renderMarkdown('**risk**')).toContain('<strong>risk</strong>')
  })
})
