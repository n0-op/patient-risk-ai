export interface Medication {
  name: string
  dose: string
}

export interface LabValues {
  A1C_percent?: number
  creatinine_mg_dL?: number
  blood_pressure_mmHg?: string
  eGFR_mL_min_1_73m2?: number
}

export interface RecentVisit {
  date?: string
  reason?: string
  notes?: string
}

export interface Patient {
  id: string
  name: string
  age: number
  gender: string
  diagnoses: string[]
  medications: Medication[]
  lab_values: LabValues
  risk_flags: string[]
  recent_visit: RecentVisit
}

export interface AnalysisResult {
  patient_id: string
  summary: string
  source: string
  generated_at: string
}

export interface LabValuesInput {
  a1c?: number | null
  egfr?: number | null
  blood_pressure?: string | null
  creatinine?: number | null
  hemoglobin?: number | null
}

export interface MedicationInput {
  name: string
  dose: string
}

export interface CustomPatientRequest {
  name: string
  age: number
  gender: string
  diagnoses: string[]
  medications: MedicationInput[]
  lab_values: LabValuesInput
  risk_flags: string[]
}

export interface DiagnosisEntry {
  code: string
  name: string
}

export type Priority = 'high' | 'medium' | 'low'

export interface ActivePatient {
  id: string
  name: string
  age: number
  gender: string
  dx: string
}

export type ViewMode = 'patients' | 'build'
