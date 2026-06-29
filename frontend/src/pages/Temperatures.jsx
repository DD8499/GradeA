import { useState, useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import api from '../lib/api'
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { Plus, Thermometer, AlertCircle, Trash2, Loader, X } from 'lucide-react'

const COMMON_ITEMS = [
  'Walk-in Refrigerator','Reach-in Refrigerator','Freezer',
  'Hot Holding','Raw Poultry','Raw Beef/Pork','Fish Storage',
  'Cooked Chicken (cook)','Ground Beef (cook)','Fish/Pork (cook)',
]

export default function Temperatures() {
  const [logs, setLogs]           = useState([])
  const [ranges, setRanges]       = useState({})
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState({ item_name:'', temp_value:'', unit:'F', logged_by:'', notes:'' })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [logsRes, rangesRes] = await Promise.all([
        api.get('/api/temperatures?limit=100'),
        api.get('/api/temperatures/ranges').catch(() => ({ data: {} })),
      ])
      setLogs(logsRes.data || [])
      setRanges(rangesRes.data || {})
    } finally { setLoading(false) }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.item_name || !form.temp_value) return
    setSaving(true)
    try {
      await api.post('/api/temperatures/', {
        item_name: form.item_name,
        temp_value: parseFloat(form.temp_value),
        unit: form.unit,
        logged_by: form.logged_by || 'Staff',
        notes: form.notes,
      })
      setForm({ item_name:'', temp_value:'', unit:'F', logged_by:'', notes:'' })
      setShowForm(false)
      loadData()
    } catch { alert('Failed to save. Try again.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this log entry?')) return
    await api.delete(`/api/temperatures/${id}`)
    setLogs(l => l.filter(x => x.id !== id))
  }

  const violations = logs.filter(l => l.is_violation)

  // Chart data: last 20 walk-in fridge readings
  const chartLogs = logs
    .filter(l => l.item_name?.toLowerCase().includes('fridge') || l.item_name?.toLowerCase().includes('refrigerator'))
    .slice(0, 20).reverse()
    .map(l => ({
      time: new Date(l.logged_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      temp: l.temp_value,
      violation: l.is_violation,
    }))

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Temperature Log</h1>
            <p className="text-sm text-gray-400 mt-0.5">NYC DOH requires food temps logged and in safe range</p>
          </div>
          <button onClick={() => setShowForm(s => !s)} className="btn-primary">
            <Plus size={16} /> Log temperature
          </button>
        </div>

        {/* Alert banner */}
        {violations.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800">
                {violations.length} temperature violation{violations.length > 1 ? 's' : ''} in recent logs
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                Fix these before your next inspection — inspectors check your logs.
              </p>
            </div>
          </div>
        )}

        {/* Log form modal */}
        {showForm && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Log a temperature</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="label">Item / Location *</label>
                <input
                  list="items-list" className="input" required
                  placeholder="e.g. Walk-in Refrigerator"
                  value={form.item_name}
                  onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))}
                />
                <datalist id="items-list">
                  {COMMON_ITEMS.map(i => <option key={i} value={i} />)}
                </datalist>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="label">Temperature *</label>
                  <input type="number" step="0.1" className="input" required
                    placeholder="e.g. 38.5"
                    value={form.temp_value}
                    onChange={e => setForm(f => ({ ...f, temp_value: e.target.value }))}
                  />
                </div>
                <div className="w-20">
                  <label className="label">Unit</label>
                  <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                    <option value="F">°F</option>
                    <option value="C">°C</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Logged by</label>
                <input className="input" placeholder="Staff name (optional)"
                  value={form.logged_by} onChange={e => setForm(f => ({ ...f, logged_by: e.target.value }))} />
              </div>
              <div>
                <label className="label">Notes</label>
                <input className="input" placeholder="Any notes (optional)"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
                  {saving ? 'Saving…' : 'Save log'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Safe ranges reference */}
        <div className="card p-4">
          <h2 className="font-bold text-gray-900 mb-3">NYC DOH safe temperature ranges</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: 'Refrigerator', range: '≤ 41°F', type: 'cold' },
              { label: 'Freezer', range: '≤ 0°F', type: 'cold' },
              { label: 'Hot Holding', range: '≥ 140°F', type: 'hot' },
              { label: 'Cooked Poultry', range: '≥ 165°F', type: 'cook' },
              { label: 'Ground Beef', range: '≥ 155°F', type: 'cook' },
              { label: 'Fish/Pork', range: '≥ 145°F', type: 'cook' },
            ].map(r => (
              <div key={r.label} className={`rounded-lg px-3 py-2 text-xs ${
                r.type === 'cold' ? 'bg-blue-50 text-blue-800' :
                r.type === 'hot'  ? 'bg-red-50 text-red-800' :
                'bg-amber-50 text-amber-800'
              }`}>
                <div className="font-semibold">{r.label}</div>
                <div className="font-bold text-base mt-0.5">{r.range}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Fridge temp chart */}
        {chartLogs.length > 1 && (
          <div className="card p-4">
            <h2 className="font-bold text-gray-900 mb-3">Refrigerator temperature trend</h2>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartLogs}>
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis domain={[30, 50]} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => [`${v}°F`, 'Temp']} />
                  <ReferenceLine y={41} stroke="#DC2626" strokeDasharray="4 2" label={{ value: '41°F limit', fontSize: 10, fill: '#DC2626' }} />
                  <Line type="monotone" dataKey="temp" stroke="#16A34A" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Log table */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Recent logs</h2>
            <span className="text-xs text-gray-400">{logs.length} entries</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><Loader size={20} className="animate-spin text-gray-400" /></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10">
              <Thermometer size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No temperatures logged yet.</p>
              <button onClick={() => setShowForm(true)} className="btn-primary mt-3 text-xs">Log first reading</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {logs.map(log => (
                <div key={log.id} className={`flex items-center gap-3 px-4 py-3 ${log.is_violation ? 'bg-red-50' : ''}`}>
                  <Thermometer size={16} className={log.is_violation ? 'text-red-500' : 'text-gray-400'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{log.item_name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.logged_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {log.logged_by && ` · ${log.logged_by}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-black text-lg ${log.is_violation ? 'text-red-600' : 'text-gray-900'}`}>
                      {log.temp_value}°{log.unit}
                    </p>
                    {log.is_violation && (
                      <span className="text-xs text-red-600 font-semibold">⚠ Violation</span>
                    )}
                  </div>
                  <button onClick={() => handleDelete(log.id)} className="text-gray-300 hover:text-red-400 transition-colors ml-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
