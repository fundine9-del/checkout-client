/** Prices are KES; the server rounds to 2dp. */
export function formatMoney(value: number): string {
  return `KSh ${value.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`
}

export function shortId(id: string): string {
  return id.length <= 8 ? id : id.slice(0, 8)
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}