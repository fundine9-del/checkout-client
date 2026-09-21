const KEY = 'checkout.current-store'

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