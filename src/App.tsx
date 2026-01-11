import { useMemo, useState, useRef, useEffect } from 'react'
import { BillForm } from './components/BillForm'
import { ResultTable } from './components/ResultTable'
import { AdminPanel } from './components/AdminPanel'
import { Toast } from './components/Toast'
import { useConfig } from './context/ConfigProvider'
import { calculateSplit, combineBills } from './lib/distribution'
import { parseAmount } from './utils/number'
import { SavedBill, AppConfig } from './types'

function App() {
  const { config, updateConfig, importConfig, isExampleConfig, markAsReal } = useConfig()
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
            <h1 className="text-2xl font-bold text-slate-900">Ripartizione bollette, facile</h1>
            <p className="text-sm text-slate-600">
              Flusso in un tap, configurazione sicura per te.
            </p>
            {config.ownerName && (
              <p className="mt-1 text-sm font-medium text-brand/80">Ciao, {config.ownerName}!</p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 w-full overflow-x-hidden min-w-0">
        {isExampleConfig && (
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-emerald-50/30 p-6 shadow-sm">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Benvenuto 👋</h3>
                <p className="mt-2 text-sm text-slate-700">
                  Prima di iniziare, configuriamo il tuo condominio.
                  <br />
                  Puoi importare una configurazione esistente oppure crearne una nuova.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="cursor-pointer rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand/90 transition whitespace-nowrap text-center">
                  Importa configurazione
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        const text = await file.text()
                        const parsed = JSON.parse(text) as AppConfig
                        importConfig(parsed)
                        if (isExampleConfig) {
                          markAsReal()
                        }
                        setError(null)
                      } catch (err) {
                        setError('Configurazione non valida')
                      }
                      // Reset input so same file can be selected again
                      e.target.value = ''
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setShowAdmin(true)}
                  className="text-sm font-medium text-slate-700 hover:text-brand underline underline-offset-2 decoration-1"
                >
                  Configura da zero
                </button>
              </div>
              <p className="text-xs text-slate-500">Questa operazione si fa una sola volta.</p>
            </div>
          </div>
        )}
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
            Configurazione salvata in locale. Usa l&apos;Admin (⚙️) per gestire condomini, tabelle millesimali e
            regole di riparto. Esporta/Importa configurazione per backup o per spostare la config.
        </p>
      </div>
      </main>

      {showAdmin && (
        <AdminPanel
          config={config}
          isExampleConfig={isExampleConfig}
          onSave={(newConfig) => {
            updateConfig(newConfig)
            if (isExampleConfig) {
              markAsReal()
            }
          }}
          onImport={(newConfig) => {
            importConfig(newConfig)
            if (isExampleConfig) {
              markAsReal()
            }
          }}
          onClose={() => setShowAdmin(false)}
        />
      )}

      <Toast message="Spesa aggiunta alla ripartizione" visible={showToast} onClose={() => setShowToast(false)} />
    </div>
  )
}

export default App
