import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import App from './App'
import { handlers } from './test/handlers'

const server = setupServer(...handlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('App', () => {
  it('renders without crashing', async () => {
    render(<App />)
    expect(screen.getByText('Patient Risk AI')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Margaret Chen')).toBeInTheDocument()
    })
  })

  it('shows summary after selecting a patient', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText('Margaret Chen'))
    await user.click(screen.getByText('Margaret Chen'))
    await waitFor(() => {
      expect(screen.getByText(/Follow-up priority: high/i)).toBeInTheDocument()
    })
  })

  it('shows error when analyze fails', async () => {
    server.use(
      http.post('http://127.0.0.1:8000/patients/:id/analyze', () =>
        HttpResponse.json({ detail: 'fail' }, { status: 500 }),
      ),
    )
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText('Margaret Chen'))
    await user.click(screen.getByText('Margaret Chen'))
    await waitFor(() => {
      expect(screen.getByText(/Analysis failed/i)).toBeInTheDocument()
    })
  })
})
