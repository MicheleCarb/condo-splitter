import { calculateSplit } from './distribution'
import { sampleConfig } from '../config/sampleConfig'

describe('distribution logic', () => {
  it('splits LUCE with weighted tables 20/20/60', () => {
    const result = calculateSplit(sampleConfig, { billTypeId: 'luce', amount: 100 })
    const totals = Object.fromEntries(result.rows.map((r) => [r.condoId, r.total]))
    expect(totals['c1']).toBeCloseTo(16.8, 2)
    expect(totals['c2']).toBeCloseTo(25.6, 2)
    expect(totals['c3']).toBeCloseTo(20.6, 2)
    expect(totals['c4']).toBeCloseTo(37.0, 2)
  })

  it('splits PULIZIE with 25% A3 and 75% B1', () => {
    const result = calculateSplit(sampleConfig, { billTypeId: 'pulizie', amount: 200 })
    const totals = Object.fromEntries(result.rows.map((r) => [r.condoId, r.total]))
    expect(totals['c1']).toBeCloseTo(33.0, 2)
    expect(totals['c2']).toBeCloseTo(51.0, 2)
    expect(totals['c3']).toBeCloseTo(40.5, 2)
    expect(totals['c4']).toBeCloseTo(75.5, 2)
  })
})
