import { useState, type FormEvent } from 'react'
import { KeyRound, LogIn, ShoppingBasket, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

type Mode = 'signin' | 'signup'

function messageOf(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return String(err)
}

export function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        // A successful sign-in flips the app to the checkout flow via the
        // session state change — no navigation needed here.
        await signIn(email, password)
      } else {
        const trimmed = name.trim()
        const { needsEmailConfirm } = await signUp(trimmed, email.trim(), password)
        if (needsEmailConfirm) {
          setNotice('Account created — check your email, confirm it, then sign in.')
        } else {
          setMode('signin')
          setError(null)
          setPassword('')
          setNotice('Account created — sign in to start.') // session not used for the shop flow
        }
      }
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
    setNotice(null)
    setPassword('')
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50">
      <div className="flex flex-1 flex-col justify-center p-6">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white">
            <ShoppingBasket className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">Check Out</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to scan, pay and go.</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                mode === 'signin'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LogIn className="h-4 w-4" /> Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                mode === 'signup'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserPlus className="h-4 w-4" /> Create account
            </button>
          </div>

          <form onSubmit={(e) => void submit(e)} className="mt-5 space-y-4">
            {mode === 'signup' && (
              <label className="block text-sm font-medium text-slate-700">
                Your name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={200}
                  autoFocus
                  placeholder="e.g. Wanjiku Kamau"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                />
              </label>
            )}

            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus={mode === 'signin'}
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder="At least 6 characters"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800 ring-1 ring-teal-200">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-teal-700 disabled:opacity-60"
            >
              <KeyRound className="h-5 w-5" />
              {busy
                ? 'Please wait…'
                : mode === 'signin'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}