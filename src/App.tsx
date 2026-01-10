import { useMemo, useState, useRef, useEffect } from 'react'
import { BillForm } from './components/BillForm'
import { ResultTable } from './components/ResultTable'
import { AdminPanel } from './components/AdminPanel'
import { Toast } from './components/Toast'
import { useConfig } from './context/ConfigProvider'
import { calculateSplit, combineBills } from './lib/distribution'
import { parseAmount } from './utils/number'
import { SavedBill } from './types'

function App() {
  const { config, updateConfig, importConfig } = useConfig()
  const [savedBills, setSavedBills] = useState<SavedBill[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [highlightTable, setHighlightTable] = useState(false)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const previousBillsCountRef = useRef(0)

  const combinedResult = useMemo(() => {
    if (savedBills.length === 0) return null
    return combineBills(config, savedBills)
  }, [config, savedBills])

  // Auto-scroll and highlight when a new bill is added
  useEffect(() => {
    if (savedBills.length > previousBillsCountRef.current && savedBills.length > 0) {
      // Scroll to table container with smooth behavior
      if (tableContainerRef.current) {
        setTimeout(() => {
          tableContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      }

      // Trigger visual highlight
      setHighlightTable(true)
      setTimeout(() => setHighlightTable(false), 1000)

      // Show toast notification
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
    previousBillsCountRef.current = savedBills.length
  }, [savedBills.length])

  const handleSubmit = (data: { billTypeId: string; subtypeId?: string; amountRaw: string; memo?: string }, onSuccess?: () => void) => {
    const amount = parseAmount(data.amountRaw)
    if (amount === null || amount <= 0) {
      setError('Inserisci un importo valido maggiore di zero')
      return false
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
      onSuccess?.()
      return true
    } catch (err) {
      setError('Controlla la configurazione: ' + (err as Error).message)
      return false
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white overflow-x-hidden w-full max-w-full">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur w-full max-w-full overflow-x-hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between w-full min-w-0">
          <div>
            <p className="text-xs uppercase text-slate-500">Condo Splitter</p>
            <h1 className="text-2xl font-bold text-slate-900">Riparto bollette immediato</h1>
            <p className="text-sm text-slate-600">
              Flusso in un tap, configurazione sicura per te.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 w-full overflow-x-hidden min-w-0">
        <div className="grid gap-4 lg:grid-cols-2 min-w-0 w-full">
          <BillForm config={config} onSubmit={handleSubmit} onAdminToggle={() => setShowAdmin(true)} hasExistingBills={savedBills.length > 0} />
          <div className="space-y-2 min-w-0 w-full">
            <div ref={tableContainerRef} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 w-full min-w-0">
              <div>
                <p className="text-xs uppercase text-slate-500">Passo 2</p>
                <h2 className="text-lg font-semibold text-slate-900">Tabella pronta da condividere</h2>
              </div>
              {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              {savedBills.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">
                      {savedBills.length} bollett{savedBills.length > 1 ? 'e' : 'a'} aggiunt{savedBills.length > 1 ? 'e' : 'a'}
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
                <ResultTable combinedResult={combinedResult} savedBills={savedBills} highlight={highlightTable} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 w-full min-w-0">
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

      <Toast message="Spesa aggiunta alla ripartizione" visible={showToast} onClose={() => setShowToast(false)} />
    </div>
  )
}

export default App
