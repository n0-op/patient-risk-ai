import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BuildPatientForm } from './BuildPatientForm'

describe('BuildPatientForm', () => {
  it('blocks submit when name and age are missing', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<BuildPatientForm onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: /analyze patient/i }))
    expect(screen.getByText('Name and age are required.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits payload when form is valid', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<BuildPatientForm onSubmit={onSubmit} />)
    await user.type(screen.getByPlaceholderText('Patient name'), 'Jane Doe')
    await user.type(screen.getByPlaceholderText('Age'), '60')
    await user.click(screen.getByRole('button', { name: /analyze patient/i }))
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Jane Doe',
      age: 60,
    })
  })
})
