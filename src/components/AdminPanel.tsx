import { useEffect, useMemo, useState, useRef } from 'react'
import { AppConfig, BillSubtype, BillType, DistributionRule, MillesimalTable, SavedBill } from '../types'
import { calculateSplit, combineBills } from '../lib/distribution'
import { parseAmount } from '../utils/number'
import { ResultTable } from './ResultTable'

type Props = {
  config: AppConfig
  isExampleConfig: boolean
  onSave: (config: AppConfig) => void
  onImport: (config: AppConfig) => void
  onClose: () => void
}

const makeId = () => Math.random().toString(36).slice(2, 8)

function cleanBillTypesForCondomini(billTypes: BillType[], removedIds: string[]): BillType[] {
  return billTypes.map((bt) => {
    const cleanRule = (rule?: DistributionRule): DistributionRule | undefined => {
      if (!rule) return rule
      if (rule.kind !== 'custom_percent') return rule
      return {
        ...rule,
        percents: rule.percents.filter((p) => !removedIds.includes(p.condoId)),
      }
    }

    if (bt.requiresSubtype && bt.subtypes) {
      return {
        ...bt,
        subtypes: bt.subtypes.map((s) => ({ ...s, rule: cleanRule(s.rule)! })),
      }
    }
    return { ...bt, rule: cleanRule(bt.rule) }
  })
}

function getRule(billType: BillType, subtypeId?: string): DistributionRule | undefined {
  if (billType.requiresSubtype) {
    return billType.subtypes?.find((s) => s.id === subtypeId)?.rule ?? billType.subtypes?.[0]?.rule
  }
  return billType.rule
}

