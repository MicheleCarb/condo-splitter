import { useRef, useState } from 'react'
import { CombinedResult, SavedBill } from '../types'
import { downloadNodeAsPng } from '../services/exportImage'
import { formatCurrency } from '../utils/number'

type Props = {
  combinedResult?: CombinedResult | null
  savedBills?: SavedBill[]
  hideActions?: boolean
  compact?: boolean
}

export function ResultTable({ combinedResult, hideActions = false, compact = false }: Props) {
  const tableRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  if (!combinedResult || combinedResult.bills.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-sm ring-1 ring-slate-100">
        Inserisci importo e premi Calcola per vedere il riparto.
      </div>
    )
  }

  const handleDownload = async () => {
    if (!tableRef.current) return
    setDownloading(true)
    try {
      const billLabels = combinedResult.bills.map((b) => b.billLabel).join('-')
      await downloadNodeAsPng(tableRef.current, `riparto-${billLabels}.png`)
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = async () => {
    if (!tableRef.current) return
    
    try {
      const billLabels = combinedResult.bills.map((b) => b.billLabel).join('-')
      const blob = await downloadNodeAsPng(tableRef.current, `riparto-${billLabels}.png`, true)
      
      if (blob && navigator.share) {
        // Use Web Share API if available (mobile - includes print option on iOS)
        const file = new File([blob], `riparto-${billLabels}.png`, { type: 'image/png' })
        await navigator.share({
          title: `Riparto ${billLabels}`,
          text: `Riparto bollette: ${formatCurrency(combinedResult.total)}`,
          files: [file],
        })
      } else if (blob) {
        // Fallback: trigger download if Web Share API not available
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `riparto-${billLabels}.png`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      // If share is cancelled (AbortError), do nothing
      // Otherwise fallback to download
      if (err instanceof Error && err.name !== 'AbortError') {
        console.warn('Share failed, falling back to download', err)
        handleDownload()
      }
    }
  }

  // For simplified view: only show bill type columns + total (if multiple bills)
  // For detailed view: show all columns including table breakdowns
  const billColumns = combinedResult.columns.filter((col) => col.id.startsWith('bill_') && !col.id.includes('_detail_'))
  const totalColumn = combinedResult.columns.find((col) => col.id === 'total')
  const hasMultipleBills = combinedResult.bills.length > 1

  // Don't show total column if there's only one bill (redundant)
  const displayColumns = showDetails
    ? combinedResult.columns
    : hasMultipleBills
      ? [...billColumns, ...(totalColumn ? [totalColumn] : [])]
      : billColumns

  return (
    <div className="space-y-3">
      <div
        className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 ${compact ? 'text-xs' : 'text-sm'}`}
      >
        <div
          ref={tableRef}
          className="space-y-0 bg-white rounded-2xl p-4"
        >
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500">Riparto</p>
                <h3 className="text-lg font-semibold text-slate-900">
                  {hasMultipleBills ? 'Riparto combinato' : combinedResult.bills[0]?.billLabel}
                </h3>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>Totale: {formatCurrency(combinedResult.total)}</p>
                {combinedResult.bills.length > 1 && (
                  <p>{combinedResult.bills.length} bollette combinate</p>
                )}
              </div>
            </div>
            {combinedResult.bills.some((b) => b.memo) && (
              <div className="text-xs text-slate-500">
                Note:{' '}
                {combinedResult.bills
                  .filter((b) => b.memo)
                  .map((b) => `${b.billLabel}: ${b.memo}`)
                  .join('; ')}
              </div>
            )}
          </div>

          <div className="overflow-x-auto w-full">
            <table className="mt-3 border-collapse" style={{ minWidth: 'max-content' }}>
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-slate-600">
                <th className="rounded-l-xl px-3 py-2">Condominio</th>
                {displayColumns.map((col) => (
                  <th key={col.id} className="px-3 py-2 text-right">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {combinedResult.rows.map((row, idx) => (
                <tr
                  key={row.condoId}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                >
                  <td className="px-3 py-2 font-medium text-slate-800">{row.condoName}</td>
                  {displayColumns.map((col) => {
                    // For 'total' column, calculate sum of bill columns
                    if (col.id === 'total') {
                      return (
                        <td key={col.id} className="px-3 py-2 text-right font-semibold text-slate-900">
                          {formatCurrency(
                            billColumns.reduce((sum, billCol) => sum + (row.allocations[billCol.id] ?? 0), 0)
                          )}
                        </td>
                      )
                    }
                    return (
                      <td key={col.id} className="px-3 py-2 text-right text-slate-800">
                        {formatCurrency(row.allocations[col.id] ?? 0)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                <td className="px-3 py-2 text-slate-800">Totale</td>
                {displayColumns.map((col) => {
                  // For 'total' column, calculate sum of bill columns
                  if (col.id === 'total') {
                    const totalSum = combinedResult.rows.reduce(
                      (sum, row) => sum + billColumns.reduce((acc, billCol) => acc + (row.allocations[billCol.id] ?? 0), 0),
                      0,
                    )
                    return (
                      <td key={col.id} className="px-3 py-2 text-right text-slate-900">
                        {formatCurrency(totalSum)}
                      </td>
                    )
                  }
                  const sum = combinedResult.rows.reduce((acc, row) => acc + (row.allocations[col.id] ?? 0), 0)
                  return (
                    <td key={col.id} className="px-3 py-2 text-right text-slate-900">
                      {formatCurrency(sum)}
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          </table>
        </div>
        </div>

        {/* Toggle for showing details (only relevant if there are detail columns) - outside export ref */}
        {combinedResult.columns.some((col) => col.id.includes('_detail_')) && (
          <div className="mt-3 flex items-center justify-between border-b border-slate-100 pb-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={showDetails}
                onChange={(e) => setShowDetails(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
              />
              <span>Mostra dettagli (tabelle millesimali)</span>
            </label>
          </div>
        )}
      </div>

      {!hideActions && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand/90 disabled:opacity-60"
          >
            📥 Download PNG
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={downloading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            📤 Condividi
          </button>
        </div>
      )}
    </div>
  )
}
