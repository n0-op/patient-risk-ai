import { renderMarkdown } from '../utils/markdown'
import { initials } from '../utils/initials'
import { detectPriority } from '../utils/priority'
import { PriorityBadge } from './PriorityBadge'

interface SummaryViewProps {
  name: string
  age: number | string
  gender: string
  dx: string
  summary: string
}

export function SummaryView({ name, age, gender, dx, summary }: SummaryViewProps) {
  const priority = detectPriority(summary)

  return (
    <div className="summary-wrap">
      <div className="patient-profile">
        <div className="avatar">{initials(name)}</div>
        <div className="profile-info">
          <div className="name">{name}</div>
          <div className="meta">
            {age} yrs · {gender} · {dx}
          </div>
        </div>
      </div>
      <div
        className="summary-card"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(summary) }}
      />
      {priority && <PriorityBadge priority={priority} />}
    </div>
  )
}
