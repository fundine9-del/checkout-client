import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, LogOut, Plus, ReceiptText, RefreshCw, ShoppingBasket, X } from 'lucide-react'
import { api } from '../lib/api'
import { formatDateTime, shortId } from '../lib/format'
import type { Order, OrderWithItems } from '../lib/types'

interface HomePageProps {
  userName: string
  onSignOut: () => void
  onCreated: (order: OrderWithItems) => void
  onOpen: (orderId: string) => void
}

export function HomePage({ userName, onSignOut, onCreated, onOpen }: HomePageProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // "New checkout" modal state. Customer name defaults to the signed-in
  // shopper so receipts carry the person who made the purchase.
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState(userName)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const { orders } = await api.fetchOrders('open')
      setOrders(orders)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load open checks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // fetch-on-mount: load open checks when the page opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  async function create() {
    setCreating(true)
    setCreateError(null)
    try {
      const { order } = await api.createOrder(name)
      setModalOpen(false)
      setName('')
      onCreated(order)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not start a checkout')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col bg-slate-50">
      <header className="flex items-center gap-3 bg-white px-5 py-4 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
          <ShoppingBasket className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-slate-900">Check Out</h1>
          <p className="truncate text-xs text-slate-500">
            {userName ? `Hi, ${userName}` : 'Scan, pay and go.'}
          </p>
        </div>
        <button
          onClick={onSignOut}
          title="Sign out"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </header>

      <main className="flex-1 p-5">
        {loading ? (
          <div className="mt-16 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
          </div>
        ) : error ? (
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
          <>
            <h2 className="text-sm font-medium text-slate-500">Open checks</h2>
            {orders.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
                <ReceiptText className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">
                  No open checks. Tap &ldquo;New checkout&rdquo; to start scanning.
                </p>
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {orders.map((order) => (
                  <li key={order.id}>
                    <button
                      onClick={() => onOpen(order.id)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 transition hover:ring-teal-300"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                        <ShoppingBasket className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {order.customer_name ?? 'Walk-in customer'}
                        </p>
                        <p className="text-xs text-slate-400">
                          #{shortId(order.id)} · {formatDateTime(order.created_at)} ·{' '}
                          {order.total === 0 ? 'no items yet' : 'in progress'}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      <div className="sticky bottom-0 border-t border-slate-200 bg-white p-4">
        <button
          onClick={() => {
            setCreateError(null)
            setModalOpen(true)
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-teal-700"
        >
          <Plus className="h-5 w-5" />
          New checkout
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">New checkout</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="mt-5 block text-sm font-medium text-slate-700">
              Customer name (optional)
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                maxLength={200}
                placeholder="Walk-in customer"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
              />
            </label>
            {createError && <p className="mt-3 text-sm text-red-600">{createError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => void create()}
                disabled={creating}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {creating ? 'Starting…' : 'Start'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}