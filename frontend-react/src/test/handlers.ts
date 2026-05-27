import { http, HttpResponse } from 'msw'

const API_BASE = 'http://127.0.0.1:8000'

export const mockPatients = [
  {
    id: '32d994c4-a414-439a-a12e-7188a712e139',
    name: 'Margaret Chen',
    age: 67,
    gender: 'Female',
    diagnoses: ['Type 2 diabetes mellitus'],
    medications: [{ name: 'Metformin', dose: '1000mg twice daily' }],
    lab_values: {},
    risk_flags: [],
    recent_visit: {},
  },
]

export const handlers = [
  http.get(`${API_BASE}/patients`, () => HttpResponse.json(mockPatients)),
  http.post(`${API_BASE}/patients/:id/analyze`, () =>
    HttpResponse.json({
      patient_id: mockPatients[0].id,
      summary: 'Follow-up priority: high. Key risks noted.',
      source: 'live',
      generated_at: '2026-01-01T00:00:00+00:00',
    }),
  ),
  http.post(`${API_BASE}/analyze/custom`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      patient_id: 'custom-id',
      summary: `Custom analysis for ${(body as { name: string }).name}`,
      source: 'custom',
      generated_at: '2026-01-01T00:00:00+00:00',
    })
  }),
]
