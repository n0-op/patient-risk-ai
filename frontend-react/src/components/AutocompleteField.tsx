import { useEffect, useRef, useState } from 'react'

interface AutocompleteFieldProps {
  placeholder: string
  value: string
  onChange: (value: string) => void
  onSearch: (query: string) => Promise<string[]>
  onSelect: (item: string) => void
  renderItem?: (item: string) => string
}

export function AutocompleteField({
  placeholder,
  value,
  onChange,
  onSearch,
  onSelect,
  renderItem = (item) => item,
}: AutocompleteFieldProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const q = value.trim()
    if (timerRef.current) clearTimeout(timerRef.current)

    if (q.length < 2) {
      setSuggestions([])
      return
    }

    timerRef.current = setTimeout(() => {
      onSearch(q)
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value, onSearch])

  return (
    <div className="ac-wrap">
      <input
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
      />
      {suggestions.length > 0 && (
        <div className="ac-drop">
          {suggestions.map((item) => (
            <div
              key={item}
              className="ac-item"
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(item)
                setSuggestions([])
              }}
            >
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
