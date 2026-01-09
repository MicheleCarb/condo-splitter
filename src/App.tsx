import { useMemo, useState } from 'react'
import { BillForm } from './components/BillForm'
import { ResultTable } from './components/ResultTable'
import { AdminPanel } from './components/AdminPanel'
import { useConfig } from './context/ConfigProvider'
import { calculateSplit, combineBills } from './lib/distribution'
import { parseAmount } from './utils/number'
import { SavedBill } from './types'

function App() {
  const { config, updateConfig, resetConfig, importConfig } = useConfig()
  const [savedBills, setSavedBills] = useState<SavedBill[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showAdmin, setShowAdmin] = useState(false)

  const combinedResult = useMemo(() => {
    if (savedBills.length === 0) return null
    return combineBills(config, savedBills)
  }, [config, savedBills])

  const handleSubmit = (data: { billTypeId: string; subtypeId?: string; amountRaw: string; memo?: string }) => {
    const amount = parseAmount(data.amountRaw)
    if (amount === null || amount <= 0) {
      setError('Inserisci un importo valido maggiore di zero')
      return
    }

    try {
      const computed = calculateSplit(config, {
        billTypeId: data.billTypeId,
        subtypeId: data.subtypeId,
        amount,
        memo: data.memo,
      })

      const bill: SavedBill = {
        id: `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        billTypeId: data.billTypeId,
        billLabel: computed.billLabel,
        subtypeId: data.subtypeId,
        amount,
        memo: data.memo,
        timestamp: Date.now(),
      }

      setSavedBills((prev) => [...prev, bill])
      setError(null)
    } catch (err) {
      setError('Controlla la configurazione: ' + (err as Error).message)
    }
  }

  const handleRemoveBill = (billId: string) => {
    setSavedBills((prev) => prev.filter((b) => b.id !== billId))
  }

  const handleClearAll = () => {
    if (window.confirm('Rimuovere tutte le bollette?')) {
      setSavedBills([])
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase text-slate-500">Condo Splitter</p>
            <h1 className="text-2xl font-bold text-slate-900">Riparto bollette immediato</h1>
            <p className="text-sm text-slate-600">
              Flusso in un tap per i genitori, configurazione sicura per te.
            </p>
          </div>
          <div className="flex gap-2 text-xs text-slate-600">
            <span className="rounded-full bg-brand/10 px-3 py-1 font-semibold text-brand">Mobile-first</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">Stampa/PNG 1-click</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">Locale + JSON</span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <BillForm config={config} onSubmit={handleSubmit} onAdminToggle={() => setShowAdmin(true)} />
          <div className="space-y-2">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-slate-500">Passo 2</p>
                  <h2 className="text-lg font-semibold text-slate-900">Tabella pronta da stampare</h2>
                  <p className="text-sm text-slate-600">
                    Formattata in euro (it-IT), identica nell&apos;export PNG.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetConfig}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ripristina esempio
                </button>
              </div>
              {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              {savedBills.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">
                      {savedBills.length} bolletta{savedBills.length > 1 ? 'e' : ''} aggiunta{savedBills.length > 1 ? 'e' : ''}
                    </p>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Rimuovi tutte
                    </button>
                  </div>
                  <div className="space-y-1">
                    {savedBills.map((bill) => (
                      <div
                        key={bill.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      >
      <div>
                          <span className="font-medium text-slate-800">{bill.billLabel}</span>
                          <span className="ml-2 text-slate-600">
                            {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(bill.amount)}
                          </span>
                          {bill.memo && <span className="ml-2 text-xs text-slate-500">({bill.memo})</span>}
      </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBill(bill.id)}
                          className="text-red-600 hover:text-red-700"
                          aria-label="Rimuovi"
                        >
                          ✕
        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3">
                <ResultTable combinedResult={combinedResult} savedBills={savedBills} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <p>
            Configurazione salvata in localStorage. Usa l&apos;Admin (⚙️) per gestire condomini, tabelle millesimali e
            regole di riparto. Esporta/Importa JSON per backup o per spostare la config.
        </p>
      </div>
      </main>

      {showAdmin && (
        <AdminPanel
          config={config}
          onSave={updateConfig}
          onImport={importConfig}
          onClose={() => setShowAdmin(false)}
        />
      )}
    </div>
  )
}

export default App
