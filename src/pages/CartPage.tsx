import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Banknote, CheckCircle2, Minus, Plus, RefreshCw, ScanLine, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { formatMoney } from '../lib/format'
import type { OrderWithItems } from '../lib/types'

interface CartPageProps {
  orderId: string
  initial: OrderWithItems | null
  onBack: () => void
  onScan: (order: OrderWithItems) => void
  onPay: (order: OrderWithItems) => void
}

export function CartPage({ orderId, initial, onBack, onScan, onPay }: CartPageProps) {
  const [order, setOrder] = useState<OrderWithItems | null>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const { order } = await api.fetchOrder(orderId)
      setOrder(order)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this checkout')
    }
  }, [orderId])

  useEffect(() => {
    // fetch-on-mount: refresh the order whenever this screen opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  async function mutate(action: () => Promise<{ order: OrderWithItems }>) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const { order: updated } = await action()
      setOrder(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  const itemCount = (order?.items ?? []).reduce((sum, i) => sum + i.quantity, 0)
  const cartEmpty = (order?.items ?? []).length === 0

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col bg-slate-50">
      <header className="flex items-center gap-3 bg-white px-4 py-4 shadow-sm">
        <button onClick={onBack} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">Checkout</h1>
        <span className="ml-auto rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
          #{orderId.slice(0, 8)}
        </span>
      </header>

      <main className="flex-1 p-5">
        {!order ? (
          error ? (
            <div className="mt-10 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-red-200">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={() => void load()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white"
              >
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
            </div>
          ) : (
            <div className="mt-16 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
            </div>
          )
        ) : order.status !== 'open' ? (
          <div className="mt-16 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
            <p className="mt-3 text-base font-medium text-slate-800">
              Already paid — {formatMoney(order.total)}
            </p>
            <button
              onClick={onBack}
              className="mt-6 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-medium text-white"
            >
              Back
            </button>
          </div>
        ) : cartEmpty ? (
          <div className="mt-16 text-center">
            <ScanLine className="mx-auto h-14 w-14 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">Your cart is empty — scan your first item.</p>
            <button
              onClick={() => order && onScan(order)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white"
            >
              <ScanLine className="h-5 w-5" /> Scan items
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </div>
            )}
            <ul className="space-y-2">
              {order.items.map((line) => (
                <li key={line.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{line.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{formatMoney(line.price)} each</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      {formatMoney(line.price * line.quantity)}
                    </p>
                    <button
                      onClick={() =>
                        void mutate(() => api.removeItem(orderId, line.id))
                      }
                      disabled={busy}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() =>
                        void mutate(() =>
                          api.updateItemQuantity(orderId, line.id, line.quantity - 1),
                        )
                      }
                      disabled={busy}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium text-slate-800">
                      {line.quantity}
                    </span>
                    <button
                      onClick={() =>
                        void mutate(() =>
                          api.updateItemQuantity(orderId, line.id, line.quantity + 1),
                        )
                      }
                      disabled={busy}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>

      {order && order.status === 'open' && !cartEmpty && (
        <div className="sticky bottom-0 border-t border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {itemCount} item{itemCount === 1 ? '' : 's'}
            </p>
            <p className="text-xl font-bold text-slate-900">{formatMoney(order.total)}</p>
          </div>
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => order && onScan(order)}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-teal-600 px-4 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50"
            >
              <ScanLine className="h-5 w-5" /> Scan
            </button>
            <button
              onClick={() => order && onPay(order)}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              <Banknote className="h-5 w-5" /> Pay
            </button>
          </div>
        </div>
      )}
    </div>
  )
}