import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { CheckCircle2, Home, Printer, ScanLine } from 'lucide-react'
import { api } from '../lib/api'
import { formatDateTime, shortId } from '../lib/format'
import { encodeReceiptLink } from '../lib/qr'
import type { Receipt } from '../lib/types'
import { ScanPrinterModal, type PrinterLink } from '../components/ScanPrinterModal'

// ---------------------------------------------------------------- fiscal
// KRA-style monospace receipt layout (mirrors printer-agent/agent.mjs).
const RECEIPT_W = 46

function padReceipt(text: string | null | undefined, width: number): string {
  const t = String(text ?? '')
  return t.length >= width ? t.slice(0, width) : t.padEnd(width, ' ')
}

function padReceiptStart(text: string | null | undefined, width: number): string {
  return String(text ?? '').padStart(width, ' ')
}

function centerReceipt(text: string, width: number): string {
  const left = Math.max(0, Math.floor((width - text.length) / 2))
  return ' '.repeat(left) + text.slice(0, width - left)
}

function moneyPlain(value: number): string {
  return value.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function receiptStamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}:${p(d.getSeconds())}`
}

function receiptLines(receipt: Receipt): string[] {
  const W = RECEIPT_W
  const DASH = '-'.repeat(W)
  const EQ = '='.repeat(W)
  const lines: string[] = []

  lines.push(EQ)
  lines.push(centerReceipt((receipt.store_name ?? 'Check Out').toUpperCase(), W))
  if (receipt.vat_number) lines.push(centerReceipt(`VAT #: ${receipt.vat_number}`, W))
  if (receipt.pin) lines.push(centerReceipt(`PIN: ${receipt.pin}`, W))
  lines.push('')
  const saleLine = `Sale # ${shortId(receipt.order_id)}`
  lines.push(
    (receipt.till_number ? `${saleLine}  Till No: ${receipt.till_number}` : saleLine).trimEnd(),
  )
  lines.push(`DateTime:${receiptStamp(receipt.paid_at)}`)
  lines.push(EQ)

  lines.push(`ITEM${' '.repeat(12)}QTY${' '.repeat(8)}PRICE${' '.repeat(8)}AMOUNT`)
  lines.push(DASH)
  for (const line of receipt.items) {
    const barcode = line.barcode ? String(line.barcode) : ''
    lines.push(
      padReceipt(barcode || ' ', 26) +
        padReceiptStart(`${line.quantity} x ${moneyPlain(line.unit_price)}`, 20),
    )
    lines.push(
      padReceipt(line.name, 26) +
        padReceiptStart(moneyPlain(line.line_total), 13) +
        padReceiptStart(` ${line.tax_code ?? 'A'}`, 7),
    )
  }
  lines.push(DASH)

  lines.push(padReceipt('TOTAL', 26) + padReceiptStart(moneyPlain(receipt.total), 20))
  if (receipt.tendered != null) {
    lines.push(padReceipt('CASH', 26) + padReceiptStart(moneyPlain(receipt.tendered), 20))
    lines.push(padReceipt('CHANGE', 26) + padReceiptStart(moneyPlain(receipt.change ?? 0), 20))
  }
  lines.push(DASH)

  lines.push(`TOTAL ITEMS: ${receipt.item_count ?? receipt.items.length}`)
  if ((receipt.vat_rows ?? []).length > 0) {
    lines.push(
      padReceipt('CODE', 8) +
        padReceiptStart('RATE', 11) +
        padReceiptStart('VATABLE AMT', 14) +
        padReceiptStart('VAT AMT', 13),
    )
    lines.push(DASH)
    for (const row of receipt.vat_rows ?? []) {
      lines.push(
        padReceipt(` ${row.code}`, 8) +
          padReceiptStart(`${row.rate.toFixed(2)}%`, 11) +
          padReceiptStart(moneyPlain(row.vatable), 14) +
          padReceiptStart(moneyPlain(row.vat), 13),
      )
    }
    lines.push(DASH)
  }

  const paidBy =
    receipt.payment_method === 'cash'
      ? 'Cash'
      : receipt.payment_method === 'mobile'
        ? 'Mobile Money'
        : receipt.payment_method
  lines.push(
    receipt.tendered != null
      ? `Cash             :  ${moneyPlain(receipt.tendered)}`
      : `PAID BY         :  ${paidBy.toUpperCase()}`,
  )
  lines.push(DASH)
  lines.push(padReceipt(' PRICES INCLUSIVE OF VAT WHERE APPLICABLE', W))
  lines.push('')
  lines.push(centerReceipt('Thank You !', W))
  lines.push(
    padReceipt(`RECEIPT # ${shortId(receipt.order_id)}`, 22) +
      padReceiptStart(receiptStamp(receipt.paid_at), 24),
  )
  lines.push(EQ)
  return lines
}

