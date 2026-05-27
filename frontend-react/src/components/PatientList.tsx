import type { Patient } from '../types'

interface PatientListProps {
  patients: Patient[]
  selectedId: string | null
  loadError: string | null
  loading: boolean
  onSelect: (patient: Patient) => void
}

export function PatientList({
  patients,
  selectedId,
  loadError,
  loading,
  onSelect,
}: PatientListProps) {
  if (loading) {
    return <div className="list-status">Loading patients…</div>
  }

  if (loadError) {
    return (
      <div className="list-status" style={{ color: '#ef4444' }}>
        Could not load patients.
        <br />
        <small>{loadError}</small>
      </div>
    )
  }

  return (
    <>
      {patients.map((p) => (
        <div
          key={p.id}
          className={`patient-item${selectedId === p.id ? ' active' : ''}`}
          onClick={() => onSelect(p)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelect(p)
            }
          }}
        >
          <div className="patient-name">{p.name}</div>
          <div className="patient-meta">
            {p.age} yrs · {p.gender}
          </div>
          <div className="patient-dx">{p.diagnoses[0]}</div>
        </div>
      ))}
    </>
  )
}
