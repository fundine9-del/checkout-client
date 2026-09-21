import { useState } from 'react'
import { ArrowLeft, Banknote, CreditCard, Smartphone } from 'lucide-react'
import { api } from '../lib/api'
import { formatMoney } from '../lib/format'
import type { OrderWithItems, Receipt } from '../lib/types'

const METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'mobile', label: 'Mobile Money', icon: Smartphone },
]

interface CheckoutPageProps {
  order: OrderWithItems
  onBack: () => void
  onPaid: (receipt: Receipt) => void
}

export function CheckoutPage({ order, onBack, onPaid }: CheckoutPageProps) {
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pay() {
    setPaying(true)
    setError(null)
    try {
      const { receipt } = await api.checkout(order.id, paymentMethod)
      onPaid(receipt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
      setPaying(false)
    }
  }

  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0)
  const linkedStore = Boolean(order.store_id)

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col bg-slate-50">
      <header className="flex items-center gap-3 bg-white px-4 py-4 shadow-sm">
        <button onClick={onBack} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">Pay</h1>
      </header>

      <main className="flex-1 p-5">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Total to pay</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{formatMoney(order.total)}</p>
          <p className="mt-1 text-xs text-slate-400">{itemCount} items</p>
        </div>

        <h2 className="mt-6 text-sm font-medium text-slate-500">Payment method</h2>
        <div className="mt-2 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {METHODS.map(({ value, label, icon: Icon }, i) => (
            <button
              key={value}
              onClick={() => setPaymentMethod(value)}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm transition ${
                i > 0 ? 'border-t border-slate-100' : ''
              } ${
                paymentMethod === value ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-5 w-5 text-slate-400" />
              <span className="flex-1 font-medium">{label}</span>
              <span
                className={`h-4 w-4 rounded-full border-2 ${
                  paymentMethod === value ? 'border-teal-600 bg-teal-600' : 'border-slate-300'
                }`}
              />
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Payments are simulated in this version — no money moves.
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        {!linkedStore && (
          <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
            <p className="font-semibold">This checkout isn't linked to a store.</p>
            <p className="mt-1">
              Its payment wouldn't appear in any dashboard. Go back, scan the store's QR code (or
              pick it on Home), and start a new checkout.
            </p>
          </div>
        )}
      </main>

      <div className="sticky bottom-0 border-t border-slate-200 bg-white p-4">
        <button
          onClick={() => void pay()}
          disabled={paying || !linkedStore}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Banknote className="h-5 w-5" />
          {paying ? 'Processing…' : linkedStore ? `Pay ${formatMoney(order.total)}` : 'Link a store to pay'}
        </button>
      </div>
    </div>
  )
}