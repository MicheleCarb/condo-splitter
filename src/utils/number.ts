const currencyFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
})

const numberFormatter = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function parseAmount(raw: string): number | null {
  if (!raw) return null
  const normalized = raw.replace(/\s/g, '').replace(',', '.')
  const parsed = parseFloat(normalized)
  if (!Number.isFinite(parsed)) return null
  return parsed
}

/**
 * Round to 2 decimals using standard rounding (round half up)
 */
function roundTo2Decimals(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatCurrency(value: number): string {
  return currencyFormatter.format(roundTo2Decimals(value))
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}
