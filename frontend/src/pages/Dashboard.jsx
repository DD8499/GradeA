import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { ScoreGaugeCard, CountdownBanner } from '../components/ScoreGauge'
import api from '../lib/api'
import { ClipboardCheck, Thermometer, AlertTriangle, Copy, Check, ExternalLink, Loader } from 'lucide-react'

export default function Dashboard() {
  const [restaurant, setRestaurant]   = useState(null)
  const [todayCheck, setTodayCheck]   = useState(null)
  const [latestTemps, setLatestTemps] = useState([])
  const [latestReport, setLatestReport] = useState(null)
  const [billing, setBilling]         = useState(null)
  const [staffLink, setStaffLink]     = useState(null)
  const [copied, setCopied]           = useState(false)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/restaurants/me'),
      api.get('/api/checklists/today').catch(() => ({ data: null })),
      api.get('/api/temperatures/latest').catch(() => ({ data: [] })),
      api.get('/api/violations/report').catch(() => ({ data: null })),
      api.get('/api/payments/status').catch(() => ({ data: null })),
      api.get('/api/restaurants/staff-link').catch(() => ({ data: null })),
    ]).then(([r, c, t, v, b, sl]) => {
      setRestaurant(r.data)
      setTodayCheck(c.data)
      setLatestTemps(t.data?.slice(0, 4) || [])
      setLatestReport(v.data)
      setBilling(b.data)
      setStaffLink(sl.data)
    }).finally(() => setLoading(false))
  }, [])

  const copyStaffLink = () => {
    if (staffLink) {
      navigator.clipboard.writeText(`${window.location.origin}/staff/${staffLink.token}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-96">
        <Loader size={24} className="animate-spin text-green-600" />
      </div>
    </AppLayout>
  )

  if (!restaurant) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-gray-500">No restaurant found.</p>
        <Link to="/onboarding" className="btn-primary">Complete setup →</Link>
      </div>
    </AppLayout>
  )

  const score      = todayCheck?.score ?? 0
  const violations = latestReport?.risks?.slice(0, 3) || []
  const tempAlerts = latestTemps.filter(t => t.is_violation)

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{restaurant.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{restaurant.address} · {restaurant.borough}</p>
        </div>

        {/* Trial banner */}
        {billing?.is_trial && billing?.trial_active && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-blue-800 font-medium">
              🎉 Free trial — {billing.trial_days_left} days remaining
            </p>
            <Link to="/settings" className="text-xs text-blue-600 font-semibold hover:underline">
              Upgrade now
            </Link>
          </div>
        )}

        {/* Inspection countdown */}
        {restaurant.days_until_inspection !== undefined && (
          <CountdownBanner
            daysUntil={restaurant.days_until_inspection}
            nextDate={restaurant.next_inspection_est}
          />
        )}

        {/* Top stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Score */}
          <div className="card p-4 col-span-2 lg:col-span-1 flex flex-col items-center justify-center gap-2 py-6">
            <ScoreGaugeCard score={score} size={130} />
            <p className="text-xs text-gray-400 font-medium">Today's readiness</p>
          </div>

          {/* Quick stats */}
          <div className="card p-4 flex flex-col justify-between">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center mb-3">
              <ClipboardCheck size={16} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">
                {todayCheck ? `${todayCheck.items_passed}/${todayCheck.items_total}` : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Items checked today</p>
            </div>
            <Link to="/checklist" className="text-xs text-green-600 font-semibold hover:underline mt-2">
              Go to checklist →
            </Link>
          </div>

          <div className="card p-4 flex flex-col justify-between">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${tempAlerts.length > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
              <Thermometer size={16} className={tempAlerts.length > 0 ? 'text-red-600' : 'text-gray-400'} />
            </div>
            <div>
              <p className={`text-2xl font-black ${tempAlerts.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {tempAlerts.length > 0 ? `${tempAlerts.length} alert${tempAlerts.length > 1 ? 's' : ''}` : latestTemps.length > 0 ? '✓ OK' : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Temperature status</p>
            </div>
            <Link to="/temperatures" className="text-xs text-green-600 font-semibold hover:underline mt-2">
              Log temperatures →
            </Link>
          </div>

          <div className="card p-4 flex flex-col justify-between">
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center mb-3">
              <AlertTriangle size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">
                {latestReport ? violations.length : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Top AI risks identified</p>
            </div>
            <Link to="/violations" className="text-xs text-green-600 font-semibold hover:underline mt-2">
              View AI report →
            </Link>
          </div>
        </div>

        {/* Two column */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Failed items */}
          <div className="card p-4">
            <h2 className="font-bold text-gray-900 mb-3">
              Open issues {todayCheck?.items_failed > 0 && (
                <span className="ml-2 text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                  {todayCheck.items_failed} failed
                </span>
              )}
            </h2>
            {(!todayCheck || todayCheck.items_failed === 0) ? (
              <div className="text-center py-6">
                <div className="text-2xl mb-1">✅</div>
                <p className="text-sm text-gray-400">
                  {todayCheck ? 'All items passed today!' : 'No checklist submitted today yet.'}
                </p>
                {!todayCheck && (
                  <Link to="/checklist" className="btn-primary mt-3 text-xs">
                    Start today's checklist
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {(todayCheck.open_issues || []).slice(0, 5).map(code => (
                  <div key={code} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                    <span className="text-red-600 font-mono text-xs font-bold bg-red-100 px-1.5 py-0.5 rounded">
                      {code}
                    </span>
                    <span className="text-xs text-red-700">Needs attention</span>
                  </div>
                ))}
                <Link to="/checklist" className="btn-secondary w-full text-xs mt-2">
                  Review full checklist
                </Link>
              </div>
            )}
          </div>

          {/* Top risks preview */}
          <div className="card p-4">
            <h2 className="font-bold text-gray-900 mb-3">Top AI risk flags</h2>
            {violations.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-2xl mb-1">🤖</div>
                <p className="text-sm text-gray-400 mb-3">No AI report generated yet.</p>
                <Link to="/violations" className="btn-primary text-xs">
                  Generate AI report
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {violations.map((v, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-gray-100">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                      v.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>{v.violation_code}</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{v.title}</p>
                      <p className="text-xs text-gray-400">{v.estimated_fine}</p>
                    </div>
                  </div>
                ))}
                <Link to="/violations" className="btn-secondary w-full text-xs mt-2">
                  See full report
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Staff link card */}
        {staffLink && (
          <div className="card p-4">
            <h2 className="font-bold text-gray-900 mb-1">Staff checklist link</h2>
            <p className="text-xs text-gray-400 mb-3">Share this link with your kitchen staff — no login required.</p>
            <div className="flex gap-2">
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 truncate">
                {window.location.origin}/staff/{staffLink.token}
              </code>
              <button onClick={copyStaffLink} className="btn-secondary shrink-0">
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <a href={`/staff/${staffLink.token}`} target="_blank" rel="noreferrer" className="btn-secondary shrink-0">
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
