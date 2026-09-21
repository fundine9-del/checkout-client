import { CheckCircle2, Home } from 'lucide-react'
import { formatDateTime, formatMoney, shortId } from '../lib/format'
import type { Receipt } from '../lib/types'

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  mobile: 'Mobile Money',
}

export function ReceiptPage({ receipt, onHome }: { receipt: Receipt; onHome: () => void }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50">
      <header className="bg-white px-5 py-4 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Receipt</h1>
      </header>

      <main className="flex-1 p-5">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
          <h2 className="mt-3 text-xl font-semibold text-slate-900">Payment complete!</h2>
          <p className="mt-1 text-sm text-slate-500">
            Order #{shortId(receipt.order_id)} · {formatDateTime(receipt.paid_at)}
          </p>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <ul>
            {receipt.items.map((line, i) => (
              <li
                key={i}
                className="flex items-start justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{line.name}</p>
                  <p className="text-xs text-slate-400">
                    {line.quantity} × {formatMoney(line.unit_price)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-800">{formatMoney(line.line_total)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex justify-between border-t border-slate-200 pt-3">
            <span className="text-base font-semibold text-slate-900">Total</span>
            <span className="text-lg font-bold text-slate-900">{formatMoney(receipt.total)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm text-slate-500">
            <span>Paid with</span>
            <span className="font-medium text-slate-700">
              {METHOD_LABELS[receipt.payment_method] ?? receipt.payment_method}
            </span>
          </div>
        </div>
      </main>

      <div className="sticky bottom-0 border-t border-slate-200 bg-white p-4">
        <button
          onClick={onHome}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-teal-700"
        >
          <Home className="h-5 w-5" /> Back to home
        </button>
      </div>
    </div>
  )
}