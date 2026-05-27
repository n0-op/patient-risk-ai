function inline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
}

export function renderMarkdown(raw: string): string {
  const esc = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return esc
    .split('\n')
    .map((line) => {
      const t = line.trim()
      if (/^#{1,3}\s/.test(t)) return `<h3>${inline(t.replace(/^#{1,3}\s/, ''))}</h3>`
      if (/^[-*]\s/.test(t)) return `<p>• ${inline(t.slice(2))}</p>`
      if (t === '') return ''
      return `<p>${inline(t)}</p>`
    })
    .join('\n')
}
