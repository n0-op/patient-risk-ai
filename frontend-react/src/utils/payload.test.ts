import { describe, expect, it } from 'vitest'
import { buildCustomPatientPayload, validateBuildForm } from './payload'

describe('buildCustomPatientPayload', () => {
  it('maps form state to API request shape', () => {
    const payload = buildCustomPatientPayload({
      name: 'Test Patient',
      age: '55',
      gender: 'Female',
      diagnoses: [{ code: 'E11', name: 'Type 2 diabetes' }],
      medications: [{ name: 'Metformin', dose: '500mg' }],
      riskFlags: ['A1C not at target'],
      labs: {
        a1c: '7.5',
        egfr: '',
        bloodPressure: '130/80',
        creatinine: '',
        hemoglobin: '',
      },
    })

    expect(payload.name).toBe('Test Patient')
    expect(payload.age).toBe(55)
    expect(payload.diagnoses).toEqual(['E11 — Type 2 diabetes'])
    expect(payload.lab_values.a1c).toBe(7.5)
    expect(payload.lab_values.blood_pressure).toBe('130/80')
  })
})

describe('validateBuildForm', () => {
  it('requires name and age', () => {
    expect(
      validateBuildForm({
        name: '',
        age: '',
        gender: '',
        diagnoses: [],
        medications: [],
        riskFlags: [],
        labs: { a1c: '', egfr: '', bloodPressure: '', creatinine: '', hemoglobin: '' },
      }),
    ).toBe('Name and age are required.')
  })
})
