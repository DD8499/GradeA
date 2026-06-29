import { useState, useEffect, useRef, useCallback } from 'react'
import AppLayout from '../components/AppLayout'
import { LiveGauge } from '../components/LiveGauge'
import api from '../lib/api'
import { Plus, Wifi, WifiOff, Zap, Trash2, Settings, Copy, Check, Loader, Activity } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const WS_BASE  = API_BASE.replace(/^http/, 'ws')

const SENSOR_TYPES = ['temperature', 'humidity', 'door']
const SAFE_PRESETS = {
  'Walk-in Refrigerator': { min_safe: null, max_safe: 41.0 },
  'Walk-in Freezer':      { min_safe: null, max_safe: 0.0  },
  'Reach-in Refrigerator':{ min_safe: null, max_safe: 41.0 },
  'Hot Holding':          { min_safe: 140.0, max_safe: null },
  'Prep Station':         { min_safe: null, max_safe: 41.0 },
  'Custom':               { min_safe: null, max_safe: null  },
}

export default function SensorDashboard() {
  const [sensors, setSensors]     = useState([])
  const [liveData, setLiveData]   = useState({})   // { sensor_id: latest reading }
  const [wsStatus, setWsStatus]   = useState('connecting')
  const [showForm, setShowForm]   = useState(false)
  const [copiedKey, setCopied]    = useState(null)
  const [loading, setLoading]     = useState(true)
  const [restaurantId, setRid]    = useState(null)
  const wsRef                     = useRef(null)

  const [form, setForm] = useState({
    name: 'Walk-in Refrigerator', location: 'Kitchen',
    sensor_type: 'temperature', min_safe: '', max_safe: 41.0, alert_enabled: true,
  })

  // Load sensors + restaurant ID
  useEffect(() => {
    const init = async () => {
      try {
        const [sensorsRes, restaurantRes, summaryRes] = await Promise.all([
          api.get('/api/sensors/'),
          api.get('/api/restaurants/me'),
          api.get('/api/analytics/sensor-summary').catch(() => ({ data: [] })),
        ])
        setSensors(sensorsRes.data || [])
        setRid(restaurantRes.data?.id)

        // Seed live data with last known values from analytics
        const initial = {}
        for (const s of (summaryRes.data || [])) {
          if (s.latest_value !== null) {
            initial[s.id] = {
              value: s.latest_value,
              unit: 'F',
              is_violation: false,
              timestamp: s.latest_at,
              trend: s.trend || [],
            }
          }
        }
        setLiveData(initial)
      } catch (e) {
        console.error('Failed to load sensors:', e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // WebSocket connection for live data
  useEffect(() => {
    if (!restaurantId) return
    let reconnectTimer = null

    const connect = () => {
      const ws = new WebSocket(`${WS_BASE}/api/sensors/ws/${restaurantId}`)
      wsRef.current = ws

      ws.onopen = () => {
        setWsStatus('connected')
        // Ping every 30s to keep alive
        const ping = setInterval(() => ws.readyState === 1 && ws.send('ping'), 30000)
        ws._ping = ping
      }

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'reading' && msg.data) {
            const d = msg.data
            setLiveData(prev => ({
              ...prev,
              [d.sensor_id]: {
                value: d.value,
                unit: d.unit,
                is_violation: d.is_violation,
                timestamp: d.timestamp,
                trend: [...(prev[d.sensor_id]?.trend || []).slice(-19), { value: d.value, time: d.timestamp }],
              }
            }))
          }
          if (msg.type === 'init' && msg.data) {
            const mapped = {}
            Object.entries(msg.data).forEach(([sid, d]) => {
              mapped[sid] = { value: d.value, unit: d.unit, is_violation: d.is_violation, timestamp: d.timestamp }
            })
            setLiveData(prev => ({ ...mapped, ...prev }))
          }
        } catch {}
      }

      ws.onerror = () => setWsStatus('error')

      ws.onclose = () => {
        setWsStatus('disconnected')
        clearInterval(ws._ping)
        reconnectTimer = setTimeout(connect, 5000)
      }
    }

    connect()
    return () => {
      clearTimeout(reconnectTimer)
      wsRef.current?.close()
    }
  }, [restaurantId])

  const handlePreset = (preset) => {
    const p = SAFE_PRESETS[preset]
    if (p) setForm(f => ({ ...f, name: preset === 'Custom' ? f.name : preset, ...p }))
  }

  const addSensor = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post('/api/sensors/', {
        ...form,
        min_safe: form.min_safe ? parseFloat(form.min_safe) : null,
        max_safe: form.max_safe ? parseFloat(form.max_safe) : null,
      })
      setSensors(s => [...s, res.data])
      setShowForm(false)
      setForm({ name: 'Walk-in Refrigerator', location: 'Kitchen', sensor_type: 'temperature', min_safe: '', max_safe: 41.0, alert_enabled: true })
    } catch { alert('Failed to register sensor') }
  }

  const deleteSensor = async (id) => {
    if (!confirm('Delete this sensor? All readings will be lost.')) return
    await api.delete(`/api/sensors/${id}`)
    setSensors(s => s.filter(x => x.id !== id))
  }

  const copyApiKey = (key, id) => {
    navigator.clipboard.writeText(key)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const violations = sensors.filter(s => liveData[s.id]?.is_violation)

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Live Sensor Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">Real-time temperature monitoring from IoT sensors</p>
          </div>
          <div className="flex items-center gap-2">
            {/* WebSocket status */}
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full ${
              wsStatus === 'connected' ? 'bg-green-50 text-green-700' :
              wsStatus === 'connecting' ? 'bg-blue-50 text-blue-700' :
              'bg-red-50 text-red-700'
            }`}>
              {wsStatus === 'connected'
                ? <><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Live</>
                : wsStatus === 'connecting'
                ? <><Loader size={10} className="animate-spin" /> Connecting…</>
                : <><WifiOff size={12} /> Offline</>
              }
            </div>
            <button onClick={() => setShowForm(s => !s)} className="btn-primary">
              <Plus size={15} /> Add Sensor
            </button>
          </div>
        </div>

        {/* Violation alert */}
        {violations.length > 0 && (
          <div className="bg-red-600 text-white rounded-xl px-4 py-3 flex items-center gap-3 animate-pulse">
            <Activity size={20} />
            <div>
              <p className="font-bold">{violations.length} TEMPERATURE VIOLATION{violations.length > 1 ? 'S' : ''} — FIX NOW</p>
              <p className="text-red-100 text-sm">{violations.map(v => v.name).join(', ')}</p>
            </div>
          </div>
        )}

        {/* Add sensor form */}
        {showForm && (
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4">Register New Sensor</h2>
            <div className="mb-3">
              <label className="label">Quick preset</label>
              <div className="flex gap-2 flex-wrap">
                {Object.keys(SAFE_PRESETS).map(p => (
                  <button key={p} onClick={() => handlePreset(p)}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <form onSubmit={addSensor} className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="label">Sensor name *</label>
                <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="label">Physical location</label>
                <input className="input" placeholder="e.g. Back kitchen, left side" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div>
                <label className="label">Min safe temp (°F)</label>
                <input type="number" step="0.1" className="input" placeholder="e.g. 140 for hot holding"
                  value={form.min_safe} onChange={e => setForm(f => ({ ...f, min_safe: e.target.value }))} />
              </div>
              <div>
                <label className="label">Max safe temp (°F)</label>
                <input type="number" step="0.1" className="input" placeholder="e.g. 41 for fridge"
                  value={form.max_safe} onChange={e => setForm(f => ({ ...f, max_safe: e.target.value }))} />
              </div>
              <div className="col-span-2 flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1"><Zap size={14} /> Register Sensor</button>
              </div>
            </form>
          </div>
        )}

        {/* Live gauges */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader size={24} className="animate-spin text-gray-400" /></div>
        ) : sensors.length === 0 ? (
          <div className="card p-12 text-center">
            <Wifi size={40} className="text-gray-300 mx-auto mb-4" />
            <h2 className="font-bold text-gray-900 mb-2">No sensors registered yet</h2>
            <p className="text-sm text-gray-400 mb-4 max-w-xs mx-auto">
              Register your first sensor, then flash the ESP32 firmware with its API key.
            </p>
            <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={14} /> Add first sensor</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {sensors.map(sensor => {
              const live = liveData[sensor.id]
              return (
                <div key={sensor.id} className={`card p-4 flex flex-col items-center gap-2 relative group ${live?.is_violation ? 'border-red-300 bg-red-50' : ''}`}>
                  <LiveGauge
                    value={live?.value ?? null}
                    unit={live?.unit || 'F'}
                    minSafe={sensor.min_safe}
                    maxSafe={sensor.max_safe}
                    name={sensor.name}
                    lastUpdated={live?.timestamp || sensor.last_seen_at}
                    isViolation={live?.is_violation}
                  />
                  {sensor.battery_pct !== null && sensor.battery_pct !== undefined && (
                    <div className={`text-xs font-medium ${sensor.battery_pct < 20 ? 'text-red-500' : 'text-gray-400'}`}>
                      🔋 {sensor.battery_pct}%
                    </div>
                  )}
                  {/* Actions on hover */}
                  <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                    <button title="Copy API key" onClick={() => copyApiKey(sensor.api_key, sensor.id)}
                      className="w-7 h-7 bg-white shadow rounded-md flex items-center justify-center text-gray-500 hover:text-green-600">
                      {copiedKey === sensor.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                    </button>
                    <button title="Delete sensor" onClick={() => deleteSensor(sensor.id)}
                      className="w-7 h-7 bg-white shadow rounded-md flex items-center justify-center text-gray-500 hover:text-red-600">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Firmware instructions */}
        {sensors.length > 0 && (
          <div className="card p-5 bg-gray-950 border-gray-800">
            <h2 className="font-bold text-white mb-2 flex items-center gap-2">
              <Zap size={16} className="text-green-400" /> Hardware Setup Guide
            </h2>
            <p className="text-gray-400 text-sm mb-3">
              Flash <code className="text-green-400">firmware/esp32_gradea.ino</code> to your ESP32. Fill in your WiFi credentials and paste the sensor's API key below.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sensors.map(s => (
                <div key={s.id} className="bg-gray-900 rounded-lg p-3">
                  <p className="text-white text-sm font-semibold mb-1">{s.name}</p>
                  <div className="flex items-center gap-2">
                    <code className="text-green-400 text-xs flex-1 truncate font-mono">{s.api_key}</code>
                    <button onClick={() => copyApiKey(s.api_key, s.id)} className="text-gray-500 hover:text-white shrink-0">
                      {copiedKey === s.id ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-gray-600 text-xs mt-3">
              Parts: ESP32 DevKit (~$5) + DS18B20 probe (~$4) + 4.7kΩ resistor. Total ~$9.
              See <code className="text-gray-400">firmware/esp32_gradea.ino</code> for wiring diagram.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
