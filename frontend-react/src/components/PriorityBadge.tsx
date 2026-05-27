import type { Priority } from '../types'

interface PriorityBadgeProps {
  priority: Priority
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <div className={`priority-badge priority-${priority}`}>
      Follow-up: {priority}
    </div>
  )
}
