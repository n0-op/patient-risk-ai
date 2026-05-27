import type { ActivePatient, ViewMode } from '../types'
import { BuildPatientForm } from './BuildPatientForm'
import { EmptyState } from './EmptyState'
import { SummaryView } from './SummaryView'
import type { CustomPatientRequest } from '../types'

export type PanelState =
  | { kind: 'empty' }
  | { kind: 'loading'; patient: ActivePatient }
  | { kind: 'error'; message: string }
  | { kind: 'summary'; patient: ActivePatient; summary: string; fromCache: boolean }
  | { kind: 'build' }
  | {
      kind: 'custom-summary'
      name: string
      age: string
      gender: string
      dx: string
      summary: string
    }

interface MainPanelProps {
  viewMode: ViewMode
  panelState: PanelState
  onRefresh: () => void
  onBackToPatients: () => void
  onBuildSubmit: (payload: CustomPatientRequest) => Promise<void>
}

export function MainPanel({
  viewMode,
  panelState,
  onRefresh,
  onBackToPatients,
  onBuildSubmit,
}: MainPanelProps) {
  const title =
    viewMode === 'build'
      ? 'Build a Patient'
      : panelState.kind === 'summary' || panelState.kind === 'loading'
        ? panelState.patient.name
        : panelState.kind === 'custom-summary'
          ? panelState.name
          : 'Risk Assessment'

  const subtitle =
    viewMode === 'build'
      ? 'Configure a custom patient and run a live risk analysis.'
      : panelState.kind === 'loading'
        ? 'Generating risk assessment…'
        : panelState.kind === 'summary' || panelState.kind === 'custom-summary'
          ? 'AI-generated clinical risk summary'
          : 'Select a patient from the list to generate a clinical risk summary.'

  const showActions =
    panelState.kind === 'summary' ||
    panelState.kind === 'custom-summary' ||
    viewMode === 'build'

  const showRefresh = panelState.kind === 'summary'

  return (
    <main className="main">
      <div className="main-header">
        <div className="header-row">
          <div>
            <h2>{title}</h2>
            <p className="subtitle">{subtitle}</p>
          </div>
          {showActions && (
            <div className="header-actions" style={{ display: 'flex' }}>
              {panelState.kind === 'summary' && (
                <span
                  className={`cache-indicator ${panelState.fromCache ? 'cached' : 'live'}`}
                >
                  {panelState.fromCache ? 'Cached' : 'Live'}
                </span>
              )}
              {panelState.kind === 'custom-summary' && (
                <span className="cache-indicator live">Custom</span>
              )}
              {showRefresh ? (
                <button type="button" className="refresh-btn" onClick={onRefresh}>
                  ↺ Refresh
                </button>
              ) : (
                <button type="button" className="refresh-btn" onClick={onBackToPatients}>
                  ← Patients
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="content-area">{renderContent(panelState, viewMode, onBuildSubmit)}</div>
    </main>
  )
}

function renderContent(
  panelState: PanelState,
  viewMode: ViewMode,
  onBuildSubmit: (payload: CustomPatientRequest) => Promise<void>,
) {
  if (viewMode === 'build' && panelState.kind === 'build') {
    return <BuildPatientForm onSubmit={onBuildSubmit} />
  }

  switch (panelState.kind) {
    case 'empty':
      return <EmptyState />
    case 'loading':
      return (
        <div className="loading">
          <div className="spinner" />
          Analyzing patient record…
        </div>
      )
    case 'error':
      return <div className="error-msg">{panelState.message}</div>
    case 'summary':
      return (
        <SummaryView
          name={panelState.patient.name}
          age={panelState.patient.age}
          gender={panelState.patient.gender}
          dx={panelState.patient.dx}
          summary={panelState.summary}
        />
      )
    case 'custom-summary':
      return (
        <SummaryView
          name={panelState.name}
          age={panelState.age}
          gender={panelState.gender || 'Unknown'}
          dx={panelState.dx}
          summary={panelState.summary}
        />
      )
    default:
      return <EmptyState />
  }
}