export function ReceiptPage({ receipt, onHome }: { receipt: Receipt; onHome: () => void }) {
  const [qr, setQr] = useState<string | null>(null)
  const [printerScanOpen, setPrinterScanOpen] = useState(false)
  const [printState, setPrintState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [printError, setPrintError] = useState<string | null>(null)
  const [lastPrinter, setLastPrinter] = useState<PrinterLink | null>(null)

  // The receipt QR — the till scans it to reprint this receipt.
  useEffect(() => {
    let active = true
    QRCode.toDataURL(encodeReceiptLink(receipt.order_id), {
      width: 480,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setQr(url)
      })
      .catch(() => {
        /* QR rendering failed — keep the receipt usable without it */
      })
    return () => {
      active = false
    }
  }, [receipt.order_id])

  /** Send this receipt to a till printer (scanned from its QR). */
  async function sendToPrinter(printerId: string, token: string) {
    setPrintState('sending')
    setPrintError(null)
    try {
      await api.enqueuePrintJob(printerId, token, receipt.order_id)
      setPrintState('sent')
    } catch (err) {
      setPrintState('failed')
      setPrintError(err instanceof Error ? err.message : 'Could not send the receipt to the printer.')
    }
  }

  function handlePrinter(link: PrinterLink) {
    setLastPrinter(link)
    setPrinterScanOpen(false)
    void sendToPrinter(link.printerId, link.token)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col bg-slate-50 print:bg-white">
      <header className="bg-white px-5 py-4 shadow-sm print:hidden">
        <h1 className="text-lg font-semibold text-slate-900">Receipt</h1>
      </header>

      <main className="flex-1 p-5 print:p-4">
        <div className="text-center print:hidden">
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
          <h2 className="mt-3 text-xl font-semibold text-slate-900">Payment complete!</h2>
          <p className="mt-1 text-sm text-slate-500">
            Order #{shortId(receipt.order_id)} · {formatDateTime(receipt.paid_at)}
          </p>
        </div>

        {/* The printable receipt — KRA-style fiscal layout */}
        <div className="mx-auto mt-6 w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 print:mt-0 print:max-w-none print:shadow-none print:ring-0">
          <pre className="whitespace-pre font-mono text-[11px] leading-snug text-slate-900">
            {receiptLines(receipt).join('\n')}
          </pre>
          {qr && (
            <div className="mt-3 flex flex-col items-center gap-1 border-t border-dashed border-slate-300 pt-3">
              <img src={qr} alt="Receipt QR code" className="h-24 w-24" />
              <p className="text-[10px] text-slate-400">Scan at the till to reprint this receipt</p>
            </div>
          )}
        </div>

        {/* Print at a till printer (scan the till's printer QR) */}
        <div className="mx-auto mt-4 w-full max-w-sm print:hidden">
          {printState === 'sending' && (
            <p className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-800">
              Sending the receipt to the till printer…
            </p>
          )}
          {printState === 'sent' && (
            <p className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-800">
              <span>✓ Sent to the till printer.</span>
              {lastPrinter && (
                <button
                  onClick={() => void sendToPrinter(lastPrinter.printerId, lastPrinter.token)}
                  className="shrink-0 font-medium underline"
                >
                  Send again
                </button>
              )}
            </p>
          )}
          {printState === 'failed' && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{printError ?? 'Could not reach the till printer.'}</p>
              <div className="mt-2 flex gap-4">
                <button onClick={() => setPrinterScanOpen(true)} className="font-medium underline">
                  Scan again
                </button>
                {lastPrinter && (
                  <button
                    onClick={() => void sendToPrinter(lastPrinter.printerId, lastPrinter.token)}
                    className="font-medium underline"
                  >
                    Try again
                  </button>
                )}
              </div>
            </div>
          )}
          {printState === 'idle' && (
            <button
              onClick={() => setPrinterScanOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-600 px-4 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-50"
            >
              <ScanLine className="h-5 w-5" /> Print at a till printer
            </button>
          )}
        </div>
      </main>

      <div className="sticky bottom-0 border-t border-slate-200 bg-white p-4 print:hidden">
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-teal-600 px-4 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-50"
          >
            <Printer className="h-5 w-5" /> Print
          </button>
          <button
            onClick={onHome}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-teal-700"
          >
            <Home className="h-5 w-5" /> Back to home
          </button>
        </div>
      </div>

      {printerScanOpen && (
        <ScanPrinterModal onClose={() => setPrinterScanOpen(false)} onPrinter={handlePrinter} />
      )}
    </div>
  )
}