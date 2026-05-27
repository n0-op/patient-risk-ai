import type { Patient } from '../types'
import { PatientList } from './PatientList'

interface SidebarProps {
  patients: Patient[]
  selectedId: string | null
  loadError: string | null
  loading: boolean
  onSelectPatient: (patient: Patient) => void
  onBuildPatient: () => void
}

export function Sidebar({
  patients,
  selectedId,
  loadError,
  loading,
  onSelectPatient,
  onBuildPatient,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Patient Risk AI</h1>
        <p>Select a patient to run analysis</p>
      </div>
      <button type="button" className="build-btn" onClick={onBuildPatient}>
        ＋ Build a Patient
      </button>
      <div className="patient-list">
        <PatientList
          patients={patients}
          selectedId={selectedId}
          loadError={loadError}
          loading={loading}
          onSelect={onSelectPatient}
        />
      </div>
    </aside>
  )
}
