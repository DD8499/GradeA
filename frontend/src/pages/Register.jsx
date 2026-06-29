import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ShieldCheck, Eye, EyeOff, Check } from 'lucide-react'

const PERKS = [
  '14-day free trial — no credit card',
  'NYC DOH full violation checklist',
  'Daily staff checklists + alerts',
  'AI violation risk report',
]

export default function Register() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const { signUp }              = useAuth()
  const navigate                = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setError('')
    setLoading(true)
    try {
      await signUp(email, password)
      setDone(true)
      // If email confirmation is off in Supabase, redirect directly
      setTimeout(() => navigate('/onboarding'), 1500)
    } catch (err) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Account created!</h2>
          <p className="text-gray-400 text-sm">Taking you to setup…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-600 rounded-xl mb-4">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Grade<span className="text-green-400">A</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Start your free 14-day trial</p>
        </div>

        {/* Perks */}
        <div className="mb-5 space-y-1.5">
          {PERKS.map(p => (
            <div key={p} className="flex items-center gap-2 text-sm text-gray-400">
              <Check size={14} className="text-green-400 shrink-0" />
              {p}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Work email</label>
              <input
                type="email" required
                className="input"
                placeholder="owner@restaurant.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required
                  className="input pr-10"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPw(s => !s)}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3">
              {loading ? 'Creating account…' : 'Create free account'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-3">
            By creating an account you agree to our{' '}
            <a href="#" className="underline">Terms</a> &amp;{' '}
            <a href="#" className="underline">Privacy Policy</a>.
          </p>

          <p className="text-center text-sm text-gray-500 mt-4">
            Have an account?{' '}
            <Link to="/login" className="text-green-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
