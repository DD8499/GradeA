import { useState, useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import api from '../lib/api'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, Award, AlertTriangle, Users, Loader } from 'lucide-react'

const DAYS_OPTIONS = [7, 14, 30, 90]

export default function Analytics() {
  const [days, setDays]         = useState(30)
  const [overview, setOverview] = useState(null)
  const [scoreTrend, setScore]  = useState([])
  const [staffPerf, setStaff]   = useState([])
  const [violFreq, setViolFreq] = useState([])
  const [tempTrend, setTemps]   = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => { loadAll() }, [days])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [o, s, st, v, t] = await Promise.all([
        api.get('/api/analytics/overview'),
        api.get(`/api/analytics/score-trend?days=${days}`),
        api.get(`/api/analytics/staff-performance?days=${days}`),
        api.get(`/api/analytics/violation-frequency?days=${days}`),
        api.get(`/api/analytics/temperature-trend?days=7`),
      ])
      setOverview(o.data)
      setScore(s.data || [])
      setStaff(st.data || [])
      setViolFreq(v.data || [])
      setTemps(t.data || [])
    } finally { setLoading(false) }
  }

  const gradeColor = g => g === 'A' ? '#16A34A' : g === 'B' ? '#D97706' : g === 'C' ? '#DC2626' : '#6B7280'

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-96">
        <Loader size={24} className="animate-spin text-green-600" />
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Analytics & Reports</h1>
            <p className="text-sm text-gray-400 mt-0.5">Track your inspection readiness over time</p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {DAYS_OPTIONS.map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${days === d ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Overview stats */}
        {overview && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: 'Avg Readiness Score',
                value: `${overview.avg_score_30d}/100`,
                icon: TrendingUp,
                color: overview.avg_score_30d >= 80 ? 'text-green-600' : overview.avg_score_30d >= 60 ? 'text-amber-600' : 'text-red-600',
                bg: overview.avg_score_30d >= 80 ? 'bg-green-50' : 'bg-amber-50',
              },
              {
                label: 'Check Streak',
                value: `${overview.current_streak} days`,
                icon: Award,
                color: 'text-blue-600', bg: 'bg-blue-50',
              },
              {
                label: 'Open Actions',
                value: overview.open_corrective_actions,
                icon: AlertTriangle,
                color: overview.open_corrective_actions > 0 ? 'text-red-600' : 'text-green-600',
                bg: overview.open_corrective_actions > 0 ? 'bg-red-50' : 'bg-green-50',
              },
              {
                label: 'Predicted Grade',
                value: overview.predicted_grade,
                icon: Award,
                color: gradeColor(overview.predicted_grade),
                bg: 'bg-gray-50',
                big: true,
              },
            ].map(stat => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="card p-4">
                  <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
                    <Icon size={16} className={stat.color} />
                  </div>
                  <p className={`${stat.big ? 'text-4xl' : 'text-2xl'} font-black ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* Score trend chart */}
        <div className="card p-4">
          <h2 className="font-bold text-gray-900 mb-4">Readiness score trend — last {days} days</h2>
          {scoreTrend.length < 2 ? (
            <p className="text-sm text-gray-400 text-center py-8">Not enough data yet. Keep submitting daily checklists!</p>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreTrend}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => [`${v}/100`, 'Score']} labelFormatter={l => `Date: ${l}`} />
                  <ReferenceLine y={87} stroke="#16A34A" strokeDasharray="4 2"
                    label={{ value: 'A grade', fontSize: 10, fill: '#16A34A', position: 'right' }} />
                  <ReferenceLine y={70} stroke="#D97706" strokeDasharray="4 2"
                    label={{ value: 'B grade', fontSize: 10, fill: '#D97706', position: 'right' }} />
                  <Line type="monotone" dataKey="score" stroke="#16A34A" strokeWidth={2.5}
                    dot={{ r: 3, fill: '#16A34A' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Two-col: violations + staff */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Top failing violations */}
          <div className="card p-4">
            <h2 className="font-bold text-gray-900 mb-3">Most common failures</h2>
            {violFreq.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No failures recorded — great work!</p>
            ) : (
              <div className="space-y-2">
                {violFreq.map((v, i) => (
                  <div key={v.code} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                    <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      v.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>{v.code}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-700 truncate">{v.title}</span>
                        <span className="text-xs font-bold text-gray-500 shrink-0">{v.count}×</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-1.5 bg-red-400 rounded-full"
                          style={{ width: `${(v.count / violFreq[0].count) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Staff performance */}
          <div className="card p-4">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Users size={16} /> Staff performance
            </h2>
            {staffPerf.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No submissions yet.</p>
            ) : (
              <div className="space-y-2.5">
                {staffPerf.map(s => (
                  <div key={s.name} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {s.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-gray-800 truncate">{s.name}</span>
                        <span className="text-sm font-black text-gray-900">{s.avg_score}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${s.avg_score}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{s.submissions} checks</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Temperature trend */}
        {tempTrend.length > 1 && (
          <div className="card p-4">
            <h2 className="font-bold text-gray-900 mb-3">Temperature history — last 7 days</h2>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tempTrend}>
                  <XAxis dataKey="logged_at" tick={{ fontSize: 9 }}
                    tickFormatter={d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v, n) => [`${v}°F`, n]} />
                  <ReferenceLine y={41} stroke="#DC2626" strokeDasharray="3 2"
                    label={{ value: '41°F', fontSize: 9, fill: '#DC2626' }} />
                  <Line type="monotone" dataKey="temp_value" stroke="#378ADD" strokeWidth={1.5}
                    dot={false} name="Temperature" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Top failures summary */}
        {overview?.top_failures?.length > 0 && (
          <div className="card p-4">
            <h2 className="font-bold text-gray-900 mb-3">Your top recurring issues (last 30d)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {overview.top_failures.map((f, i) => (
                <div key={f.code} className={`p-3 rounded-xl text-center border ${i === 0 ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className={`text-lg font-black ${i === 0 ? 'text-red-600' : 'text-gray-700'}`}>{f.count}×</div>
                  <div className="text-xs font-mono font-bold text-gray-500">{f.code}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
