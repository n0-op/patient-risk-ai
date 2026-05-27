import type { CustomPatientRequest, DiagnosisEntry, MedicationInput } from '../types'

export interface BuildFormState {
  name: string
  age: string
  gender: string
  diagnoses: DiagnosisEntry[]
  medications: MedicationInput[]
  riskFlags: string[]
  labs: {
    a1c: string
    egfr: string
    bloodPressure: string
    creatinine: string
    hemoglobin: string
  }
}

export function parseFloatOrNull(val: string): number | null {
  const n = parseFloat(val)
  return Number.isNaN(n) ? null : n
}

export function buildCustomPatientPayload(form: BuildFormState): CustomPatientRequest {
  return {
    name: form.name.trim(),
    age: parseInt(form.age, 10),
    gender: form.gender,
    diagnoses: form.diagnoses.map((d) => (d.code ? `${d.code} — ${d.name}` : d.name)),
    medications: form.medications,
    lab_values: {
      a1c: parseFloatOrNull(form.labs.a1c),
      egfr: parseFloatOrNull(form.labs.egfr),
      blood_pressure: form.labs.bloodPressure.trim() || null,
      creatinine: parseFloatOrNull(form.labs.creatinine),
      hemoglobin: parseFloatOrNull(form.labs.hemoglobin),
    },
    risk_flags: form.riskFlags,
  }
}

export function validateBuildForm(form: BuildFormState): string | null {
  if (!form.name.trim() || !form.age.trim()) {
    return 'Name and age are required.'
  }
  return null
}
