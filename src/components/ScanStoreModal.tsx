import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Keyboard, ScanLine, VideoOff, X } from 'lucide-react'
import { api } from '../lib/api'
import { barcodeDetectorSupported } from '../lib/barcode'
import { parseStorePayload } from '../lib/qr'
import type { SelectedStore } from '../lib/store'

interface ScanStoreModalProps {
  onClose: () => void
  /** Called once the QR resolves to a real supermarket. */
  onStore: (store: SelectedStore) => void
}

type CameraState = 'idle' | 'starting' | 'on' | 'unavailable'

/**
 * Full-screen QR modal: point the camera at the store's QR code (or paste its
 * content) to instantly bind this kiosk to that supermarket and start a
 * fresh checkout there.
 */
export function ScanStoreModal({ onClose, onStore }: ScanStoreModalProps) {
  const [cameraState, setCameraState] = useState<CameraState>(
    barcodeDetectorSupported ? 'idle' : 'unavailable',
  )
  const [manual, setManual] = useState('')
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const detectorRef = useRef<{ detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> } | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef(0)
  const processingRef = useRef(false)

  /** Resolves a scanned/pasted payload to a store and hands it up. */
  const resolvePayload = useCallback(
    async (raw: string) => {
      if (processingRef.current || resolving) return
      const id = parseStorePayload(raw)
      if (!id) {
        setError('That isn’t a store QR — scan the code at the store entrance, or paste its contents.')
        return
      }
      processingRef.current = true
      setResolving(true)
      setError(null)
      try {
        const { store } = await api.fetchStore(id)
        setDone(true)
        onStore({ id: store.id, name: store.name })
      } catch (err) {
        setError(
          err instanceof Error && (err as { status?: number }).status === 404
            ? 'No supermarket matches that code — check the QR and try again.'
            : err instanceof Error
              ? err.message
              : 'Could not check that code.',
        )
      } finally {
        processingRef.current = false
        setResolving(false)
      }
    },
    [onStore, resolving],
  )

  // Camera scanning loop (Chromium only). Stops the stream on unmount.
  useEffect(() => {
    if (!barcodeDetectorSupported) return undefined
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
        detectorRef.current = new window.BarcodeDetector!({ formats: ['qr_code'] })
        setCameraState('on')
        scheduleFrame()
      } catch {
        if (!active) return
        setCameraState('unavailable')
      }
    }

    function scheduleFrame() {
      if (active) rafRef.current = requestAnimationFrame(loop)
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
      if (processingRef.current) {
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
            if (codes && codes.length > 0) void resolvePayload(codes[0].rawValue)
          })
          .catch(() => {
            /* transient detection error — keep scanning */
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
  }, [resolvePayload])

  const showCamera = cameraState === 'on' || cameraState === 'starting'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white">
      <header className="flex items-center justify-between px-4 py-4">
        <h1 className="text-lg font-semibold">Scan store QR</h1>
        <button
          onClick={onClose}
          disabled={resolving}
          className="rounded-lg p-2 text-white/70 hover:bg-white/10 disabled:opacity-40"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <p className="px-4 text-sm text-white/60">
        Point the camera at the store's QR code — a fresh checkout will start for that supermarket.
      </p>

      <main className="flex flex-1 flex-col overflow-y-auto">
        {showCamera ? (
          <div className="relative mx-auto mt-4 aspect-[3/4] w-full max-w-sm rounded-2xl bg-black">
            <video ref={videoRef} className="h-full w-full rounded-2xl object-cover" playsInline muted />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-56 w-56 rounded-2xl border-2 border-teal-400/80" />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            {resolving && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-950/70">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <VideoOff className="h-10 w-10 text-white/40" />
            <p className="mt-3 text-sm text-white/70">
              {barcodeDetectorSupported
                ? 'Camera unavailable — type or paste the code below instead.'
                : 'Camera scanning needs Chrome or Edge — type or paste the code below instead.'}
            </p>
          </div>
        )}

        {/* Manual fallback */}
        <div className="mx-auto mt-4 w-full max-w-sm px-4 pb-6">
          <div className="rounded-xl bg-white/10 p-4">
            <div className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-white/60" />
              <input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void resolvePayload(manual)
                }}
                disabled={resolving}
                autoFocus={!barcodeDetectorSupported}
                placeholder="Paste the store code or QR contents"
                className="w-full bg-transparent text-sm text-white placeholder-white/40 outline-none disabled:opacity-50"
              />
            </div>
            <button
              onClick={() => void resolvePayload(manual)}
              disabled={resolving || manual.trim() === ''}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
            >
              <Check className="h-4 w-4" /> {resolving ? 'Checking…' : 'Use this code'}
            </button>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-center text-sm text-red-300 ring-1 ring-red-500/30">
              {error}
            </p>
          )}

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-white/40">
            <ScanLine className="h-3.5 w-3.5" /> The code is printed at the store entrance by the
            owner.
          </p>
        </div>
      </main>

      {done && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
          <p className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold">
            Store found — starting checkout…
          </p>
        </div>
      )}
    </div>
  )
}