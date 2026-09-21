import type { Receipt } from './types'

const KEY = 'checkout.current-store'
const RECEIPT_KEY = 'checkout.last-receipt'

export interface SelectedStore {
  id: string
  name: string
}

/** The supermarket this kiosk belongs to, picked once and kept on this device. */
export function getCurrentStore(): SelectedStore | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SelectedStore
    if (parsed && typeof parsed.id === 'string' && typeof parsed.name === 'string') {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function setCurrentStore(store: SelectedStore | null): void {
  try {
    if (store) localStorage.setItem(KEY, JSON.stringify(store))
    else localStorage.removeItem(KEY)
  } catch {
    // storage unavailable — selection just won't persist
  }
}

/** Keeps the most recent receipt so it can be viewed/printed again after a refresh. */
export function saveLastReceipt(receipt: Receipt): void {
  try {
    localStorage.setItem(RECEIPT_KEY, JSON.stringify(receipt))
  } catch {
    // storage unavailable — the receipt just won't survive a refresh
  }
}

export function getLastReceipt(): Receipt | null {
  try {
    const raw = localStorage.getItem(RECEIPT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Receipt
    if (parsed && typeof parsed.order_id === 'string' && Array.isArray(parsed.items)) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}