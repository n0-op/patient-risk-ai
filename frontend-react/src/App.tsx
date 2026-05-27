import { useCallback, useEffect, useState } from 'react'
import { analyzeCustom, analyzePatient, getPatients } from './api/client'
import { Sidebar } from './components/Sidebar'
import { MainPanel, type PanelState } from './components/MainPanel'
import type { ActivePatient, CustomPatientRequest, Patient, ViewMode } from './types'
import './App.css'

function toActivePatient(p: Patient): ActivePatient {
  return {
    id: p.id,
    name: p.name,
    age: p.age,
    gender: p.gender,
    dx: p.diagnoses[0] ?? '',
  }
}

export default function App() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<ViewMode>('patients')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [summaryCache, setSummaryCache] = useState<Record<string, string>>({})
  const [panelState, setPanelState] = useState<PanelState>({ kind: 'empty' })

  useEffect(() => {
    getPatients()
      .then(setPatients)
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setPatientsLoading(false))
  }, [])

  const fetchAnalysis = useCallback(async (patient: ActivePatient) => {
    setPanelState({ kind: 'loading', patient })
    try {
      const data = await analyzePatient(patient.id)
      setSummaryCache((prev) => ({ ...prev, [patient.id]: data.summary }))
      setPanelState({
        kind: 'summary',
        patient,
        summary: data.summary,
        fromCache: false,
      })
    } catch (err) {
      setPanelState({
        kind: 'error',
        message: `Analysis failed: ${(err as Error).message}`,
      })
    }
  }, [])

  const handleSelectPatient = (p: Patient) => {
    if (selectedId === p.id) return
    const active = toActivePatient(p)
    setViewMode('patients')
    setSelectedId(p.id)
    const cached = summaryCache[p.id]
    if (cached) {
      setPanelState({ kind: 'summary', patient: active, summary: cached, fromCache: true })
    } else {
      void fetchAnalysis(active)
    }
  }

  const handleRefresh = () => {
    if (panelState.kind !== 'summary') return
    const patient = panelState.patient
    setSummaryCache((prev) => {
      const next = { ...prev }
      delete next[patient.id]
      return next
    })
    void fetchAnalysis(patient)
  }

  const handleBuildPatient = () => {
    setViewMode('build')
    setSelectedId(null)
    setPanelState({ kind: 'build' })
  }

  const handleBackToPatients = () => {
    setViewMode('patients')
    setSelectedId(null)
    setPanelState({ kind: 'empty' })
  }

  const handleBuildSubmit = async (payload: CustomPatientRequest) => {
    setPanelState({ kind: 'loading', patient: { id: '', name: payload.name, age: payload.age, gender: payload.gender, dx: '' } })
    try {
      const data = await analyzeCustom(payload)
      const dx = payload.diagnoses[0]?.replace(/^[\w.]+ — /, '') ?? 'Custom patient'
      setViewMode('patients')
      setPanelState({
        kind: 'custom-summary',
        name: payload.name,
        age: String(payload.age),
        gender: payload.gender,
        dx,
        summary: data.summary,
      })
    } catch (err) {
      setPanelState({
        kind: 'error',
        message: `Analysis failed: ${(err as Error).message}`,
      })
    }
  }

  return (
    <>
      <Sidebar
        patients={patients}
        selectedId={selectedId}
        loadError={loadError}
        loading={patientsLoading}
        onSelectPatient={handleSelectPatient}
        onBuildPatient={handleBuildPatient}
      />
      <MainPanel
        viewMode={viewMode}
        panelState={panelState}
        onRefresh={handleRefresh}
        onBackToPatients={handleBackToPatients}
        onBuildSubmit={handleBuildSubmit}
      />
    </>
  )
}