export function AdminPanel({ config, isExampleConfig, onSave, onImport, onClose }: Props) {
  const [draft, setDraft] = useState<AppConfig>(config)
  const [importError, setImportError] = useState<string | null>(null)
  const [previewAmount, setPreviewAmount] = useState('100')
  const [previewBillTypeId, setPreviewBillTypeId] = useState<string>(config.billTypes[0]?.id ?? '')
  const [previewSubtypeId, setPreviewSubtypeId] = useState<string | undefined>()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showAddBillType, setShowAddBillType] = useState(false)
  const [newBillTypeName, setNewBillTypeName] = useState('')
  const [newBillTypeRequiresSubtype, setNewBillTypeRequiresSubtype] = useState(false)
  const [confirmDeleteCondo, setConfirmDeleteCondo] = useState<string | null>(null)
  const [confirmDeleteBillType, setConfirmDeleteBillType] = useState<string | null>(null)
  const [confirmDeleteTable, setConfirmDeleteTable] = useState<string | null>(null)
  const [deletedTable, setDeletedTable] = useState<{ table: MillesimalTable; undo: () => void } | null>(null)
  const [openKebabMenu, setOpenKebabMenu] = useState<{ billTypeId: string; subtypeId?: string; index: number } | null>(null)
  const [showRemoveWeightedTableConfirm, setShowRemoveWeightedTableConfirm] = useState<{ billTypeId: string; subtypeId?: string; index: number } | null>(null)
  const [editingSubtypeName, setEditingSubtypeName] = useState<{ billTypeId: string; subtypeId: string } | null>(null)
  const [editingSubtypeNameValue, setEditingSubtypeNameValue] = useState('')
  const [confirmDeleteSubtype, setConfirmDeleteSubtype] = useState<{ billTypeId: string; subtypeId: string } | null>(null)
  const [editingTableId, setEditingTableId] = useState<string | null>(null)
  const [editingTableIdValue, setEditingTableIdValue] = useState('')
  const [tableIdError, setTableIdError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDraft(config)
  }, [config])

  // Close kebab menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // Check if click is inside any kebab menu or its dropdown
      const clickedKebabMenu = target.closest('[data-kebab-menu]')
      if (!clickedKebabMenu && openKebabMenu) {
        setOpenKebabMenu(null)
      }
    }
    if (openKebabMenu) {
      // Use a small delay to avoid closing immediately when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
      return () => {
        clearTimeout(timeoutId)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [openKebabMenu])

  useEffect(() => {
    const billType = draft.billTypes.find((b) => b.id === previewBillTypeId)
    if (billType?.requiresSubtype && billType.subtypes?.length) {
      setPreviewSubtypeId(billType.subtypes[0].id)
    } else {
      setPreviewSubtypeId(undefined)
    }
  }, [draft.billTypes, previewBillTypeId])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  const previewResult = useMemo(() => {
    const amount = parseAmount(previewAmount)
    if (amount === null) return null
    try {
      const split = calculateSplit(draft, {
        billTypeId: previewBillTypeId,
        subtypeId: previewSubtypeId,
        amount,
      })
      // Convert SplitResult to CombinedResult format for preview
      const bill: SavedBill = {
        id: 'preview',
        billTypeId: previewBillTypeId,
        billLabel: split.billLabel,
        subtypeId: previewSubtypeId,
        amount,
        timestamp: Date.now(),
      }
      return combineBills(draft, [bill])
    } catch (err) {
      console.warn('Preview calc failed', err)
      return null
    }
  }, [draft, previewAmount, previewBillTypeId, previewSubtypeId])

  const handleCondoChange = (condoId: string, name: string) => {
    setDraft((prev) => ({
      ...prev,
      condomini: prev.condomini.map((c) => (c.id === condoId ? { ...c, name } : c)),
    }))
  }

  const handleAddCondo = () => {
    const newId = `c-${makeId()}`
    const newName = `Condomino ${draft.condomini.length + 1}`
    setDraft((prev) => {
      const updatedTables = prev.tables.map((t) => ({
        ...t,
        entries: [...t.entries, { condoId: newId, value: 0 }],
      }))
      const cleanedBillTypes = cleanBillTypesForCondomini(prev.billTypes, [])
      return {
        ...prev,
        condomini: [...prev.condomini, { id: newId, name: newName }],
        tables: updatedTables,
        billTypes: cleanedBillTypes,
      }
    })
  }

  const handleRemoveCondo = (condoId: string) => {
    setDraft((prev) => {
      const updatedTables = prev.tables.map((t) => ({
        ...t,
        entries: t.entries.filter((e) => e.condoId !== condoId),
      }))
      const billTypes = cleanBillTypesForCondomini(prev.billTypes, [condoId])
      return {
        ...prev,
        condomini: prev.condomini.filter((c) => c.id !== condoId),
        tables: updatedTables,
        billTypes,
      }
    })
  }

  const handleTableIdSave = (oldId: string, newId: string) => {
    // Validate: max 2 characters, alphanumeric only, not empty
    const sanitized = newId.toUpperCase().trim()
    if (sanitized.length === 0) {
      setTableIdError('Il codice non può essere vuoto')
      return false
    }
    if (sanitized.length > 2) {
      setTableIdError('Max 2 caratteri alfanumerici')
      return false
    }
    if (!/^[A-Z0-9]+$/.test(sanitized)) {
      setTableIdError('Solo caratteri alfanumerici')
      return false
    }

    // Check if new ID already exists (and is not the same as old)
    const exists = draft.tables.some((t) => t.id === sanitized && t.id !== oldId)
    if (exists) {
      setTableIdError('Questo codice esiste già')
      return false
    }

    setTableIdError(null)
    setDraft((prev) => {
      // Update table ID
      const updatedTables = prev.tables.map((t) =>
        t.id === oldId
          ? {
              ...t,
              id: sanitized,
              name: `Tabella ${sanitized}`,
            }
          : t,
      )

      // Update all references in billTypes
      const updatedBillTypes = prev.billTypes.map((bt) => {
        const updateRuleInBillType = (rule?: DistributionRule): DistributionRule | undefined => {
          if (!rule) return rule

          if (rule.kind === 'single_table') {
            return rule.tableId === oldId ? { ...rule, tableId: sanitized } : rule
          }

          if (rule.kind === 'weighted_tables') {
            return {
              ...rule,
              tables: rule.tables.map((wt) =>
                wt.tableId === oldId ? { ...wt, tableId: sanitized } : wt,
              ),
            }
          }

          return rule
        }

        // Update main rule
        const updatedRule = updateRuleInBillType(bt.rule)

        // Update subtype rules
        const updatedSubtypes = bt.subtypes?.map((sub) => ({
          ...sub,
          rule: updateRuleInBillType(sub.rule)!,
        }))

        return {
          ...bt,
          rule: updatedRule,
          subtypes: updatedSubtypes,
        }
      })

      return {
        ...prev,
        tables: updatedTables,
        billTypes: updatedBillTypes,
      }
    })
    setEditingTableId(null)
    return true
  }

  const handleTableValue = (tableId: string, condoId: string, value: number) => {
    setDraft((prev) => ({
      ...prev,
      tables: prev.tables.map((t) =>
        t.id === tableId
          ? {
              ...t,
              entries: t.entries.map((e) => (e.condoId === condoId ? { ...e, value } : e)),
            }
          : t,
      ),
    }))
  }

  const handleAddTable = () => {
    const newId = `T${draft.tables.length + 1}`
    const newTable: MillesimalTable = {
      id: newId,
      name: `Tabella ${newId}`,
      entries: draft.condomini.map((c) => ({ condoId: c.id, value: 0 })),
    }
    setDraft((prev) => ({ ...prev, tables: [...prev.tables, newTable] }))
  }

  const handleAddBillType = () => {
    if (!newBillTypeName.trim()) {
      setImportError('Inserisci un nome per la tipologia')
      return
    }

    // Check if name already exists
    const nameExists = draft.billTypes.some((bt) => bt.name.toLowerCase() === newBillTypeName.trim().toLowerCase())
    if (nameExists) {
      setImportError('Questa tipologia esiste già')
      return
    }

    const newId = `bt-${makeId()}`
    const firstTableId = draft.tables[0]?.id ?? ''
    const defaultRule: DistributionRule = {
      kind: 'single_table',
      tableId: firstTableId,
      description: '',
    }

    const newBillType: BillType = {
      id: newId,
      name: newBillTypeName.trim(),
      requiresSubtype: newBillTypeRequiresSubtype,
      ...(newBillTypeRequiresSubtype
        ? {
            subtypes: [
              {
                id: `st-${makeId()}`,
                name: 'Default',
                rule: defaultRule,
              },
            ],
          }
        : {
            rule: defaultRule,
          }),
    }

    setDraft((prev) => ({
      ...prev,
      billTypes: [...prev.billTypes, newBillType],
    }))

    // Reset form
    setNewBillTypeName('')
    setNewBillTypeRequiresSubtype(false)
    setShowAddBillType(false)
    setImportError(null)
  }

  const handleRemoveBillType = (billTypeId: string) => {
    setDraft((prev) => ({
      ...prev,
      billTypes: prev.billTypes.filter((bt) => bt.id !== billTypeId),
    }))
    setConfirmDeleteBillType(null)
  }

  const isTableUsed = (tableId: string): { used: boolean; count: number } => {
    let count = 0
    draft.billTypes.forEach((bt) => {
      // Check main rule
      if (bt.rule) {
        if (bt.rule.kind === 'single_table' && bt.rule.tableId === tableId) count++
        if (bt.rule.kind === 'weighted_tables' && bt.rule.tables.some((t) => t.tableId === tableId)) count++
      }
      // Check subtype rules
      if (bt.subtypes) {
        bt.subtypes.forEach((sub) => {
          if (sub.rule.kind === 'single_table' && sub.rule.tableId === tableId) count++
          if (sub.rule.kind === 'weighted_tables' && sub.rule.tables.some((t) => t.tableId === tableId)) count++
        })
      }
    })
    return { used: count > 0, count }
  }

  const handleRemoveTable = (tableId: string) => {
    const tableToDelete = draft.tables.find((t) => t.id === tableId)
    if (!tableToDelete) return

    setDraft((prev) => ({
      ...prev,
      tables: prev.tables.filter((t) => t.id !== tableId),
    }))
    setConfirmDeleteTable(null)

    // Show toast with undo
    setDeletedTable({
      table: tableToDelete,
      undo: () => {
        setDraft((prev) => ({
          ...prev,
          tables: [...prev.tables, tableToDelete].sort((a, b) => a.id.localeCompare(b.id)),
        }))
        setDeletedTable(null)
      },
    })

    // Auto-hide toast after 5 seconds
    setTimeout(() => {
      setDeletedTable(null)
    }, 5000)
  }

  const scrollToBillTypesUsingTable = (tableId: string) => {
    // Find bill types that use this table
    const usingBillTypes = draft.billTypes.filter((bt) => {
      if (bt.rule) {
        if (bt.rule.kind === 'single_table' && bt.rule.tableId === tableId) return true
        if (bt.rule.kind === 'weighted_tables' && bt.rule.tables.some((t) => t.tableId === tableId)) return true
      }
      if (bt.subtypes) {
        return bt.subtypes.some((sub) => {
          if (sub.rule.kind === 'single_table' && sub.rule.tableId === tableId) return true
          if (sub.rule.kind === 'weighted_tables' && sub.rule.tables.some((t) => t.tableId === tableId)) return true
          return false
        })
      }
      return false
    })

    if (usingBillTypes.length > 0) {
      // Scroll to first bill type that uses this table
      const firstBillTypeId = usingBillTypes[0].id
      const element = document.getElementById(`bill-type-${firstBillTypeId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Highlight with a temporary class
        element.classList.add('ring-2', 'ring-brand', 'ring-offset-2')
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-brand', 'ring-offset-2')
        }, 2000)
      }
    }
  }

  const updateRule = (
    billTypeId: string,
    updater: (rule: DistributionRule | undefined) => DistributionRule,
    subtypeId?: string,
  ) => {
    setDraft((prev) => ({
      ...prev,
      billTypes: prev.billTypes.map((bt) => {
        if (bt.id !== billTypeId) return bt
        if (bt.requiresSubtype && bt.subtypes) {
          return {
            ...bt,
            subtypes: bt.subtypes.map((sub) =>
              subtypeId && sub.id !== subtypeId ? sub : { ...sub, rule: updater(sub.rule) },
            ),
          }
        }
        return { ...bt, rule: updater(bt.rule) }
      }),
    }))
  }

  const handleRuleKindChange = (billTypeId: string, kind: DistributionRule['kind'], subtypeId?: string) => {
    updateRule(
      billTypeId,
      () => {
        if (kind === 'single_table') {
          return { kind, tableId: draft.tables[0]?.id ?? '', description: '' }
        }
        if (kind === 'weighted_tables') {
          const firstId = draft.tables[0]?.id ?? ''
          return { kind, tables: firstId ? [{ tableId: firstId, weight: 1 }] : [], description: '' }
        }
        return {
          kind: 'custom_percent',
          percents: draft.condomini.map((c) => ({ condoId: c.id, weight: 1 })),
          description: '',
        }
      },
      subtypeId,
    )
  }

  const handleWeightedRow = (
    billTypeId: string,
    subtypeId: string | undefined,
    index: number,
    field: 'tableId' | 'weight',
    value: string,
  ) => {
    updateRule(
      billTypeId,
      (rule) => {
        if (!rule || rule.kind !== 'weighted_tables') return { kind: 'weighted_tables', tables: [] }
        const tables = [...rule.tables]
        if (field === 'tableId') {
          tables[index] = { ...tables[index], tableId: value }
        } else {
          // Convert percentage input (0-100) to decimal (0-1) for storage
          const numValue = Number(value)
          let weight = 0
          if (value !== '' && !isNaN(numValue) && numValue >= 0 && numValue <= 100) {
            // Convert percentage to decimal and round to 2 decimals
            weight = Math.round((numValue / 100) * 10000) / 10000 // Round to 4 decimals for precision, then to 2
          }
          tables[index] = { ...tables[index], weight }
        }
        return { ...rule, tables }
      },
      subtypeId,
    )
  }

  const addWeightedRow = (billTypeId: string, subtypeId?: string) => {
    updateRule(
      billTypeId,
      (rule) => {
        if (!rule || rule.kind !== 'weighted_tables') {
          return { kind: 'weighted_tables', tables: [] }
        }
        return {
          ...rule,
          tables: [...rule.tables, { tableId: draft.tables[0]?.id ?? '', weight: 0 }],
        }
      },
      subtypeId,
    )
  }

  const removeWeightedRow = (billTypeId: string, subtypeId: string | undefined, index: number) => {
    updateRule(
      billTypeId,
      (rule) => {
        if (!rule || rule.kind !== 'weighted_tables') {
          return { kind: 'weighted_tables', tables: [] }
        }
        const newTables = rule.tables.filter((_, idx) => idx !== index)
        // Ensure at least one table remains
        if (newTables.length === 0 && draft.tables.length > 0) {
          return {
            ...rule,
            tables: [{ tableId: draft.tables[0]?.id ?? '', weight: 1 }],
          }
        }
        return {
          ...rule,
          tables: newTables,
        }
      },
      subtypeId,
    )
    setShowRemoveWeightedTableConfirm(null)
    setOpenKebabMenu(null)
  }

  // Calculate sum of percentages for a weighted_tables rule
  const getWeightedTablesSum = (rule: DistributionRule | undefined): number => {
    if (!rule || rule.kind !== 'weighted_tables') return 0
    return rule.tables.reduce((sum, t) => sum + t.weight * 100, 0)
  }

  // Check if a weighted_tables rule has valid sum (100% ± 0.01)
  const isWeightedTablesValid = (rule: DistributionRule | undefined): boolean => {
    if (!rule || rule.kind !== 'weighted_tables') return true
    const sum = getWeightedTablesSum(rule)
    return Math.abs(sum - 100) <= 0.01
  }

  // Check if all weighted_tables rules in the config are valid
  const areAllWeightedTablesValid = (): boolean => {
    for (const billType of draft.billTypes) {
      if (!isWeightedTablesValid(billType.rule)) return false
      if (billType.subtypes) {
        for (const subtype of billType.subtypes) {
          if (!isWeightedTablesValid(subtype.rule)) return false
        }
      }
    }
    return true
  }

  // Normalize a weighted_tables rule to sum exactly 100%
  const normalizeWeightedTables = (billTypeId: string, subtypeId?: string) => {
    updateRule(
      billTypeId,
      (rule) => {
        if (!rule || rule.kind !== 'weighted_tables') return { kind: 'weighted_tables', tables: [] }
        const currentSum = rule.tables.reduce((sum, t) => sum + t.weight, 0)
        if (currentSum === 0) return rule // Can't normalize if sum is 0
        const normalizedTables = rule.tables.map((t) => ({
          ...t,
          weight: t.weight / currentSum, // Scale proportionally to sum to 1.0 (100%)
        }))
        return { ...rule, tables: normalizedTables }
      },
      subtypeId,
    )
  }

  const handleCustomPercent = (
    billTypeId: string,
    subtypeId: string | undefined,
    condoId: string,
    weight: number,
  ) => {
    updateRule(
      billTypeId,
      (rule) => {
        if (!rule || rule.kind !== 'custom_percent') {
          return { kind: 'custom_percent', percents: [{ condoId, weight }] }
        }
        const existingIndex = rule.percents.findIndex((p) => p.condoId === condoId)
        if (existingIndex >= 0) {
          return {
            ...rule,
            percents: rule.percents.map((p) => (p.condoId === condoId ? { ...p, weight } : p)),
          }
        } else {
          return {
            ...rule,
            percents: [...rule.percents, { condoId, weight }],
          }
        }
      },
      subtypeId,
    )
  }

  const handleSubtypeNameChange = (billTypeId: string, subtypeId: string, newName: string) => {
    if (!newName.trim()) {
      setEditingSubtypeName(null)
      return
    }
    
    // Check for duplicate names within the same bill type
    const billType = draft.billTypes.find((bt) => bt.id === billTypeId)
    if (billType?.subtypes) {
      const duplicate = billType.subtypes.find(
        (s) => s.id !== subtypeId && s.name.toLowerCase() === newName.trim().toLowerCase()
      )
      if (duplicate) {
        alert('Un sottotipo con questo nome esiste già in questa tipologia.')
        return
      }
    }

    setDraft((prev) => ({
      ...prev,
      billTypes: prev.billTypes.map((bt) =>
        bt.id === billTypeId
          ? {
              ...bt,
              subtypes: bt.subtypes?.map((s) => (s.id === subtypeId ? { ...s, name: newName.trim() } : s)),
            }
          : bt,
      ),
    }))
    setEditingSubtypeName(null)
  }

  const handleAddSubtype = (billTypeId: string) => {
    const billType = draft.billTypes.find((bt) => bt.id === billTypeId)
    if (!billType) return

    const firstTableId = draft.tables[0]?.id ?? ''
    const defaultRule: DistributionRule = {
      kind: 'single_table',
      tableId: firstTableId,
      description: '',
    }

    const newSubtype: BillSubtype = {
      id: `st-${makeId()}`,
      name: 'Nuovo sottotipo',
      rule: defaultRule,
    }

    setDraft((prev) => ({
      ...prev,
      billTypes: prev.billTypes.map((bt) =>
        bt.id === billTypeId
          ? {
              ...bt,
              subtypes: [...(bt.subtypes ?? []), newSubtype],
            }
          : bt,
      ),
    }))

    // Start editing the new subtype name immediately
    setEditingSubtypeName({ billTypeId, subtypeId: newSubtype.id })
    setEditingSubtypeNameValue(newSubtype.name)
  }

  const handleRemoveSubtype = (billTypeId: string, subtypeId: string) => {
    const billType = draft.billTypes.find((bt) => bt.id === billTypeId)
    if (!billType?.subtypes || billType.subtypes.length <= 1) {
      alert('Deve rimanere almeno un sottotipo.')
      return
    }

    setDraft((prev) => ({
      ...prev,
      billTypes: prev.billTypes.map((bt) =>
        bt.id === billTypeId
          ? {
              ...bt,
              subtypes: bt.subtypes?.filter((s) => s.id !== subtypeId),
            }
          : bt,
      ),
    }))
    setConfirmDeleteSubtype(null)
  }

  const handleDescription = (billTypeId: string, subtypeId: string | undefined, description: string) => {
    updateRule(
      billTypeId,
      (rule) => {
          if (!rule) {
            return {
              kind: 'single_table',
              tableId: draft.tables[0]?.id ?? '',
              description,
            }
          }
          return { ...rule, description }
      },
      subtypeId,
    )
  }

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as AppConfig
      onImport(parsed)
      setImportError(null)
    } catch (err) {
      setImportError('Configurazione non valida')
    }
  }

  const handleSave = () => {
    // Check if all weighted_tables rules have valid sums
    if (!areAllWeightedTablesValid()) {
      alert('Impossibile salvare: alcune regole "% su più tabelle" non sommano a 100%. Correggi le percentuali prima di salvare.')
      return
    }
    const tablesChanged = JSON.stringify(config.tables) !== JSON.stringify(draft.tables)
    if (tablesChanged) {
      if (!window.confirm('Confermi le modifiche alle tabelle millesimali?')) return
      if (!window.confirm('Seconda conferma: applicare le modifiche?')) return
    }
    onSave(draft)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-black/40 px-3 py-6">
      <div className="mx-auto max-w-5xl space-y-4 rounded-3xl bg-white p-4 shadow-xl min-w-0 overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase text-slate-500">Area Admin</p>
            <h2 className="text-xl font-semibold text-slate-900">Configura condomini e regole</h2>
            <p className="text-sm text-slate-600">
              Le modifiche sono salvate in locale. Esporta una configurazione per backup.
            </p>
          </div>
          <div className="relative flex-shrink-0 md:hidden" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 active:bg-slate-100"
              aria-label="Menu opzioni"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-12 z-50 min-w-[200px] rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 animate-[fadeIn_0.15s_ease-out,slideDown_0.15s_ease-out] origin-top-right">
                <div className="py-1">
                  <label className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50 active:bg-slate-100">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    Importa configurazione
                    <input
                      type="file"
                      accept="application/json"
                      className="hidden"
                      onChange={(e) => {
                        onFileSelected(e)
                        setMenuOpen(false)
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'condo-config.json'
                      a.click()
                      URL.revokeObjectURL(url)
                      setMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50 active:bg-slate-100"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Esporta configurazione
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onClose()
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50 active:bg-slate-100"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Chiudi
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="hidden flex-wrap items-center gap-2 md:flex">
            <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 whitespace-nowrap">
              Importa configurazione
              <input type="file" accept="application/json" className="hidden" onChange={onFileSelected} />
            </label>
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'condo-config.json'
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 whitespace-nowrap"
            >
              Esporta configurazione
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 whitespace-nowrap"
            >
              Chiudi
            </button>
          </div>
        </div>

        {isExampleConfig && (
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-emerald-50/30 p-4 shadow-sm">
            <div className="mb-3">
              <h3 className="text-base font-semibold text-slate-900">Configurazione di esempio</h3>
              <p className="mt-1 text-sm text-slate-700">
                Questi dati sono solo dimostrativi. Modificali e salva oppure importa una tua configurazione per iniziare.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand/90 transition">
                Importa configurazione
                <input type="file" accept="application/json" className="hidden" onChange={onFileSelected} />
              </label>
            </div>
          </div>
        )}

        {importError && <p className="text-sm text-red-600">{importError}</p>}

        {/* Personalization section */}
        <section className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <h3 className="text-base font-semibold text-slate-900 mb-2">Personalizzazione</h3>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Nome amministratore (opzionale)
            </label>
            <input
              type="text"
              value={draft.ownerName || ''}
              onChange={(e) => {
                const value = e.target.value
                setDraft((prev) => ({
                  ...prev,
                  ownerName: value || undefined,
                }))
              }}
              onBlur={(e) => {
                const trimmed = e.target.value.trim()
                if (draft.ownerName !== trimmed) {
                  setDraft((prev) => ({
                    ...prev,
                    ownerName: trimmed || undefined,
                  }))
                }
              }}
              placeholder="Es. Michele"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <p className="text-xs text-slate-500">
              Se impostato, apparirà un saluto personalizzato nell&apos;header.
            </p>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <h3 className="text-base font-semibold text-slate-900">Condomini</h3>
            <div className="mt-2 space-y-2">
              {draft.condomini.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <input
                    value={c.name}
                    onChange={(e) => handleCondoChange(c.id, e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm focus:border-brand focus:outline-none"
                  />
                  {confirmDeleteCondo === c.id ? (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveCondo(c.id)}
                        className="rounded-lg border border-red-300 bg-red-50 px-2 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        Conferma
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteCondo(null)}
                        className="rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-600 hover:bg-slate-100"
                      >
                        Annulla
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteCondo(c.id)}
                      className="rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-600 hover:bg-slate-100"
                    >
                      Elimina
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddCondo}
                className="w-full rounded-lg border border-dashed border-brand px-3 py-2 text-sm font-semibold text-brand hover:bg-brand/5"
              >
                + Aggiungi condominio
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <h3 className="text-base font-semibold text-slate-900">Tabelle millesimali</h3>
            <div className="space-y-3">
              {draft.tables.map((table) => {
                const tableUsage = isTableUsed(table.id)
                return (
                  <div key={table.id} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                    <div className="mb-2">
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Tabella</label>
                          {editingTableId === table.id ? (
                            <div className="relative">
                              <input
                                type="text"
                                value={editingTableIdValue}
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                                  if (val.length <= 2) {
                                    setEditingTableIdValue(val)
                                    setTableIdError(null)
                                  }
                                }}
                                onFocus={(e) => {
                                  e.target.select()
                                }}
                                onBlur={() => {
                                  handleTableIdSave(table.id, editingTableIdValue)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleTableIdSave(table.id, editingTableIdValue)
                                  } else if (e.key === 'Escape') {
                                    setEditingTableId(null)
                                    setEditingTableIdValue(table.id)
                                    setTableIdError(null)
                                  }
                                }}
                                autoFocus
                                maxLength={2}
                                className={`w-16 rounded-lg border px-2 py-1.5 text-sm font-semibold text-center uppercase focus:outline-none focus:ring-2 ${
                                  tableIdError
                                    ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                                    : 'border-brand focus:border-brand focus:ring-brand/20'
                                }`}
                                placeholder="ID"
                                aria-label="Modifica codice tabella"
                              />
                              {tableIdError && (
                                <div className="absolute left-0 top-full mt-1 z-10 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 shadow-sm whitespace-nowrap">
                                  {tableIdError}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTableId(table.id)
                                setEditingTableIdValue(table.id)
                                setTableIdError(null)
                              }}
                              className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-semibold text-center uppercase hover:border-brand hover:bg-slate-50 transition-colors flex items-center justify-center gap-1 group"
                              title="Clicca per modificare il codice"
                              aria-label="Modifica codice tabella"
                            >
                              <span>{table.id}</span>
                              <svg
                                className="h-3 w-3 text-slate-400 group-hover:text-brand transition-colors"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                        {confirmDeleteTable === table.id ? (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto">
                            <p className="text-xs text-slate-600 sm:mr-2">Vuoi eliminare la tabella {table.id}?</p>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleRemoveTable(table.id)}
                                className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 whitespace-nowrap flex items-center gap-1"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                                Elimina
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteTable(null)}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 whitespace-nowrap"
                              >
                                Annulla
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="relative group">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteTable(table.id)}
                              disabled={tableUsage.used}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0 flex items-center gap-1"
                              title={
                                tableUsage.used
                                  ? `Impossibile eliminare: questa tabella è usata in ${tableUsage.count} ${tableUsage.count === 1 ? 'regola' : 'regole'} di riparto. Rimuovila prima dalle regole per abilitare l'eliminazione.`
                                  : undefined
                              }
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className={`h-3.5 w-3.5 ${tableUsage.used ? 'text-slate-400' : 'text-slate-600'}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              Elimina tabella
                            </button>
                          </span>
                        )}
                      </div>
                      {tableUsage.used && confirmDeleteTable !== table.id && (
                        <button
                          type="button"
                          onClick={() => scrollToBillTypesUsingTable(table.id)}
                          className="mt-2 text-xs text-slate-500 hover:text-brand underline cursor-pointer"
                        >
                          Usata in {tableUsage.count} {tableUsage.count === 1 ? 'regola' : 'regole'} di riparto
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {draft.condomini.map((condo) => {
                        const entry = table.entries.find((e) => e.condoId === condo.id)
                        return (
                          <label key={condo.id} className="flex items-center justify-between gap-2 text-sm min-w-0">
                            <span className="text-slate-600 flex-shrink-0">{condo.name}</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={entry?.value ?? 0}
                              onChange={(e) => handleTableValue(table.id, condo.id, Number(e.target.value) || 0)}
                              className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right font-medium text-slate-900 focus:border-brand focus:outline-none flex-shrink-0"
                            />
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              <button
                type="button"
                onClick={handleAddTable}
                className="w-full rounded-lg border border-dashed border-brand px-3 py-2 text-sm font-semibold text-brand hover:bg-brand/5"
              >
                + Aggiungi tabella
              </button>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Regole per tipologia</h3>
            <p className="text-xs text-slate-600">Configura pesi/tabelle per ogni tipo e sottotipo.</p>
          </div>

          <div className="mt-3 space-y-3">
            {draft.billTypes.map((bill) => (
              <div key={bill.id} id={`bill-type-${bill.id}`} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 min-w-0 overflow-hidden transition-all">
                  <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase text-slate-500">Tipo</p>
                    <p className="text-base font-semibold text-slate-900">{bill.name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {bill.requiresSubtype && <span className="text-xs text-slate-600 whitespace-nowrap">Ha sottotipi</span>}
                    {confirmDeleteBillType === bill.id ? (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleRemoveBillType(bill.id)}
                          className="rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 whitespace-nowrap"
                          aria-label="Conferma eliminazione"
                        >
                          Conferma
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteBillType(null)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 whitespace-nowrap"
                          aria-label="Annulla eliminazione"
                        >
                          Annulla
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteBillType(bill.id)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 whitespace-nowrap"
                        aria-label="Elimina tipologia"
                      >
                        Elimina
                      </button>
                    )}
                  </div>
                </div>

                {(bill.requiresSubtype ? bill.subtypes ?? [] : [{ id: bill.id, name: bill.name, rule: bill.rule }]).map(
                  (sub) => {
                    const rule = getRule(
                      { ...bill, subtypes: bill.subtypes ?? [] },
                      bill.requiresSubtype ? (sub as BillSubtype).id : undefined,
                    )
                    const subtypeId = bill.requiresSubtype ? (sub as BillSubtype).id : undefined
                    const subtypeName = bill.requiresSubtype ? (sub as BillSubtype).name : 'Regola'
                    const isEditingName = editingSubtypeName?.billTypeId === bill.id && editingSubtypeName?.subtypeId === subtypeId
                    const isConfirmingDelete = confirmDeleteSubtype?.billTypeId === bill.id && confirmDeleteSubtype?.subtypeId === subtypeId

                    return (
                      <div key={subtypeId ?? bill.id} className="mt-2 rounded-lg border border-slate-100 p-3 min-w-0 overflow-hidden">
                        <div className="mb-2 flex items-center gap-2 min-w-0">
                          {isEditingName ? (
                            <input
                              type="text"
                              value={editingSubtypeNameValue}
                              onChange={(e) => setEditingSubtypeNameValue(e.target.value)}
                              onBlur={() => {
                                if (editingSubtypeName) {
                                  handleSubtypeNameChange(editingSubtypeName.billTypeId, editingSubtypeName.subtypeId, editingSubtypeNameValue)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  if (editingSubtypeName) {
                                    handleSubtypeNameChange(editingSubtypeName.billTypeId, editingSubtypeName.subtypeId, editingSubtypeNameValue)
                                  }
                                } else if (e.key === 'Escape') {
                                  setEditingSubtypeName(null)
                                }
                              }}
                              autoFocus
                              className="flex-1 min-w-[120px] rounded-lg border border-brand px-2 py-1 text-sm font-semibold text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                            />
                          ) : (
                            <>
                              {bill.requiresSubtype ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSubtypeName({ billTypeId: bill.id, subtypeId: subtypeId! })
                                    setEditingSubtypeNameValue(subtypeName)
                                  }}
                                  className="flex-1 min-w-0 flex items-center gap-1 group hover:text-brand transition-colors"
                                  title="Clicca per modificare il nome"
                                >
                                  <span className="text-sm font-semibold text-slate-800 truncate text-ellipsis overflow-hidden whitespace-nowrap" title={subtypeName}>
                                    {subtypeName}
                                  </span>
                                  <svg
                                    className="h-3.5 w-3.5 text-slate-400 group-hover:text-brand transition-colors flex-shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                </button>
                              ) : (
                                <p className="text-sm font-semibold text-slate-800 flex-1 min-w-0 truncate text-ellipsis overflow-hidden whitespace-nowrap" title={subtypeName}>
                                  {subtypeName}
                                </p>
                              )}
                            </>
                          )}
                          {isConfirmingDelete ? (
                            <div className="ml-auto flex gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleRemoveSubtype(bill.id, subtypeId!)}
                                className="rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 whitespace-nowrap"
                              >
                                Conferma
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteSubtype(null)}
                                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 whitespace-nowrap"
                              >
                                Annulla
                              </button>
                            </div>
                          ) : (
                            bill.requiresSubtype && (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteSubtype({ billTypeId: bill.id, subtypeId: subtypeId! })}
                                className="ml-auto flex-shrink-0 rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 flex items-center gap-1 whitespace-nowrap"
                                title="Elimina sottotipo"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                                Elimina
                              </button>
                            )
                          )}
                          <div className="relative flex-1 min-w-0 max-w-full overflow-hidden w-full sm:flex-1 sm:w-auto">
                            <select
                              value={rule?.kind ?? 'single_table'}
                              onChange={(e) =>
                                handleRuleKindChange(bill.id, e.target.value as DistributionRule['kind'], subtypeId)
                              }
                              className="w-full rounded-lg border border-slate-200 px-2 pr-8 py-1 text-sm focus:border-brand focus:outline-none appearance-none bg-white text-ellipsis overflow-hidden whitespace-nowrap"
                            >
                              <option value="single_table">Singola tabella</option>
                              <option value="weighted_tables">% su più tabelle</option>
                              <option value="custom_percent">Percentuale per condominio</option>
                            </select>
                            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {rule?.kind === 'single_table' && (
                          <div className="flex items-center gap-2 min-w-0">
                            <label className="text-sm text-slate-700 flex-shrink-0">Tabella</label>
                            <div className="relative flex-1 min-w-0 overflow-hidden">
                              <select
                                value={rule.tableId}
                                onChange={(e) =>
                                  updateRule(
                                    bill.id,
                                    () => ({ ...rule, tableId: e.target.value }),
                                    subtypeId,
                                  )
                                }
                                className="w-full rounded-lg border border-slate-200 px-2 pr-8 py-1 text-sm focus:border-brand focus:outline-none appearance-none bg-white text-ellipsis overflow-hidden whitespace-nowrap"
                              >
                                {draft.tables.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        )}

                        {rule?.kind === 'weighted_tables' && (
                          <div className="space-y-2">
                            {rule.tables.map((row, idx) => {
                              // Create a unique key for this specific row to compare
                              const rowKey = `${bill.id}|${subtypeId ?? 'main'}|${idx}`
                              const currentKebabKey = openKebabMenu 
                                ? `${openKebabMenu.billTypeId}|${openKebabMenu.subtypeId ?? 'main'}|${openKebabMenu.index}` 
                                : null
                              const isKebabOpen = currentKebabKey === rowKey
                              return (
                                <div key={`${row.tableId}-${idx}`} className="flex items-center gap-1.5 min-w-0">
                                  <div className="relative flex-1 min-w-0 overflow-hidden">
                                    <select
                                      value={row.tableId}
                                      onChange={(e) =>
                                        handleWeightedRow(bill.id, subtypeId, idx, 'tableId', e.target.value)
                                      }
                                      className="w-full rounded-lg border border-slate-200 px-2 pr-8 py-1 text-sm focus:border-brand focus:outline-none appearance-none bg-white truncate"
                                    >
                                      {draft.tables.map((t) => (
                                        <option key={t.id} value={t.id}>
                                          {t.name}
                                        </option>
                                      ))}
                                    </select>
                                    <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </div>
                                  </div>
                                  <div className="relative flex-shrink-0 w-20 sm:w-24">
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      step="0.01"
                                      min="0"
                                      max="100"
                                      value={
                                        (() => {
                                          const percent = row.weight * 100
                                          if (percent === 0) return '0'
                                          // Format: remove trailing zeros, keep 2 decimals max
                                          const formatted = percent.toFixed(2)
                                          return formatted.replace(/\.?0+$/, '')
                                        })()
                                      }
                                      onChange={(e) => {
                                        const val = e.target.value
                                        if (val === '' || (Number(val) >= 0 && Number(val) <= 100)) {
                                          handleWeightedRow(bill.id, subtypeId, idx, 'weight', val)
                                        }
                                      }}
                                      onBlur={(e) => {
                                        // Format on blur: ensure proper display format
                                        const val = e.target.value
                                        if (val === '') {
                                          // If empty, set to 0
                                          handleWeightedRow(bill.id, subtypeId, idx, 'weight', '0')
                                        } else if (!isNaN(Number(val))) {
                                          const num = Number(val)
                                          // Format: whole numbers as-is, decimals with max 2 places, remove trailing zeros
                                          const formatted = num % 1 === 0 ? num.toString() : num.toFixed(2).replace(/\.?0+$/, '')
                                          if (formatted !== val) {
                                            handleWeightedRow(bill.id, subtypeId, idx, 'weight', formatted)
                                          }
                                        }
                                      }}
                                      className="w-full rounded-lg border border-slate-200 px-1.5 pr-6 py-1 text-right text-sm font-medium text-slate-900 focus:border-brand focus:outline-none"
                                      placeholder="0"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-sm text-slate-500">%</span>
                                  </div>
                                  <div className="relative flex-shrink-0" data-kebab-menu>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setOpenKebabMenu(isKebabOpen ? null : { billTypeId: bill.id, subtypeId, index: idx })
                                      }}
                                      className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                      aria-label="Menu opzioni"
                                    >
                                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                      </svg>
                                    </button>
                                    {isKebabOpen && (
                                      <div className="absolute right-0 top-8 z-10 w-36 rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-slate-900/5">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setOpenKebabMenu(null)
                                            setShowRemoveWeightedTableConfirm({ billTypeId: bill.id, subtypeId, index: idx })
                                          }}
                                          className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg"
                                        >
                                          Rimuovi riga
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => addWeightedRow(bill.id, subtypeId)}
                                className="text-sm font-semibold text-brand"
                              >
                                + Aggiungi tabella
                              </button>
                              {(() => {
                                const sum = getWeightedTablesSum(rule)
                                const isValid = isWeightedTablesValid(rule)
                                return (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`text-xs font-medium ${
                                        isValid ? 'text-green-600' : 'text-red-600'
                                      }`}
                                    >
                                      {isValid ? (
                                        <>Somma: {sum.toFixed(2)}% ✓ OK</>
                                      ) : (
                                        <>Somma: {sum.toFixed(2)}% – deve essere 100%. Correggi le percentuali.</>
                                      )}
                                    </span>
                                    {!isValid && sum > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => normalizeWeightedTables(bill.id, subtypeId)}
                                        className="text-xs font-medium text-slate-600 hover:text-brand underline"
                                        title="Normalizza le percentuali per sommare esattamente 100%"
                                      >
                                        Normalizza
                                      </button>
                                    )}
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                        )}

                        {rule?.kind === 'custom_percent' && (
                          <div className="space-y-1">
                            {draft.condomini.map((condo) => {
                              const entry = rule.percents.find((p) => p.condoId === condo.id)
                              const value = entry?.weight ?? 0
                              return (
                                <label
                                  key={condo.id}
                                  className="flex items-center justify-between text-sm text-slate-700"
                                >
                                  <span>{condo.name}</span>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    value={value === 0 ? '' : value}
                                    onChange={(e) => {
                                      const newValue = e.target.value === '' ? 0 : Number(e.target.value) || 0
                                      handleCustomPercent(
                                        bill.id,
                                        subtypeId,
                                        condo.id,
                                        newValue,
                                      )
                                    }}
                                    onBlur={(e) => {
                                      if (e.target.value === '') {
                                        handleCustomPercent(bill.id, subtypeId, condo.id, 0)
                                      }
                                    }}
                                    className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm focus:border-brand focus:outline-none"
                                  />
                                </label>
                              )
                            })}
                            <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                              <p className="text-xs text-slate-500">Le percentuali sono normalizzate automaticamente.</p>
                              <p className="text-xs font-semibold text-slate-700">
                                Totale: {rule.percents.reduce((sum, p) => sum + (p.weight || 0), 0).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="mt-2">
                          <label className="text-xs uppercase text-slate-500">Descrizione</label>
                          <input
                            type="text"
                            value={rule?.description ?? ''}
                            onChange={(e) => handleDescription(bill.id, subtypeId, e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-brand focus:outline-none"
                            placeholder="Nota mostrata nella tabella"
                          />
                        </div>
                      </div>
                    )
                  },
                )}
                {bill.requiresSubtype && (
                  <button
                    type="button"
                    onClick={() => handleAddSubtype(bill.id)}
                    className="mt-2 w-full rounded-lg border border-dashed border-brand px-3 py-2 text-sm font-semibold text-brand hover:bg-brand/5 transition-colors"
                  >
                    + Aggiungi sottotipo
                  </button>
                )}
              </div>
            ))}
            {showAddBillType ? (
              <div className="rounded-xl border-2 border-dashed border-brand bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <h4 className="mb-3 text-sm font-semibold text-slate-900">Nuova tipologia</h4>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Nome tipologia <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newBillTypeName}
                      onChange={(e) => {
                        setNewBillTypeName(e.target.value)
                        setImportError(null)
                      }}
                      placeholder="Es. Luce, Riscaldamento"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="requiresSubtype"
                      checked={newBillTypeRequiresSubtype}
                      onChange={(e) => setNewBillTypeRequiresSubtype(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                    />
                    <label htmlFor="requiresSubtype" className="text-sm text-slate-700">
                      Richiede sottotipo?
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddBillType}
                      className="flex-1 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand/90"
                    >
                      Aggiungi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddBillType(false)
                        setNewBillTypeName('')
                        setNewBillTypeRequiresSubtype(false)
                        setImportError(null)
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddBillType(true)}
                className="w-full rounded-lg border border-dashed border-brand px-3 py-2 text-sm font-semibold text-brand hover:bg-brand/5"
              >
                + Aggiungi regola
              </button>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Anteprima regola</h3>
            <p className="mt-1 text-xs text-slate-600">Prova importo e visualizza il riparto.</p>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
            <div className="flex-1 min-w-0">
              <label className="mb-1 block text-xs font-medium text-slate-700">Tipo</label>
              <div className="relative">
                <select
                  value={previewBillTypeId}
                  onChange={(e) => setPreviewBillTypeId(e.target.value)}
                  title={draft.billTypes.find((bt) => bt.id === previewBillTypeId)?.name ?? ''}
                  className="w-full rounded-lg border border-slate-200 px-2 pr-8 py-1 text-sm text-left focus:border-brand focus:outline-none appearance-none bg-white"
                >
                  {draft.billTypes.map((bt) => (
                    <option key={bt.id} value={bt.id}>
                      {bt.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            {draft.billTypes.find((b) => b.id === previewBillTypeId)?.requiresSubtype && (
              <div className="flex-1 min-w-0">
                <label className="mb-1 block text-xs font-medium text-slate-700">Sottotipo</label>
                <div className="relative">
                  <select
                    value={previewSubtypeId}
                    onChange={(e) => setPreviewSubtypeId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2 pr-8 py-1 text-sm focus:border-brand focus:outline-none appearance-none bg-white"
                  >
                    {draft.billTypes
                      .find((b) => b.id === previewBillTypeId)
                      ?.subtypes?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                  <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
            <div className="flex-1 min-w-0 sm:flex-initial sm:min-w-[120px]">
              <label className="mb-1 block text-xs font-medium text-slate-700">Importo</label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={previewAmount}
                  onChange={(e) => setPreviewAmount(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-brand focus:outline-none"
                />
                <span className="text-sm text-slate-600">€</span>
              </div>
            </div>
          </div>

          <div className="mt-2">
            {previewResult ? (
              <ResultTable combinedResult={previewResult} hideActions compact />
            ) : (
              <p className="text-sm text-slate-600">Inserisci un importo valido per vedere la preview.</p>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-4 md:flex-row md:justify-between">
          <div className="text-xs text-slate-600">
            <p>Salvataggio in locale. Esporta configurazione per backup o per importarla altrove.</p>
            <p>Modifiche alle tabelle richiedono doppia conferma.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!areAllWeightedTablesValid()}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand/90 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Salva configurazione
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              Annulla
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation modal for removing weighted table row */}
      {showRemoveWeightedTableConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Conferma rimozione?</h3>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm text-slate-600">Vuoi rimuovere questa riga dalla configurazione?</p>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowRemoveWeightedTableConfirm(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => removeWeightedRow(showRemoveWeightedTableConfirm.billTypeId, showRemoveWeightedTableConfirm.subtypeId, showRemoveWeightedTableConfirm.index)}
                className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                Sì
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification for deleted table */}
      {deletedTable && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50 transition-all duration-200 ease-out">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg ring-1 ring-slate-900/5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-700">
                Tabella <span className="font-semibold">{deletedTable.table.id}</span> eliminata
              </p>
              <button
                type="button"
                onClick={deletedTable.undo}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap self-end sm:self-auto"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
