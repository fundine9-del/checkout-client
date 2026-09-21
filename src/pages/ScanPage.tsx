import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Keyboard, ScanLine, VideoOff } from 'lucide-react'
import { api } from '../lib/api'
import { formatMoney } from '../lib/format'
import { barcodeDetectorSupported } from '../lib/barcode'
import type { OrderWithItems } from '../lib/types'

interface ScanPageProps {
  orderId: string
  initial: OrderWithItems | null
  onDone: (order: OrderWithItems) => void
}

type CameraState = 'idle' | 'starting' | 'on' | 'unavailable'
type InputMode = 'camera' | 'manual'

export function ScanPage({ orderId, initial, onDone }: ScanPageProps) {
  const [order, setOrder] = useState<OrderWithItems | null>(initial)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const [mode, setMode] = useState<InputMode>(() =>
    barcodeDetectorSupported ? 'camera' : 'manual',
  )
  const [cameraState, setCameraState] = useState<CameraState>(
    barcodeDetectorSupported ? 'idle' : 'unavailable',
  )

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const detectorRef = useRef<{
    detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>
  } | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef(0)
  const cooldownRef = useRef(0)
  const processingRef = useRef(false)

  const showFlash = useCallback((message: string) => {
    setFlash(message)
    window.setTimeout(() => setFlash(null), 1800)
  }, [])

  /**
   * Adds a scanned/typed barcode to the order. Guarded by processingRef so a
   * burst of camera detections (or Enter presses) can't double-add.
   */
  const addBarcode = useCallback(
    async (raw: string) => {
      const barcode = raw.trim()
      if (barcode === '' || processingRef.current) return
      processingRef.current = true
      setBusy(true)
      try {
        const { order: updated } = await api.addItem(orderId, barcode)
        setOrder(updated)
        const last = updated.items[updated.items.length - 1]
        showFlash(`Added ${last?.name ?? barcode}`)
        setManual('')
      } catch (err) {
        showFlash(err instanceof Error ? err.message : 'Could not add that item')
        setManual('')
      } finally {
        processingRef.current = false
        setBusy(false)
      }
    },
    [orderId, showFlash],
  )

  // Load the order whenever the scan screen opens (keeps the footer in sync).
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const { order: loaded } = await api.fetchOrder(orderId)
        if (active) setOrder(loaded)
      } catch {
        // footer just shows zeros until the first scan succeeds
      }
    })()
    return () => {
      active = false
    }
  }, [orderId])

  // Camera scanning loop (Chromium only). Runs only while "Camera" mode is
  // active — switching to "Type code" stops the stream to save the camera.
  useEffect(() => {
    // cameraState already starts as 'unavailable' when BarcodeDetector is
    // unsupported, so nothing to set here when camera mode is off.
    if (!barcodeDetectorSupported || mode !== 'camera') return undefined

    let active = true

    async function startCamera() {
      setCameraState('starting')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (!active) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play()
        }
        detectorRef.current = new window.BarcodeDetector!()
        setCameraState('on')
        scheduleFrame()
      } catch {
        if (active) setCameraState('unavailable')
      }
    }

    function scheduleFrame() {
      if (!active) return
      rafRef.current = requestAnimationFrame(loop)
    }

    function loop() {
      if (!active) return
      const video = videoRef.current
      const canvas = canvasRef.current
      const detector = detectorRef.current
      if (!video || !canvas || !detector || video.readyState < 2) {
        scheduleFrame()
        return
      }
      if (Date.now() - cooldownRef.current < 1200) {
        scheduleFrame()
        return
      }
      const ctx = canvas.getContext('2d')
      if (ctx) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        void detector
          .detect(canvas)
          .then((codes) => {
            if (codes && codes.length > 0) {
              cooldownRef.current = Date.now()
              void addBarcode(codes[0].rawValue)
            }
          })
          .catch(() => {
            /* transient detection error on a frame — keep scanning */
          })
      }
      scheduleFrame()
    }

    void startCamera()

    return () => {
      active = false
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [mode, addBarcode])

  const itemCount = order?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0
  const total = order?.total ?? 0
  const showCamera =
    mode === 'camera' && (cameraState === 'on' || cameraState === 'starting')

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-950">
      <header className="flex items-center justify-between px-4 py-4 text-white">
        <h1 className="text-lg font-semibold">Scan items</h1>
        <button
          onClick={() => order && onDone(order)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10"
        >
          Done
        </button>
      </header>

      {/* Mode toggle: camera scan or type the code */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/10 p-1">
          <button
            onClick={() => setMode('camera')}
            disabled={!barcodeDetectorSupported}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-30 ${
              mode === 'camera' ? 'bg-teal-600 text-white' : 'text-white/70'
            }`}
          >
            <ScanLine className="h-4 w-4" /> Camera
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === 'manual' ? 'bg-teal-600 text-white' : 'text-white/70'
            }`}
          >
            <Keyboard className="h-4 w-4" /> Type code
          </button>
        </div>
      </div>

      <main className="flex-1">
        {showCamera ? (
          <div className="relative aspect-[3/4] w-full bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-64 w-64 rounded-2xl border-2 border-teal-400/70" />
            </div>
            {/* Off-screen canvas used only for frame detection */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            {mode === 'manual' ? (
              <>
                <Keyboard className="h-12 w-12 text-white/40" />
                <p className="mt-4 text-sm text-white/70">
                  Type or paste the barcode printed on the product, then press{' '}
                  <span className="font-semibold text-teal-300">Add</span>.
                </p>
              </>
            ) : (
              <>
                <VideoOff className="h-12 w-12 text-white/40" />
                <p className="mt-4 text-sm text-white/70">
                  {barcodeDetectorSupported
                    ? 'Camera unavailable on this device.'
                    : 'Camera scanning needs Chrome or Edge — type the code instead.'}
                </p>
              </>
            )}
          </div>
        )}

        <div className="p-4">
          {mode === 'manual' ? (
            <div className="rounded-xl bg-white/10 p-4">
              <input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void addBarcode(manual)
                }}
                disabled={busy}
                inputMode="numeric"
                autoFocus
                placeholder="Product barcode"
                className="w-full rounded-lg bg-white/5 px-4 py-3 text-center text-lg tracking-widest text-white placeholder-white/30 outline-none disabled:opacity-50"
              />
              <button
                onClick={() => void addBarcode(manual)}
                disabled={busy || manual.trim() === ''}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
              >
                <Check className="h-4 w-4" /> Add
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
              <ScanLine className="h-5 w-5 text-white/60" />
              <input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void addBarcode(manual)
                }}
                disabled={busy}
                inputMode="numeric"
                placeholder="Enter barcode manually"
                className="w-full bg-transparent text-white placeholder-white/40 outline-none disabled:opacity-50"
              />
              <button
                onClick={() => void addBarcode(manual)}
                disabled={busy || manual.trim() === ''}
                className="rounded-lg bg-teal-600 p-2 text-white hover:bg-teal-500 disabled:opacity-40"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          )}

          {flash && (
            <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-center text-sm text-white">
              {flash}
            </p>
          )}

          {itemCount > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-white/70">
                {itemCount} item{itemCount === 1 ? '' : 's'} · last:{' '}
                {order?.items.length ? order.items[order.items.length - 1].name : '—'}
              </p>
              <p className="text-lg font-bold text-white">{formatMoney(total)}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}