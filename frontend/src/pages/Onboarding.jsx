import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { ShieldCheck, Search, Check, ChevronRight, Loader } from 'lucide-react'

const CUISINES = ['American','Italian','Chinese','Mexican','Indian','Japanese','Thai','Mediterranean','French','Seafood','Pizza','Bakery','Café','Deli','Other']
const BOROUGHS = ['Manhattan','Brooklyn','Queens','Bronx','Staten Island']
const EQUIPMENT = [
  { id: 'walk_in_fridge', label: '🧊 Walk-in Refrigerator' },
  { id: 'reach_in_fridge', label: '🥶 Reach-in Refrigerators' },
  { id: 'freezer', label: '❄️ Freezer' },
  { id: 'fryer', label: '🍟 Deep Fryer' },
  { id: 'hood_system', label: '💨 Hood/Ventilation System' },
  { id: 'dishwasher', label: '🍽️ Commercial Dishwasher' },
  { id: 'grill', label: '🔥 Grill/Broiler' },
  { id: 'steam_table', label: '♨️ Steam Table / Hot Holding' },
  { id: 'salad_bar', label: '🥗 Salad Bar / Cold Display' },
]
const GRADES = ['A','B','C','N (No Grade Yet)','First Inspection']

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep]           = useState(1)
  const [loading, setLoading]     = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError]         = useState('')
  const [searchResults, setSearchResults] = useState([])

  const [form, setForm] = useState({
    name: '', address: '', borough: 'Manhattan', cuisine_type: 'american',
    seating_capacity: 0, staff_count: 0, equipment: [],
    camis_id: '', last_grade: '', last_inspection_date: '',
  })

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleEquip = (id) => {
    setForm(f => ({
      ...f,
      equipment: f.equipment.includes(id)
        ? f.equipment.filter(e => e !== id)
        : [...f.equipment, id]
    }))
  }

  const searchNYC = async () => {
    if (!form.name) return
    setSearching(true)
    try {
      const res = await api.get(`/api/nyc/lookup?name=${encodeURIComponent(form.name)}&borough=${form.borough}`)
      setSearchResults(res.data || [])
    } catch { setSearchResults([]) }
    finally { setSearching(false) }
  }

  const fillFromNYC = (r) => {
    setForm(f => ({
      ...f,
      camis_id: r.camis_id || '',
      last_grade: r.last_grade || '',
      last_inspection_date: r.last_inspection_date ? r.last_inspection_date.slice(0,10) : '',
      address: r.address || f.address,
      cuisine_type: (r.cuisine || f.cuisine_type).toLowerCase().split(' ')[0],
    }))
    setSearchResults([])
  }

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      await api.post('/api/restaurants/', {
        ...form,
        cuisine_type: form.cuisine_type.toLowerCase(),
        seating_capacity: Number(form.seating_capacity),
        staff_count: Number(form.staff_count),
      })
      navigate('/dashboard')
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save. Please try again.')
    } finally { setLoading(false) }
  }

  const steps = [
    { n: 1, label: 'Restaurant Info' },
    { n: 2, label: 'Kitchen Setup' },
    { n: 3, label: 'Inspection History' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">
              Grade<span className="text-green-400">A</span>
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">Set up your restaurant</h2>
          <p className="text-gray-400 text-sm mt-1">Takes about 2 minutes</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 ${step === s.n ? 'text-white' : step > s.n ? 'text-green-400' : 'text-gray-600'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2
                  ${step === s.n ? 'border-green-400 bg-green-400 text-white'
                  : step > s.n ? 'border-green-400 bg-green-400/20 text-green-400'
                  : 'border-gray-700 text-gray-600'}`}>
                  {step > s.n ? <Check size={12} /> : s.n}
                </div>
                <span className="text-xs hidden sm:block">{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className="w-6 h-px bg-gray-700" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* ── STEP 1: Basic Info ── */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900">Restaurant information</h3>
              <div>
                <label className="label">Restaurant name *</label>
                <input className="input" placeholder="My Restaurant" value={form.name}
                  onChange={e => update('name', e.target.value)} />
              </div>
              <div>
                <label className="label">Address</label>
                <input className="input" placeholder="123 Main St" value={form.address}
                  onChange={e => update('address', e.target.value)} />
              </div>
              <div>
                <label className="label">Borough *</label>
                <select className="input" value={form.borough} onChange={e => update('borough', e.target.value)}>
                  {BOROUGHS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Cuisine type *</label>
                <select className="input" value={form.cuisine_type}
                  onChange={e => update('cuisine_type', e.target.value.toLowerCase())}>
                  {CUISINES.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Seating capacity</label>
                  <input type="number" min="0" className="input" value={form.seating_capacity}
                    onChange={e => update('seating_capacity', e.target.value)} />
                </div>
                <div>
                  <label className="label">Staff count</label>
                  <input type="number" min="0" className="input" value={form.staff_count}
                    onChange={e => update('staff_count', e.target.value)} />
                </div>
              </div>
              <button disabled={!form.name} onClick={() => setStep(2)} className="btn-primary w-full">
                Next: Kitchen setup <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── STEP 2: Equipment ── */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900">Kitchen equipment</h3>
              <p className="text-sm text-gray-500">Select all equipment in your kitchen. This personalizes your daily checklist.</p>
              <div className="grid grid-cols-1 gap-2">
                {EQUIPMENT.map(eq => (
                  <button key={eq.id}
                    onClick={() => toggleEquip(eq.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm text-left transition-all
                      ${form.equipment.includes(eq.id)
                        ? 'border-green-500 bg-green-50 text-green-800'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                      ${form.equipment.includes(eq.id) ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                      {form.equipment.includes(eq.id) && <Check size={10} className="text-white" />}
                    </div>
                    {eq.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                <button onClick={() => setStep(3)} className="btn-primary flex-1">
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Inspection History ── */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900">Inspection history</h3>
              <p className="text-sm text-gray-500">
                Search the NYC DOH database to auto-fill your last inspection grade and re-inspection date.
              </p>

              {/* NYC Search */}
              <div className="flex gap-2">
                <input className="input flex-1" placeholder={form.name || 'Search restaurant name…'}
                  value={form.name} onChange={e => update('name', e.target.value)} />
                <button onClick={searchNYC} disabled={searching} className="btn-secondary shrink-0">
                  {searching ? <Loader size={16} className="animate-spin" /> : <Search size={16} />}
                  {searching ? 'Searching…' : 'Lookup'}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {searchResults.map(r => (
                    <button key={r.camis_id} onClick={() => fillFromNYC(r)}
                      className="w-full px-3 py-2.5 text-left hover:bg-gray-50 text-sm">
                      <div className="font-medium text-gray-900">{r.name}</div>
                      <div className="text-gray-400 text-xs">{r.address} · {r.borough}</div>
                      {r.last_grade && <div className="text-xs mt-0.5 text-green-700">Last grade: {r.last_grade}</div>}
                    </button>
                  ))}
                </div>
              )}

              <div className="text-xs text-gray-400 text-center">— or enter manually —</div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Last DOH grade</label>
                  <select className="input" value={form.last_grade} onChange={e => update('last_grade', e.target.value)}>
                    <option value="">Unknown</option>
                    {GRADES.map(g => <option key={g} value={g[0]}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Last inspection date</label>
                  <input type="date" className="input" value={form.last_inspection_date}
                    onChange={e => update('last_inspection_date', e.target.value)} />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
                <button onClick={submit} disabled={loading || !form.name} className="btn-primary flex-1">
                  {loading ? <><Loader size={14} className="animate-spin" /> Saving…</> : '🚀 Launch GradeA'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
