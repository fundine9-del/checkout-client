/**
 * Turns a scanned/typed store QR payload into a store id.
 *
 * The dashboard encodes the QR as `<kiosk-link>?store=<storeId>`, but we also
 * accept a `checkout-store:<id>` scheme and a bare store id (UUID) so the
 * in-app scanner and manual entry both work regardless of what the QR holds.
 */
export function parseStorePayload(raw: string): string | null {
  const text = raw.trim()
  if (text === '') return null

  // URL form: https://kiosk.example/?store=<id>
  try {
    const url = new URL(text)
    const store = url.searchParams.get('store')
    if (store && store.trim() !== '') return store.trim()
  } catch {
    // not a URL — try the other forms below
  }

  // checkout-store:<id>
  const scheme = /^checkout-store:([0-9a-f-]+)$/i.exec(text)
  if (scheme) return scheme[1]

  // Bare store id (UUID)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
    return text
  }

  return null
}

/**
 * The QR shown on the customer's digital receipt. The till scans it (Printers
 * / Sales dashboard) to print that receipt on the bonded till printer.
 * Shape: checkout-receipt:<order_id>
 */
export function encodeReceiptLink(orderId: string): string {
  return `checkout-receipt:${orderId}`
}

/**
 * Turn a scanned/typed printer QR payload into { printerId, token }.
 * The dashboard encodes printer QRs as `checkout-printer:connect:<id>:<token>`;
 * the token is the credential that sends this receipt to that printer's queue.
 */
export function parsePrinterLink(
  raw: string,
): { printerId: string; token: string } | null {
  const parts = raw.trim().split(':')
  if (parts.length !== 4 || parts[0] !== 'checkout-printer' || parts[1] !== 'connect') return null
  const printerId = parts[2]
  const token = parts[3]
  if (!printerId || !token) return null
  return { printerId, token }
}