import { useState } from 'react'
import { fetchICD10, fetchRxNorm } from '../api/external'
import type { DiagnosisEntry } from '../types'
import {
  buildCustomPatientPayload,
  validateBuildForm,
  type BuildFormState,
} from '../utils/payload'
import { AutocompleteField } from './AutocompleteField'

const emptyForm = (): BuildFormState => ({
  name: '',
  age: '',
  gender: '',
  diagnoses: [],
  medications: [],
  riskFlags: [],
  labs: {
    a1c: '',
    egfr: '',
    bloodPressure: '',
    creatinine: '',
    hemoglobin: '',
  },
})

interface BuildPatientFormProps {
  onSubmit: (payload: ReturnType<typeof buildCustomPatientPayload>) => Promise<void>
}

export function BuildPatientForm({ onSubmit }: BuildPatientFormProps) {
  const [form, setForm] = useState<BuildFormState>(emptyForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [dxInput, setDxInput] = useState('')
  const [selectedDx, setSelectedDx] = useState<DiagnosisEntry | null>(null)

  const [medInput, setMedInput] = useState('')
  const [selectedMed, setSelectedMed] = useState<string | null>(null)
  const [doseInput, setDoseInput] = useState('')

  const [flagInput, setFlagInput] = useState('')

  const addDx = () => {
    const text = dxInput.trim()
    if (!text) return
    setForm((f) => ({
      ...f,
      diagnoses: [...f.diagnoses, selectedDx || { code: '', name: text }],
    }))
    setSelectedDx(null)
    setDxInput('')
  }

  const addMed = () => {
    const name = (selectedMed || medInput).trim()
    if (!name) return
    setForm((f) => ({
      ...f,
      medications: [...f.medications, { name, dose: doseInput.trim() }],
    }))
    setSelectedMed(null)
    setMedInput('')
    setDoseInput('')
  }

  const addFlag = () => {
    const text = flagInput.trim()
    if (!text) return
    setForm((f) => ({ ...f, riskFlags: [...f.riskFlags, text] }))
    setFlagInput('')
  }

  const handleSubmit = async () => {
    const validationError = validateBuildForm(form)
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await onSubmit(buildCustomPatientPayload(form))
    } finally {
      setSubmitting(false)
    }
  }

  const searchIcd10 = async (query: string) => {
    const items = await fetchICD10(query)
    return items.map((i) => JSON.stringify(i))
  }

  const selectIcd10 = (serialized: string) => {
    const item = JSON.parse(serialized) as DiagnosisEntry
    setSelectedDx(item)
    setDxInput(`${item.code} — ${item.name}`)
  }

  return (
    <div className="form-panel">
      <div className="form-grid-3">
        <div className="form-group">
          <label className="form-label">Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="Patient name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Age</label>
          <input
            type="number"
            className="form-input"
            min={0}
            max={120}
            placeholder="Age"
            value={form.age}
            onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Gender</label>
          <select
            className="form-select"
            value={form.gender}
            onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
          >
            <option value="">Select…</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="form-section">
        <label className="form-label">Diagnoses</label>
        <div className="ac-row">
          <AutocompleteField
            placeholder="Search ICD-10 (e.g. diabetes)"
            value={dxInput}
            onChange={setDxInput}
            onSearch={searchIcd10}
            onSelect={selectIcd10}
            renderItem={(serialized) => {
              const { code, name } = JSON.parse(serialized) as DiagnosisEntry
              return `${code} — ${name}`
            }}
          />
          <button type="button" className="add-btn" onClick={addDx}>
            Add
          </button>
        </div>
        <div className="tag-list">
          {form.diagnoses.map((d, i) => (
            <span key={i} className="tag">
              {d.code ? `${d.code} — ` : ''}
              {d.name}
              <button
                type="button"
                className="tag-remove"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    diagnoses: f.diagnoses.filter((_, idx) => idx !== i),
                  }))
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="form-section">
        <label className="form-label">Medications</label>
        <div className="ac-row">
          <AutocompleteField
            placeholder="Search medications (e.g. metformin)"
            value={medInput}
            onChange={setMedInput}
            onSearch={fetchRxNorm}
            onSelect={(name) => {
              setSelectedMed(name)
              setMedInput(name)
            }}
          />
          <input
            type="text"
            className="form-input dose-input"
            placeholder="Dose (e.g. 10mg)"
            value={doseInput}
            onChange={(e) => setDoseInput(e.target.value)}
          />
          <button type="button" className="add-btn" onClick={addMed}>
            Add
          </button>
        </div>
        <div className="tag-list">
          {form.medications.map((m, i) => (
            <span key={i} className="tag">
              {m.name}
              {m.dose ? ` ${m.dose}` : ''}
              <button
                type="button"
                className="tag-remove"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    medications: f.medications.filter((_, idx) => idx !== i),
                  }))
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="form-section">
        <label className="form-label">Lab Values</label>
        <div className="form-grid-5">
          {(
            [
              ['a1c', 'A1C (%)', '0.1', '7.2'],
              ['egfr', 'eGFR', '1', '45'],
              ['bloodPressure', 'Blood Pressure', undefined, '128/82'],
              ['creatinine', 'Creatinine', '0.1', '1.2'],
              ['hemoglobin', 'Hemoglobin', '0.1', '11.5'],
            ] as const
          ).map(([key, label, step, placeholder]) => (
            <div key={key} className="form-group">
              <label className="form-sublabel">{label}</label>
              <input
                type={key === 'bloodPressure' ? 'text' : 'number'}
                className="form-input"
                step={step}
                placeholder={placeholder}
                value={form.labs[key]}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    labs: { ...f.labs, [key]: e.target.value },
                  }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="form-section">
        <label className="form-label">Risk Flags</label>
        <div className="ac-row">
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Recent hospitalization"
            value={flagInput}
            onChange={(e) => setFlagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addFlag()
            }}
          />
          <button type="button" className="add-btn" onClick={addFlag}>
            Add
          </button>
        </div>
        <div className="tag-list">
          {form.riskFlags.map((f, i) => (
            <span key={i} className="tag">
              {f}
              <button
                type="button"
                className="tag-remove"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    riskFlags: prev.riskFlags.filter((_, idx) => idx !== i),
                  }))
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <div className="form-error">{error}</div>
        <button
          type="button"
          className="analyze-btn"
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? 'Analyzing…' : 'Analyze Patient'}
        </button>
      </div>
    </div>
  )
}
