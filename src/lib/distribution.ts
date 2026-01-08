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

  table.entries.forEach((entry) => {
    const condo = condomini.find((c) => c.id === entry.condoId)
    if (!condo) return
    const share = roundTo2Decimals((entry.value / totalValues) * amount)
    const row = ensureRow(rows, condo.id, condo.name)
    row.allocations[columnId] = roundTo2Decimals((row.allocations[columnId] || 0) + share)
    row.total = roundTo2Decimals(row.total + share)
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
      columns.push({
        id: columnId,
        label: `${table.name} (${Math.round(weightShare * 100)}%)`,
      })
      addFromTable(rows, table, config.condomini, columnId, roundTo2Decimals(input.amount * weightShare))
    })
  } else if (rule.kind === 'custom_percent') {
    columns.push({ id: 'percent', label: 'Percentuale' })
    const totalWeight = rule.percents.reduce((acc, p) => acc + p.weight, 0)
    if (totalWeight > 0) {
      rule.percents.forEach((p) => {
        const condo = config.condomini.find((c) => c.id === p.condoId)
        if (!condo) return
        const share = roundTo2Decimals((p.weight / totalWeight) * input.amount)
        const row = ensureRow(rows, condo.id, condo.name)
        row.allocations['percent'] = roundTo2Decimals((row.allocations['percent'] || 0) + share)
        row.total = roundTo2Decimals(row.total + share)
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
