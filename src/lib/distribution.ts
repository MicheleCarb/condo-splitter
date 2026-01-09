import {
  AppConfig,
  BillInput,
  BillType,
  CombinedResult,
  DistributionRule,
  MillesimalTable,
  ResultColumn,
  ResultRow,
  SavedBill,
  SplitResult,
} from '../types'

type RuleResolution = {
  billType: BillType
  rule: DistributionRule
  subtypeName?: string
}

function findRule(config: AppConfig, billTypeId: string, subtypeId?: string): RuleResolution {
  const billType = config.billTypes.find((bt) => bt.id === billTypeId)
  if (!billType) {
    throw new Error('Bill type non trovato')
  }

  if (billType.requiresSubtype) {
    const subtype = billType.subtypes?.find((s) => s.id === subtypeId) ?? billType.subtypes?.[0]
    if (!subtype) {
      throw new Error('Sottotipo non configurato')
    }
    return { billType, rule: subtype.rule, subtypeName: subtype.name }
  }

  if (!billType.rule) {
    throw new Error('Regola di distribuzione mancante')
  }

  return { billType, rule: billType.rule }
}

function ensureRow(rows: Map<string, ResultRow>, condoId: string, condoName: string): ResultRow {
  if (!rows.has(condoId)) {
    rows.set(condoId, { condoId, condoName, allocations: {}, total: 0 })
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return rows.get(condoId)!
}

function tableSum(table: MillesimalTable): number {
  return table.entries.reduce((acc, entry) => acc + (entry.value || 0), 0)
}

/**
 * Round to 2 decimals using standard rounding (round half up)
 */
function roundTo2Decimals(value: number): number {
  return Math.round(value * 100) / 100
}

function addFromTable(
  rows: Map<string, ResultRow>,
  table: MillesimalTable,
  condomini: AppConfig['condomini'],
  columnId: string,
  amount: number,
) {
  const totalValues = tableSum(table)
  if (!totalValues) return

  // Calculate unrounded shares first
  const unroundedShares = table.entries.map((entry) => {
    const condo = condomini.find((c) => c.id === entry.condoId)
    if (!condo) return null
    return {
      condoId: condo.id,
      condoName: condo.name,
      share: (entry.value / totalValues) * amount,
    }
  }).filter((s): s is NonNullable<typeof s> => s !== null)

  // Round all shares
  const roundedShares = unroundedShares.map((s) => ({
    ...s,
    rounded: roundTo2Decimals(s.share),
  }))

  // Calculate total of rounded shares
  const roundedTotal = roundedShares.reduce((sum, s) => sum + s.rounded, 0)
  const difference = amount - roundedTotal

  // If rounded total is less than target, distribute the difference to largest shares
  if (difference > 0.001) {
    // Sort by share size (descending) and add difference to largest
    const sorted = [...roundedShares].sort((a, b) => b.share - a.share)
    sorted[0].rounded = roundTo2Decimals(sorted[0].rounded + difference)
  }

  // Apply rounded shares
  roundedShares.forEach(({ condoId, condoName, rounded }) => {
    const row = ensureRow(rows, condoId, condoName)
    row.allocations[columnId] = roundTo2Decimals((row.allocations[columnId] || 0) + rounded)
    row.total = roundTo2Decimals(row.total + rounded)
  })
}

export function describeRule(rule: DistributionRule): string {
  if (rule.description) return rule.description
  if (rule.kind === 'single_table') return `Tabella ${rule.tableId}`
  if (rule.kind === 'weighted_tables') {
    const parts = rule.tables.map((t) => `${Math.round(t.weight * 100)}% ${t.tableId}`)
    return parts.join(' + ')
  }
  if (rule.kind === 'custom_percent') return 'Percentuale personalizzata'
  return 'Regola'
}

export function calculateSplit(config: AppConfig, input: BillInput): SplitResult {
  const { billType, rule, subtypeName } = findRule(config, input.billTypeId, input.subtypeId)
  const rows = new Map<string, ResultRow>()
  const columns: ResultColumn[] = []

  if (rule.kind === 'single_table') {
    const table = config.tables.find((t) => t.id === rule.tableId)
    if (!table) throw new Error(`Tabella ${rule.tableId} non trovata`)
    columns.push({ id: table.id, label: table.name })
    addFromTable(rows, table, config.condomini, table.id, input.amount)
  } else if (rule.kind === 'weighted_tables') {
    const totalWeight = rule.tables.reduce((acc, t) => acc + t.weight, 0)
    rule.tables.forEach((t) => {
      const table = config.tables.find((tab) => tab.id === t.tableId)
      if (!table || !totalWeight) return
      const weightShare = t.weight / totalWeight
      const columnId = table.id
      const allocatedAmount = roundTo2Decimals(input.amount * weightShare)
      columns.push({
        id: columnId,
        label: `${table.name} (${Math.round(weightShare * 100)}%)`,
      })
      addFromTable(rows, table, config.condomini, columnId, allocatedAmount)
    })
  } else if (rule.kind === 'custom_percent') {
    columns.push({ id: 'percent', label: 'Percentuale' })
    const totalWeight = rule.percents.reduce((acc, p) => acc + p.weight, 0)
    if (totalWeight > 0) {
      // Calculate unrounded shares first
      const unroundedShares = rule.percents.map((p) => {
        const condo = config.condomini.find((c) => c.id === p.condoId)
        if (!condo) return null
        return {
          condoId: condo.id,
          condoName: condo.name,
          share: (p.weight / totalWeight) * input.amount,
        }
      }).filter((s): s is NonNullable<typeof s> => s !== null)

      // Round all shares
      const roundedShares = unroundedShares.map((s) => ({
        ...s,
        rounded: roundTo2Decimals(s.share),
      }))

      // Calculate total of rounded shares
      const roundedTotal = roundedShares.reduce((sum, s) => sum + s.rounded, 0)
      const difference = input.amount - roundedTotal

      // If rounded total is less than target, distribute the difference to largest shares
      if (difference > 0.001) {
        const sorted = [...roundedShares].sort((a, b) => b.share - a.share)
        sorted[0].rounded = roundTo2Decimals(sorted[0].rounded + difference)
      }

      // Apply rounded shares
      roundedShares.forEach(({ condoId, condoName, rounded }) => {
        const row = ensureRow(rows, condoId, condoName)
        row.allocations['percent'] = roundTo2Decimals((row.allocations['percent'] || 0) + rounded)
        row.total = roundTo2Decimals(row.total + rounded)
      })
    }
  }

  const rowsArray = Array.from(rows.values()).sort((a, b) => a.condoName.localeCompare(b.condoName))

  return {
    columns,
    rows: rowsArray,
    total: input.amount,
    ruleLabel: describeRule(rule),
    billLabel: subtypeName ? `${billType.name} • ${subtypeName}` : billType.name,
    amount: input.amount,
  }
}

/**
 * Combine multiple bills into a single result table
 */
export function combineBills(config: AppConfig, bills: SavedBill[]): CombinedResult {
  if (bills.length === 0) {
    return {
      bills: [],
      columns: [],
      rows: [],
      total: 0,
    }
  }

  const rows = new Map<string, ResultRow>()
  const columns: ResultColumn[] = []
  let totalAmount = 0

  // Create columns for each bill type
  bills.forEach((bill) => {
    const columnId = `bill_${bill.id}`
    columns.push({ id: columnId, label: bill.billLabel })
    totalAmount = roundTo2Decimals(totalAmount + bill.amount)

    // Calculate split for this bill
    const split = calculateSplit(config, {
      billTypeId: bill.billTypeId,
      subtypeId: bill.subtypeId,
      amount: bill.amount,
    })

    // Store detailed columns for this bill (for detail view)
    split.columns.forEach((detailCol) => {
      const detailColumnId = `${columnId}_detail_${detailCol.id}`
      if (!columns.find((c) => c.id === detailColumnId)) {
        columns.push({ id: detailColumnId, label: detailCol.label })
      }
    })

    // Add to combined rows
    split.rows.forEach((splitRow) => {
      const row = ensureRow(rows, splitRow.condoId, splitRow.condoName)
      // Store bill total
      row.allocations[columnId] = roundTo2Decimals(splitRow.total)
      // Store detailed breakdowns
      split.columns.forEach((detailCol) => {
        const detailColumnId = `${columnId}_detail_${detailCol.id}`
        const detailValue = splitRow.allocations[detailCol.id] ?? 0
        row.allocations[detailColumnId] = roundTo2Decimals(detailValue)
      })
      row.total = roundTo2Decimals(row.total + splitRow.total)
    })
  })

  // Add total column only if multiple bills
  if (bills.length > 1) {
    columns.push({ id: 'total', label: 'Totale' })
  }

  const rowsArray = Array.from(rows.values()).sort((a, b) => a.condoName.localeCompare(b.condoName))

  return {
    bills,
    columns,
    rows: rowsArray,
    total: totalAmount,
  }
}
