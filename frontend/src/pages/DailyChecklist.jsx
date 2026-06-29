import { useState, useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import api from '../lib/api'
import { Check, X, Minus, ChevronDown, ChevronUp, Save, Loader, RefreshCw } from 'lucide-react'

const STATUS_CONFIG = {
  pass: { label: 'Pass', icon: Check,  cls: 'bg-green-500 text-white', ring: 'ring-green-400' },
  fail: { label: 'Fail', icon: X,      cls: 'bg-red-500 text-white',   ring: 'ring-red-400'   },
  na:   { label: 'N/A',  icon: Minus,  cls: 'bg-gray-300 text-white',  ring: 'ring-gray-300'  },
}

export default function DailyChecklist() {
  const [categories, setCategories] = useState([])
  const [answers, setAnswers]       = useState({})
  const [open, setOpen]             = useState({})
  const [totalItems, setTotalItems] = useState(0)
  const [existing, setExisting]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [itemsRes, todayRes] = await Promise.all([
        api.get('/api/checklists/items'),
        api.get('/api/checklists/today').catch(() => ({ data: null })),
      ])
      setCategories(itemsRes.data.categories || [])
      setTotalItems(itemsRes.data.total_items || 0)

      // Pre-fill open categories
      const openState = {}
      itemsRes.data.categories?.forEach((_, i) => { if (i === 0) openState[i] = true })
      setOpen(openState)

      if (todayRes.data?.checklist_data) {
        setAnswers(todayRes.data.checklist_data)
        setExisting(todayRes.data)
      }
    } finally { setLoading(false) }
  }

  const setAnswer = (code, status) => {
    setAnswers(a => ({ ...a, [code]: { ...a[code], status } }))
    setSaved(false)
  }

  const setNote = (code, note) => {
    setAnswers(a => ({ ...a, [code]: { ...a[code], note } }))
  }

  const submit = async () => {
    setSaving(true)
    try {
      await api.post('/api/checklists/submit', {
        submitted_by: 'Owner',
        checklist_data: answers,
      })
      setSaved(true)
      await loadData()
    } catch (e) {
      alert('Failed to save checklist. Please try again.')
    } finally { setSaving(false) }
  }

  // Counts
  const answered = Object.values(answers)
  const passed   = answered.filter(a => a.status === 'pass').length
  const failed   = answered.filter(a => a.status === 'fail').length
  const score    = answered.length > 0 ? Math.round(passed / answered.length * 100) : 0

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-96">
        <Loader size={24} className="animate-spin text-green-600" />
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Daily Checklist</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button onClick={loadData} className="btn-secondary text-xs">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Progress bar */}
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Today's progress</span>
            <span className="text-sm font-bold text-gray-900">{answered.length}/{totalItems} answered</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-2 bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${totalItems > 0 ? answered.length / totalItems * 100 : 0}%` }}
            />
          </div>
          <div className="flex gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1 text-green-700 font-medium">
              <Check size={12} className="text-green-600" /> {passed} passed
            </span>
            <span className="flex items-center gap-1 text-red-700 font-medium">
              <X size={12} className="text-red-600" /> {failed} failed
            </span>
            <span className="ml-auto font-bold text-gray-700">Score: {score}/100</span>
          </div>
        </div>

        {/* Already submitted today */}
        {existing && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 text-sm text-blue-800">
            ✅ Checklist submitted today at {new Date(existing.submitted_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} by {existing.submitted_by}.
            Score: <strong>{existing.score}/100</strong>.
          </div>
        )}

        {/* Categories */}
        <div className="space-y-3">
          {categories.map((cat, ci) => {
            const catAnswered = cat.items.filter(item => answers[item.code]?.status).length
            const catFailed   = cat.items.filter(item => answers[item.code]?.status === 'fail').length
            const isOpen      = open[ci]

            return (
              <div key={cat.category} className="card overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setOpen(o => ({ ...o, [ci]: !o[ci] }))}
                >
                  <span className="text-base">{cat.label.split(' ')[0]}</span>
                  <span className="font-semibold text-sm text-gray-800 flex-1 text-left">
                    {cat.label.split(' ').slice(1).join(' ')}
                  </span>
                  <span className="text-xs text-gray-400">{catAnswered}/{cat.items.length}</span>
                  {catFailed > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                      {catFailed} ✗
                    </span>
                  )}
                  {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {cat.items.map(item => {
                      const answer = answers[item.code] || {}
                      const status = answer.status

                      return (
                        <div key={item.code} className={`p-4 ${status === 'fail' ? 'bg-red-50' : ''}`}>
                          <div className="flex items-start gap-3">
                            <span className={`mt-0.5 shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${
                              item.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {item.code}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                              <div className="mt-2 space-y-1">
                                {item.daily_checks.map((chk, i) => (
                                  <p key={i} className="text-xs text-gray-500 flex gap-1.5">
                                    <span className="text-gray-300 shrink-0">›</span>
                                    {chk}
                                  </p>
                                ))}
                              </div>
                              {status === 'fail' && (
                                <input
                                  className="input mt-2 text-xs"
                                  placeholder="Note what needs fixing (optional)…"
                                  value={answer.note || ''}
                                  onChange={e => setNote(item.code, e.target.value)}
                                />
                              )}
                            </div>
                            {/* Pass / Fail / N/A buttons */}
                            <div className="flex gap-1 shrink-0">
                              {Object.entries(STATUS_CONFIG).map(([s, cfg]) => {
                                const Icon = cfg.icon
                                return (
                                  <button
                                    key={s}
                                    onClick={() => setAnswer(item.code, s)}
                                    title={cfg.label}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all text-sm
                                      ${status === s ? cfg.cls + ' ring-2 ' + cfg.ring : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                  >
                                    <Icon size={14} />
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Submit */}
        <div className="mt-6 flex gap-3 sticky bottom-6">
          <button
            onClick={submit}
            disabled={saving || answered.length === 0}
            className="btn-primary flex-1 py-3 text-base"
          >
            {saving
              ? <><Loader size={16} className="animate-spin" /> Saving…</>
              : saved
              ? <><Check size={16} /> Saved!</>
              : <><Save size={16} /> Save checklist</>
            }
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
