import { useEffect, useRef, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'
import { CartPage } from './pages/CartPage'
import { ScanPage } from './pages/ScanPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { ReceiptPage } from './pages/ReceiptPage'
import type { OrderWithItems, Receipt } from './lib/types'
import { api } from './lib/api'
import { saveLastReceipt, setCurrentStore } from './lib/store'

type View =
  | { name: 'home' }
  | { name: 'cart'; orderId: string; initial: OrderWithItems | null }
  | { name: 'scan'; orderId: string; initial: OrderWithItems | null }
  | { name: 'checkout'; orderId: string; initial: OrderWithItems }
  | { name: 'receipt'; receipt: Receipt }

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  )
}

/** Decides what to show while auth state loads / is resolved. */
function Root() {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    )
  }
  if (!session) return <AuthPage />
  return <CheckoutFlow />
}

/** The checkout flow, reachable only while signed in. */
function CheckoutFlow() {
  const { session, displayName, signOut } = useAuth()
  const [view, setView] = useState<View>({ name: 'home' })
  const qrHandledRef = useRef(false)

  // Deep link: the store QR links to /?store=<id>, so a phone camera scan (or
  // a printed link) lands here with the right store selected and a checkout
  // already started, exactly like using the in-app "Scan QR" button.
  useEffect(() => {
    if (qrHandledRef.current) return
    const storeId = new URLSearchParams(window.location.search).get('store')
    if (!storeId) return
    qrHandledRef.current = true

    const url = new URL(window.location.href)
    url.searchParams.delete('store')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)

    void (async () => {
      try {
        const { store } = await api.fetchStore(storeId)
        if (!store) return
        setCurrentStore({ id: store.id, name: store.name })
        const { order } = await api.createOrder(
          displayName || session?.user.email || undefined,
          store.id,
        )
        setView({ name: 'cart', orderId: order.id, initial: order })
      } catch {
        // Store unresolved or server unreachable — stay on Home; the store is
        // set if lookup succeeded, and the user can tap "New checkout".
      }
    })()
  }, [displayName, session])

  switch (view.name) {
    case 'home':
      return (
        <HomePage
          userName={displayName || session?.user.email || ''}
          onSignOut={() => void signOut()}
          onCreated={(order) => setView({ name: 'cart', orderId: order.id, initial: order })}
          onOpen={(orderId) => setView({ name: 'cart', orderId, initial: null })}
          onShowReceipt={(receipt) => setView({ name: 'receipt', receipt })}
        />
      )

    case 'cart':
      return (
        <CartPage
          orderId={view.orderId}
          initial={view.initial}
          onBack={() => setView({ name: 'home' })}
          onScan={(order) => setView({ name: 'scan', orderId: view.orderId, initial: order })}
          onPay={(order) =>
            setView({ name: 'checkout', orderId: view.orderId, initial: order })
          }
        />
      )

    case 'scan':
      return (
        <ScanPage
          orderId={view.orderId}
          initial={view.initial}
          onDone={(updated) =>
            setView({ name: 'cart', orderId: view.orderId, initial: updated })
          }
        />
      )

    case 'checkout':
      return (
        <CheckoutPage
          order={view.initial}
          onBack={() => setView({ name: 'cart', orderId: view.orderId, initial: view.initial })}
          onPaid={(receipt) => {
            saveLastReceipt(receipt)
            setView({ name: 'receipt', receipt })
          }}
        />
      )

    case 'receipt':
      return <ReceiptPage receipt={view.receipt} onHome={() => setView({ name: 'home' })} />
  }
}