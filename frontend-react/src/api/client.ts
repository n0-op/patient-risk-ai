import { API_BASE } from './config'
import type { AnalysisResult, CustomPatientRequest, Patient } from '../types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init)
  if (!res.ok) {
    throw new Error(`Server returned ${res.status}`)
  }
  return res.json() as Promise<T>
}

export function getPatients(): Promise<Patient[]> {
  return request<Patient[]>('/patients')
}

export function analyzePatient(id: string): Promise<AnalysisResult> {
  return request<AnalysisResult>(`/patients/${id}/analyze`, { method: 'POST' })
}

export function analyzeCustom(body: CustomPatientRequest): Promise<AnalysisResult> {
  return request<AnalysisResult>('/analyze/custom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
