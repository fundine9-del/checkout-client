import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { CheckCircle2, Home, Printer, ScanLine } from 'lucide-react'
import { api } from '../lib/api'
import { formatDateTime, formatMoney, shortId } from '../lib/format'
import { encodeReceiptLink } from '../lib/qr'
import type { Receipt } from '../lib/types'
import { ScanPrinterModal, type PrinterLink } from '../components/ScanPrinterModal'

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  mobile: 'Mobile Money',
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

        {/* The printable receipt */}
        <div className="mx-auto mt-6 w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 print:mt-0 print:max-w-none print:shadow-none print:ring-0">
          <div className="text-center">
            <p className="text-base font-bold text-slate-900">
              {receipt.store_name ?? 'Check Out'}
            </p>
            <p className="mt-0.5 text-xs uppercase tracking-wider text-slate-400">Sales receipt</p>
          </div>

          <div className="mt-4 border-t border-dashed border-slate-300" />

          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Order</dt>
              <dd className="font-medium text-slate-800">#{shortId(receipt.order_id)}</dd>
            </div>
            {receipt.customer_name && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Customer</dt>
                <dd className="font-medium text-slate-800">{receipt.customer_name}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Date</dt>
              <dd className="font-medium text-slate-800">{formatDateTime(receipt.paid_at)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Paid with</dt>
              <dd className="font-medium text-slate-800">
                {METHOD_LABELS[receipt.payment_method] ?? receipt.payment_method}
              </dd>
            </div>
          </dl>

          <div className="mt-4 border-t border-dashed border-slate-300" />

          <ul className="mt-4 space-y-2.5">
            {receipt.items.map((line, i) => (
              <li key={i} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">{line.name}</p>
                  <p className="text-xs text-slate-400">
                    {line.quantity} × {formatMoney(line.unit_price)}
                    {line.barcode ? ` · ${line.barcode}` : ''}
                  </p>
                </div>
                <p className="font-medium text-slate-800">{formatMoney(line.line_total)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-dashed border-slate-300" />

          <div className="mt-4 flex justify-between">
            <span className="text-base font-semibold text-slate-900">Total</span>
            <span className="text-lg font-bold text-slate-900">{formatMoney(receipt.total)}</span>
          </div>

          {qr && (
            <div className="mt-4 flex flex-col items-center border-t border-dashed border-slate-300 pt-4">
              <img src={qr} alt="Receipt QR code" className="h-32 w-32" />
              <p className="mt-2 text-center text-xs text-slate-400">
                Scan at the till to reprint this receipt
              </p>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-slate-400">
            Thank you for shopping with us!
          </p>
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