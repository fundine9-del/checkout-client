import { useState } from 'react'
import { HomePage } from './pages/HomePage'
import { CartPage } from './pages/CartPage'
import { ScanPage } from './pages/ScanPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { ReceiptPage } from './pages/ReceiptPage'
import type { OrderWithItems, Receipt } from './lib/types'

type View =
  | { name: 'home' }
  | { name: 'cart'; orderId: string; initial: OrderWithItems | null }
  | { name: 'scan'; orderId: string; initial: OrderWithItems | null }
  | { name: 'checkout'; orderId: string; initial: OrderWithItems }
  | { name: 'receipt'; receipt: Receipt }

export default function App() {
  const [view, setView] = useState<View>({ name: 'home' })

  switch (view.name) {
    case 'home':
      return (
        <HomePage
          onCreated={(order) => setView({ name: 'cart', orderId: order.id, initial: order })}
          onOpen={(orderId) => setView({ name: 'cart', orderId, initial: null })}
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
          onPaid={(receipt) => setView({ name: 'receipt', receipt })}
        />
      )

    case 'receipt':
      return <ReceiptPage receipt={view.receipt} onHome={() => setView({ name: 'home' })} />
  }
}