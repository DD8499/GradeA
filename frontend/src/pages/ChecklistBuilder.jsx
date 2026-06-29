import { useState, useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import api from '../lib/api'
import {
  Plus, Edit2, Trash2, Camera, Shield,
  GripVertical, ChevronDown, ChevronUp, Zap,
  CheckCircle, AlertTriangle, Eye, Save, X, Loader,
  Image, Brain, Clock, Hash
} from 'lucide-react'

const CATEGORIES = [
  { value: 'food_temperature', label: '🌡️ Food Temperature' },
  { value: 'personal_hygiene', label: '🧼 Personal Hygiene' },
  { value: 'food_handling',    label: '🥩 Food Handling' },
  { value: 'facility',        label: '🏗️ Facility & Equipment' },
  { value: 'pest_control',    label: '🐀 Pest Control' },
  { value: 'chemicals',       label: '⚗️ Chemicals' },
  { value: 'administrative',  label: '📋 Administrative' },
  { value: 'custom',          label: '📌 Custom' },
]

const VALIDATION_TYPES = [
  {
    value: 'none',
    icon: Image,
    label: 'Accept any photo',
    desc: 'Staff can upload any image from camera or gallery',
    color: 'text-gray-500',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
  },
  {
    value: 'timestamp',
    icon: Clock,
    label: 'Timestamp check',
    desc: 'Photo EXIF must be from the last 90 minutes — prevents using old photos',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    value: 'hash',
    icon: Hash,
    label: 'Duplicate detection',
    desc: 'Perceptual hash comparison — rejects photos identical to recent submissions',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  {
    value: 'ai',
    icon: Brain,
    label: 'AI content check',
    desc: 'Gemini Vision verifies the photo shows the correct subject and is a real camera photo',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  {
    value: 'strict',
    icon: Shield,
    label: 'Strict (all layers)',
    desc: 'Timestamp + duplicate detection + AI content validation. Maximum integrity.',
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
]

const EMPTY_FORM = {
  title: '',
  description: '',
  daily_checks: [''],
  category: 'custom',
  severity: 'general',
  photo_required: false,
  photo_validation: 'none',
  ai_prompt_hint: '',
  sort_order: 0,
}

export default function ChecklistBuilder() {
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]     = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [toggling, setToggling] = useState(null)

  useEffect(() => { loadItems() }, [])

  const loadItems = async () => {
    setLoading(true)
    try {
      const r = await api.get('/api/custom-checklist/?include_inactive=true')
      setItems(r.data || [])
    } finally { setLoading(false) }
  }

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setEditId(null)
    setShowForm(true)
  }

  const openEdit = (item) => {
    setForm({
      title: item.title,
      description: item.description || '',
      daily_checks: item.daily_checks?.length ? item.daily_checks : [''],
      category: item.category || 'custom',
      severity: item.severity || 'general',
      photo_required: item.photo_required || false,
      photo_validation: item.photo_validation || 'none',
      ai_prompt_hint: item.ai_prompt_hint || '',
      sort_order: item.sort_order || 0,
    })
    setEditId(item.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeForm = () => { setShowForm(false); setEditId(null) }

  const updateCheck = (idx, val) => {
    setForm(f => {
      const checks = [...f.daily_checks]
      checks[idx] = val
      return { ...f, daily_checks: checks }
    })
  }

  const addCheck = () => setForm(f => ({ ...f, daily_checks: [...f.daily_checks, ''] }))
  const removeCheck = (idx) => setForm(f => ({ ...f, daily_checks: f.daily_checks.filter((_, i) => i !== idx) }))

  const save = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        daily_checks: form.daily_checks.filter(c => c.trim()),
      }
      if (editId) {
        const r = await api.put(`/api/custom-checklist/${editId}`, payload)
        setItems(items => items.map(x => x.id === editId ? r.data : x))
      } else {
        const r = await api.post('/api/custom-checklist/', payload)
        setItems(items => [...items, r.data])
      }
      closeForm()
    } catch { alert('Failed to save. Please try again.') }
    finally { setSaving(false) }
  }

  const toggle = async (id) => {
    setToggling(id)
    try {
      const r = await api.put(`/api/custom-checklist/${id}/toggle`)
      setItems(items => items.map(x => x.id === id ? r.data : x))
    } finally { setToggling(null) }
  }

  const del = async (id) => {
    if (!confirm('Delete this checklist item? This cannot be undone.')) return
    await api.delete(`/api/custom-checklist/${id}`)
    setItems(items => items.filter(x => x.id !== id))
  }

  const activeItems   = items.filter(x => x.is_active)
  const inactiveItems = items.filter(x => !x.is_active)

  const ValidationIcon = ({ type }) => {
    const vt = VALIDATION_TYPES.find(v => v.value === type)
    if (!vt || type === 'none') return null
    const Icon = vt.icon
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${vt.bg} ${vt.color} ${vt.border}`}>
        <Icon size={10} />{vt.label}
      </span>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="page-header mb-0">
            <h1 className="page-title">My Checklists</h1>
            <p className="page-sub">Create custom inspection items specific to your kitchen</p>
          </div>
          <button onClick={openAdd} className="btn-primary">
            <Plus size={15} /> Add checklist item
          </button>
        </div>

        {/* Info banner */}
        <div className="card p-4 flex items-start gap-3 border-green-200 bg-green-50">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
            <CheckCircle size={16} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-900">Custom items appear alongside NYC DOH criteria</p>
            <p className="text-xs text-green-700 mt-0.5">Your staff will see these in the daily checklist in addition to the standard 200+ DOH items. Mark items as photo-required to enforce visual evidence.</p>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="card p-6 border-green-300 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-gray-900 text-lg">{editId ? 'Edit item' : 'New checklist item'}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={save} className="space-y-5">
              {/* Title + severity */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="label">Item title *</label>
                  <input className="input" required placeholder="e.g. Check walk-in fridge temperature"
                    value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Severity</label>
                  <select className="input" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                    <option value="critical">🔴 Critical</option>
                    <option value="general">🟡 General</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="label">Description / context (optional)</label>
                <textarea className="input" rows={2} placeholder="Why is this item important? What should staff look for?"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              {/* Category */}
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              {/* Daily check steps */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Check steps (what staff should verify)</label>
                  <button type="button" onClick={addCheck} className="text-xs text-green-600 font-semibold flex items-center gap-1 hover:text-green-700">
                    <Plus size={12} /> Add step
                  </button>
                </div>
                <div className="space-y-2">
                  {form.daily_checks.map((chk, i) => (
                    <div key={i} className="flex gap-2">
                      <input className="input flex-1" placeholder={`Step ${i + 1}...`}
                        value={chk} onChange={e => updateCheck(i, e.target.value)} />
                      {form.daily_checks.length > 1 && (
                        <button type="button" onClick={() => removeCheck(i)} className="text-gray-300 hover:text-red-400 p-1.5">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Photo required toggle */}
              <div className="card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Camera size={16} className="text-green-600" />
                      Require photo evidence
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Staff must upload a photo to complete this item</p>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={form.photo_required}
                      onChange={e => setForm(f => ({ ...f, photo_required: e.target.checked, photo_validation: e.target.checked ? 'timestamp' : 'none' }))} />
                    <div className="toggle-track" />
                    <div className="toggle-thumb" />
                  </label>
                </div>

                {/* Photo validation options */}
                {form.photo_required && (
                  <div className="space-y-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Photo validation level</p>
                    <div className="grid grid-cols-1 gap-2">
                      {VALIDATION_TYPES.map(vt => {
                        const Icon = vt.icon
                        const isSelected = form.photo_validation === vt.value
                        return (
                          <label key={vt.value} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected ? `${vt.border} ${vt.bg}` : 'border-gray-100 hover:border-gray-200'
                          }`}>
                            <input type="radio" name="photo_validation" value={vt.value} className="mt-0.5 accent-green-600"
                              checked={form.photo_validation === vt.value}
                              onChange={() => setForm(f => ({ ...f, photo_validation: vt.value }))} />
                            <div className="flex-1">
                              <div className={`flex items-center gap-2 font-semibold text-sm ${isSelected ? vt.color : 'text-gray-700'}`}>
                                <Icon size={14} />
                                {vt.label}
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">{vt.desc}</p>
                            </div>
                          </label>
                        )
                      })}
                    </div>

                    {/* AI hint */}
                    {(form.photo_validation === 'ai' || form.photo_validation === 'strict') && (
                      <div>
                        <label className="label">AI validation hint (optional but recommended)</label>
                        <input className="input" placeholder="e.g. thermometer showing temperature, handwashing sink with soap dispenser"
                          value={form.ai_prompt_hint} onChange={e => setForm(f => ({ ...f, ai_prompt_hint: e.target.value }))} />
                        <p className="text-xs text-gray-400 mt-1">Tell the AI what the photo should show. More specific = more accurate validation.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeForm} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving || !form.title.trim()} className="btn-primary flex-1">
                  {saving ? <><Loader size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> {editId ? 'Save changes' : 'Create item'}</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Active items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Active items <span className="text-gray-400 font-normal text-sm">({activeItems.length})</span></h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader size={20} className="animate-spin text-gray-400" /></div>
          ) : activeItems.length === 0 ? (
            <div className="card p-10 text-center">
              <ListChecks size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-400 mb-2">No custom items yet</p>
              <p className="text-sm text-gray-300 mb-4">Add your own inspection items specific to your kitchen's needs</p>
              <button onClick={openAdd} className="btn-primary text-sm"><Plus size={14} /> Create first item</button>
            </div>
          ) : (
            <div className="space-y-2">
              {activeItems.map(item => (
                <div key={item.id} className="card p-4 flex items-start gap-3 card-hover">
                  <div className="text-gray-200 mt-1 cursor-grab"><GripVertical size={16} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={item.severity === 'critical' ? 'badge-critical' : 'badge-general'}>
                        {item.severity}
                      </span>
                      <span className="badge-custom">{CATEGORIES.find(c=>c.value===item.category)?.label || item.category}</span>
                      {item.photo_required && <ValidationIcon type={item.photo_validation} />}
                    </div>
                    <p className="font-semibold text-sm text-gray-900">{item.title}</p>
                    {item.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>}
                    {item.daily_checks?.length > 0 && (
                      <p className="text-xs text-gray-300 mt-0.5">{item.daily_checks.length} check step{item.daily_checks.length !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => openEdit(item)} className="btn-secondary text-xs px-2.5 py-1.5"><Edit2 size={12} /></button>
                    <button onClick={() => toggle(item.id)} disabled={toggling === item.id}
                      className="btn-secondary text-xs px-2.5 py-1.5 text-amber-600">
                      {toggling === item.id ? <Loader size={12} className="animate-spin" /> : 'Disable'}
                    </button>
                    <button onClick={() => del(item.id)} className="btn-secondary text-xs px-2.5 py-1.5 text-red-400 hover:border-red-200">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inactive items */}
        {inactiveItems.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-400 mb-3 text-sm">Disabled items ({inactiveItems.length})</h2>
            <div className="space-y-2">
              {inactiveItems.map(item => (
                <div key={item.id} className="card p-3 flex items-center gap-3 opacity-50">
                  <p className="text-sm text-gray-500 flex-1 line-through">{item.title}</p>
                  <button onClick={() => toggle(item.id)} disabled={toggling === item.id} className="btn-secondary text-xs px-2.5 py-1.5 text-green-600">
                    {toggling === item.id ? <Loader size={12} className="animate-spin" /> : 'Enable'}
                  </button>
                  <button onClick={() => del(item.id)} className="text-gray-300 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

import { ListChecks } from 'lucide-react'
