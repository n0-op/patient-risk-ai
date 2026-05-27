import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PatientList } from './PatientList'
import { mockPatients } from '../test/handlers'

describe('PatientList', () => {
  it('renders patient names from mock data', () => {
    render(
      <PatientList
        patients={mockPatients}
        selectedId={null}
        loadError={null}
        loading={false}
        onSelect={vi.fn()}
      />,
    )
    expect(screen.getByText('Margaret Chen')).toBeInTheDocument()
  })

  it('calls onSelect when a patient is clicked', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(
      <PatientList
        patients={mockPatients}
        selectedId={null}
        loadError={null}
        loading={false}
        onSelect={onSelect}
      />,
    )
    await user.click(screen.getByText('Margaret Chen'))
    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith(mockPatients[0])
  })
})
