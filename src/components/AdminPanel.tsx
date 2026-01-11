import { useEffect, useMemo, useState } from 'react'
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

  useEffect(() => {
    setDraft(config)
  }, [config])

  useEffect(() => {
    const billType = draft.billTypes.find((b) => b.id === previewBillTypeId)
    if (billType?.requiresSubtype && billType.subtypes?.length) {
      setPreviewSubtypeId(billType.subtypes[0].id)
    } else {
      setPreviewSubtypeId(undefined)
    }
  }, [draft.billTypes, previewBillTypeId])

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

  const handleTableName = (tableId: string, name: string) => {
    setDraft((prev) => ({
      ...prev,
      tables: prev.tables.map((t) => (t.id === tableId ? { ...t, name } : t)),
    }))
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
        tables[index] =
          field === 'tableId'
            ? { ...tables[index], tableId: value }
            : { ...tables[index], weight: Number(value) || 0 }
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
      <div className="mx-auto max-w-5xl space-y-4 rounded-3xl bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase text-slate-500">Area Admin</p>
            <h2 className="text-xl font-semibold text-slate-900">Configura condomini e regole</h2>
            <p className="text-sm text-slate-600">
              Le modifiche sono salvate in locale. Esporta una configurazione per backup.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
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
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Esporta configurazione
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
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
              Nome proprietario (opzionale)
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
                  <button
                    type="button"
                    onClick={() => handleRemoveCondo(c.id)}
                    className="rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-600 hover:bg-slate-100"
                  >
                    Elimina
                  </button>
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
              {draft.tables.map((table) => (
                <div key={table.id} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      value={table.name}
                      onChange={(e) => handleTableName(table.id, e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm font-semibold focus:border-brand focus:outline-none"
                    />
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">{table.id}</span>
                  </div>
                  <div className="space-y-2">
                    {draft.condomini.map((condo) => {
                      const entry = table.entries.find((e) => e.condoId === condo.id)
                      return (
                        <label key={condo.id} className="flex items-center justify-between text-sm text-slate-700">
                          <span>{condo.name}</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={entry?.value ?? 0}
                            onChange={(e) => handleTableValue(table.id, condo.id, Number(e.target.value) || 0)}
                            className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right focus:border-brand focus:outline-none"
                          />
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
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
              <div key={bill.id} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-slate-500">Tipo</p>
                    <p className="text-base font-semibold text-slate-900">{bill.name}</p>
                  </div>
                  {bill.requiresSubtype && <span className="text-xs text-slate-600">Ha sottotipi</span>}
                </div>

                {(bill.requiresSubtype ? bill.subtypes ?? [] : [{ id: bill.id, name: bill.name, rule: bill.rule }]).map(
                  (sub) => {
                    const rule = getRule(
                      { ...bill, subtypes: bill.subtypes ?? [] },
                      bill.requiresSubtype ? (sub as BillSubtype).id : undefined,
                    )
                    const subtypeId = bill.requiresSubtype ? (sub as BillSubtype).id : undefined
                    const subtypeName = bill.requiresSubtype ? (sub as BillSubtype).name : 'Regola'

                    return (
                      <div key={subtypeId ?? bill.id} className="mt-2 rounded-lg border border-slate-100 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-800">{subtypeName}</p>
                          <select
                            value={rule?.kind ?? 'single_table'}
                            onChange={(e) =>
                              handleRuleKindChange(bill.id, e.target.value as DistributionRule['kind'], subtypeId)
                            }
                            className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-brand focus:outline-none"
                          >
                            <option value="single_table">Singola tabella</option>
                            <option value="weighted_tables">% su più tabelle</option>
                            <option value="custom_percent">Percentuale per condominio</option>
                          </select>
                        </div>

                        {rule?.kind === 'single_table' && (
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-700">Tabella</label>
                            <select
                              value={rule.tableId}
                              onChange={(e) =>
                                updateRule(
                                  bill.id,
                                  () => ({ ...rule, tableId: e.target.value }),
                                  subtypeId,
                                )
                              }
                              className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-brand focus:outline-none"
                            >
                              {draft.tables.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {rule?.kind === 'weighted_tables' && (
                          <div className="space-y-2">
                            {rule.tables.map((row, idx) => (
                              <div key={`${row.tableId}-${idx}`} className="flex items-center gap-2">
                                <select
                                  value={row.tableId}
                                  onChange={(e) =>
                                    handleWeightedRow(bill.id, subtypeId, idx, 'tableId', e.target.value)
                                  }
                                  className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-brand focus:outline-none"
                                >
                                  {draft.tables.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={row.weight}
                                  onChange={(e) =>
                                    handleWeightedRow(bill.id, subtypeId, idx, 'weight', e.target.value)
                                  }
                                  className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm focus:border-brand focus:outline-none"
                                />
                                <span className="text-xs text-slate-500">peso</span>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addWeightedRow(bill.id, subtypeId)}
                              className="text-sm font-semibold text-brand"
                            >
                              + Aggiungi tabella
                            </button>
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
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Anteprima regola</h3>
              <p className="text-xs text-slate-600">Prova importo e visualizza il riparto.</p>
            </div>
            <div className="flex gap-2">
              <select
                value={previewBillTypeId}
                onChange={(e) => setPreviewBillTypeId(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-brand focus:outline-none"
              >
                {draft.billTypes.map((bt) => (
                  <option key={bt.id} value={bt.id}>
                    {bt.name}
                  </option>
                ))}
              </select>
              {draft.billTypes.find((b) => b.id === previewBillTypeId)?.requiresSubtype && (
                <select
                  value={previewSubtypeId}
                  onChange={(e) => setPreviewSubtypeId(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-brand focus:outline-none"
                >
                  {draft.billTypes
                    .find((b) => b.id === previewBillTypeId)
                    ?.subtypes?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              )}
              <input
                type="text"
                value={previewAmount}
                onChange={(e) => setPreviewAmount(e.target.value)}
                className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-brand focus:outline-none"
              />
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

        <div className="flex justify-between">
          <div className="text-xs text-slate-600">
            <p>Salvataggio in locale. Esporta configurazione per backup o per importarla altrove.</p>
            <p>Modifiche alle tabelle richiedono doppia conferma.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand/90"
            >
              Salva configurazione
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Annulla
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
