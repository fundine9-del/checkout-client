import type { Order, OrderWithItems, Receipt, Store } from './types'

const BASE = '/api'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
}

async function req<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError(
      0,
      'Could not reach the checkout server. Is it running on http://localhost:3000?',
    )
  }

  if (!res.ok) {
    let message = `Request failed (HTTP ${res.status})`
    try {
      const data = (await res.json()) as { error?: unknown }
      if (data && typeof data.error === 'string') message = data.error
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, message)
  }

  return (await res.json()) as T
}

/** Public checkout API — no auth needed for the customer app. */
export const api = {
  fetchStores() {
    return req<{ stores: Store[] }>('/stores')
  },

  createOrder(customerName?: string, storeId?: string) {
    const body: Record<string, unknown> = {}
    if (customerName && customerName.trim() !== '') {
      body.customer_name = customerName.trim()
    }
    if (storeId) body.store_id = storeId
    return req<{ order: OrderWithItems }>('/orders', { method: 'POST', body })
  },

  fetchOrders(status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    return req<{ orders: Order[] }>(`/orders${query}`)
  },

  fetchOrder(orderId: string) {
    return req<{ order: OrderWithItems }>(`/orders/${orderId}`)
  },

  addItem(orderId: string, barcode: string, quantity = 1) {
    return req<{ order: OrderWithItems }>(`/orders/${orderId}/items`, {
      method: 'POST',
      body: { barcode, quantity },
    })
  },

  updateItemQuantity(orderId: string, itemId: string, quantity: number) {
    return req<{ order: OrderWithItems }>(`/orders/${orderId}/items/${itemId}`, {
      method: 'PATCH',
      body: { quantity },
    })
  },

  removeItem(orderId: string, itemId: string) {
    return req<{ order: OrderWithItems }>(`/orders/${orderId}/items/${itemId}`, {
      method: 'DELETE',
    })
  },

  checkout(orderId: string, paymentMethod: string) {
    return req<{ order: OrderWithItems; receipt: Receipt }>(
      `/orders/${orderId}/checkout`,
      { method: 'POST', body: { payment_method: paymentMethod } },
    )
  },
}