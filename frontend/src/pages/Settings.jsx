import { useState, useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import api from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { Check, Copy, RefreshCw, CreditCard, Loader, ExternalLink } from 'lucide-react'

const PLANS = {
  starter: { name: 'Starter', price: '$39/month', features: ['1 location','Up to 5 staff','Daily checklists','Temperature logging','Email alerts'] },
  pro:     { name: 'Pro',     price: '$79/month', features: ['Up to 3 locations','Unlimited staff','AI risk report','Photo documentation','SMS alerts','Priority support'] },
}

export default function Settings() {
  const { user, signOut }           = useAuth()
  const [restaurant, setRestaurant] = useState(null)
  const [billing, setBilling]       = useState(null)
  const [staffLink, setStaffLink]   = useState(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [copied, setCopied]         = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [upgrading, setUpgrading]   = useState('')
  const [form, setForm]             = useState({})

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [r, b, sl] = await Promise.all([
        api.get('/api/restaurants/me'),
        api.get('/api/payments/status').catch(() => ({ data: null })),
        api.get('/api/restaurants/staff-link').catch(() => ({ data: null })),
      ])
      setRestaurant(r.data)
      setForm({
        name: r.data?.name || '',
        address: r.data?.address || '',
        borough: r.data?.borough || '',
        cuisine_type: r.data?.cuisine_type || '',
        seating_capacity: r.data?.seating_capacity || 0,
        staff_count: r.data?.staff_count || 0,
      })
      setBilling(b.data)
      setStaffLink(sl.data)
    } finally { setLoading(false) }
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await api.put('/api/restaurants/me', form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { alert('Failed to save. Try again.') }
    finally { setSaving(false) }
  }

  const copyLink = () => {
    if (staffLink) {
      navigator.clipboard.writeText(`${window.location.origin}/staff/${staffLink.token}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const refreshToken = async () => {
    if (!confirm('This will invalidate the old staff link. Continue?')) return
    setRefreshing(true)
    try {
      const res = await api.post('/api/restaurants/regenerate-token')
      setStaffLink(sl => ({ ...sl, token: res.data.token }))
    } finally { setRefreshing(false) }
  }

  const upgrade = async (plan) => {
    setUpgrading(plan)
    try {
      const res = await api.post('/api/payments/checkout', { plan })
      if (res.data.checkout_url) window.location.href = res.data.checkout_url
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to start checkout. Make sure Stripe is configured.')
    } finally { setUpgrading('') }
  }

  const cancelSub = async () => {
    if (!confirm('Cancel your subscription? You'll keep access until end of billing period.')) return
    try {
      await api.post('/api/payments/cancel')
      alert('Subscription will cancel at end of billing period.')
      loadData()
    } catch (e) { alert(e.response?.data?.detail || 'Failed to cancel.') }
  }

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-96">
        <Loader size={24} className="animate-spin text-green-600" />
      </div>
    </AppLayout>
  )

  const currentPlan = billing?.plan || 'trial'

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Settings</h1>

        {/* Account info */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-3">Account</h2>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-700">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{user?.email}</p>
              <p className="text-xs text-gray-400">Restaurant owner account</p>
            </div>
          </div>
        </div>

        {/* Restaurant profile */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">Restaurant profile</h2>
          <form onSubmit={saveProfile} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Restaurant name</label>
                <input className="input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Address</label>
                <input className="input" value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label className="label">Borough</label>
                <select className="input" value={form.borough || ''} onChange={e => setForm(f => ({ ...f, borough: e.target.value }))}>
                  {['Manhattan','Brooklyn','Queens','Bronx','Staten Island'].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Cuisine type</label>
                <input className="input" value={form.cuisine_type || ''} onChange={e => setForm(f => ({ ...f, cuisine_type: e.target.value }))} />
              </div>
              <div>
                <label className="label">Seating capacity</label>
                <input type="number" className="input" value={form.seating_capacity || 0}
                  onChange={e => setForm(f => ({ ...f, seating_capacity: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="label">Staff count</label>
                <input type="number" className="input" value={form.staff_count || 0}
                  onChange={e => setForm(f => ({ ...f, staff_count: Number(e.target.value) }))} />
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <><Loader size={14} className="animate-spin" /> Saving…</> : saved ? <><Check size={14} /> Saved!</> : 'Save changes'}
            </button>
          </form>
        </div>

        {/* Staff link */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-1">Staff checklist link</h2>
          <p className="text-xs text-gray-400 mb-3">Share with kitchen staff — no login required</p>
          <div className="flex gap-2 mb-2">
            <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 truncate">
              {staffLink ? `${window.location.origin}/staff/${staffLink.token}` : '—'}
            </code>
            <button onClick={copyLink} className="btn-secondary shrink-0">
              {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <a href={staffLink ? `/staff/${staffLink.token}` : '#'} target="_blank" rel="noreferrer" className="btn-secondary shrink-0">
              <ExternalLink size={14} />
            </a>
          </div>
          <button onClick={refreshToken} disabled={refreshing} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Regenerate link (invalidates old link)
          </button>
        </div>

        {/* Billing */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-1">Plan & billing</h2>
          <p className="text-xs text-gray-400 mb-4">
            Current plan: <strong className="text-gray-700 capitalize">{currentPlan}</strong>
            {billing?.is_trial && billing?.trial_active && ` · ${billing.trial_days_left} days left in trial`}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(PLANS).map(([key, plan]) => (
              <div key={key} className={`border-2 rounded-xl p-4 ${currentPlan === key ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                {currentPlan === key && (
                  <span className="inline-block text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full mb-2">
                    Current plan
                  </span>
                )}
                <h3 className="font-bold text-gray-900">{plan.name}</h3>
                <p className="text-xl font-black text-gray-900 mt-0.5">{plan.price}</p>
                <ul className="mt-3 space-y-1.5">
                  {plan.features.map(f => (
                    <li key={f} className="text-xs text-gray-600 flex items-center gap-1.5">
                      <Check size={11} className="text-green-600 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                {currentPlan !== key && (
                  <button onClick={() => upgrade(key)} disabled={!!upgrading} className="btn-primary w-full mt-4 text-xs">
                    {upgrading === key ? <><Loader size={12} className="animate-spin" /> Redirecting…</> : <><CreditCard size={12} /> Upgrade to {plan.name}</>}
                  </button>
                )}
              </div>
            ))}
          </div>
          {billing?.has_subscription && (
            <button onClick={cancelSub} className="mt-4 text-xs text-gray-400 hover:text-red-500 transition-colors">
              Cancel subscription
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
