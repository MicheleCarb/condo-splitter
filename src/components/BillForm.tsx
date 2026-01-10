import { useEffect, useMemo, useState } from 'react'
import { AppConfig } from '../types'

type FormValues = {
  billTypeId: string
  subtypeId?: string
  amountRaw: string
  memo?: string
}

type Props = {
  config: AppConfig
  onSubmit: (values: FormValues) => void
  onAdminToggle: () => void
  hasExistingBills?: boolean
}

export function BillForm({ config, onSubmit, onAdminToggle, hasExistingBills = false }: Props) {
  const firstBillTypeId = config.billTypes[0]?.id ?? ''
  const [billTypeId, setBillTypeId] = useState(firstBillTypeId)
  const [subtypeId, setSubtypeId] = useState<string | undefined>()
  const [amountRaw, setAmountRaw] = useState('')
  const [memo, setMemo] = useState('')

  const selectedBillType = useMemo(
    () => config.billTypes.find((b) => b.id === billTypeId),
    [billTypeId, config.billTypes],
  )

  useEffect(() => {
    if (!config.billTypes.find((b) => b.id === billTypeId) && config.billTypes[0]) {
      setBillTypeId(config.billTypes[0].id)
    }
  }, [billTypeId, config.billTypes])

  useEffect(() => {
    if (selectedBillType?.requiresSubtype && selectedBillType.subtypes?.length) {
      setSubtypeId(selectedBillType.subtypes[0].id)
    } else {
      setSubtypeId(undefined)
    }
  }, [selectedBillType])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!billTypeId) return
    onSubmit({ billTypeId, subtypeId, amountRaw, memo })
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 w-full min-w-0">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 min-w-0">
        <div>
          <p className="text-xs uppercase text-slate-500">Passo 1</p>
          <h2 className="text-lg font-semibold text-slate-900">Inserisci bolletta</h2>
          <p className="text-sm text-slate-600">Scegli tipo, importo e invia</p>
        </div>
        <button
          type="button"
          onClick={onAdminToggle}
          className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ⚙️ Admin
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">Tipo di spesa</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {config.billTypes.map((bill) => (
              <button
                type="button"
                key={bill.id}
                onClick={() => setBillTypeId(bill.id)}
                className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold ${
                  billTypeId === bill.id
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-slate-200 text-slate-700 hover:border-brand/50'
                }`}
              >
                {bill.name}
              </button>
            ))}
          </div>
        </div>

        {selectedBillType?.requiresSubtype && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">Sottotipo</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {selectedBillType.subtypes?.map((sub) => (
                <button
                  type="button"
                  key={sub.id}
                  onClick={() => setSubtypeId(sub.id)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold ${
                    subtypeId === sub.id
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-slate-200 text-slate-700 hover:border-brand/50'
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">Importo (€)</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Es. 100,30"
            value={amountRaw}
            onChange={(e) => setAmountRaw(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-lg font-semibold shadow-inner focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <p className="text-xs text-slate-500">Puoi digitare 100.30 o 100,30</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">Memo (opzionale)</label>
          <input
            type="text"
            placeholder="Nota per la bolletta"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-2xl bg-brand px-4 py-3 text-lg font-semibold text-white shadow-md transition hover:bg-brand/90 focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          {hasExistingBills ? 'Aggiungi bolletta' : 'Calcola ripartizione'}
        </button>
      </form>
    </div>
  )
}
