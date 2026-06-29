// ═══════════════════════════════════════════════
// AI CHATBOT
// ═══════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react'
import AppLayout from '../components/AppLayout'
import api from '../lib/api'
import { Send, Trash2, Loader, Bot, User, Zap } from 'lucide-react'

const STARTERS = [
  "What temperature should my walk-in fridge be?",
  "What happens if I get a C grade?",
  "How do I fix a cross-contamination violation (04H)?",
  "When is my next DOH inspection likely?",
  "What are the most common violations for my cuisine?",
  "How do I properly cool down a large batch of soup?",
  "What's required for Food Protection Certification in NYC?",
]

export function AIChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const bottomRef               = useRef(null)

  useEffect(() => {
    api.get('/api/chat/history').then(r => setMessages(r.data || [])).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg || sending) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: msg, created_at: new Date().toISOString() }])
    setSending(true)
    try {
      const r = await api.post('/api/chat/message', { message: msg })
      setMessages(m => [...m, { role: 'assistant', content: r.data.reply, created_at: new Date().toISOString() }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', created_at: new Date().toISOString() }])
    } finally { setSending(false) }
  }

  const clearHistory = async () => {
    if (!confirm('Clear chat history?')) return
    await api.delete('/api/chat/history')
    setMessages([])
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-screen max-h-screen">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-gray-900">GradeA AI Assistant</h1>
              <p className="text-xs text-gray-400">Ask anything about NYC DOH compliance</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={clearHistory} className="btn-secondary text-xs">
              <Trash2 size={12} /> Clear history
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
          {loading ? (
            <div className="flex justify-center py-12"><Loader size={20} className="animate-spin text-gray-400" /></div>
          ) : messages.length === 0 ? (
            <div className="max-w-xl mx-auto">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Bot size={28} className="text-green-600" />
                </div>
                <h2 className="font-bold text-gray-900 mb-1">NYC DOH Compliance Expert</h2>
                <p className="text-sm text-gray-400">Ask me anything about food safety, violations, inspections, or NYC regulations.</p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {STARTERS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="text-left text-sm bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-green-400 hover:bg-green-50 transition-colors text-gray-700">
                    <Zap size={12} className="inline mr-2 text-green-500" />{s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 max-w-2xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'assistant' ? 'bg-green-600' : 'bg-gray-200'
                }`}>
                  {msg.role === 'assistant'
                    ? <Bot size={14} className="text-white" />
                    : <User size={14} className="text-gray-600" />
                  }
                </div>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[80%] ${
                  msg.role === 'assistant'
                    ? 'bg-white border border-gray-200 text-gray-800'
                    : 'bg-green-600 text-white'
                }`}>
                  {msg.content.split('\n').map((line, j) => <p key={j} className={j > 0 ? 'mt-1' : ''}>{line}</p>)}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex gap-3 max-w-2xl mx-auto">
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex gap-1.5 items-center">
                {[0,1,2].map(i => (
                  <span key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white shrink-0">
          <div className="max-w-2xl mx-auto flex gap-2">
            <input
              className="input flex-1"
              placeholder="Ask about violations, food safety, inspections…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              disabled={sending}
            />
            <button onClick={() => send()} disabled={!input.trim() || sending} className="btn-primary px-4">
              {sending ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default AIChat


// ═══════════════════════════════════════════════
// CORRECTIVE ACTIONS
// ═══════════════════════════════════════════════
export function CorrectiveActions() {
  const [actions, setActions]   = useState([])
  const [filter, setFilter]     = useState('open')
  const [loading, setLoading]   = useState(true)
  const [showForm, setForm]     = useState(false)
  const [form, setF] = useState({ title:'', description:'', violation_code:'', severity:'general', assigned_to:'', due_date:'', source:'manual' })

  const load = async () => {
    setLoading(true)
    const r = await api.get(`/api/corrective/${filter !== 'all' ? `?status=${filter}` : ''}`)
    setActions(r.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  const save = async (e) => {
    e.preventDefault()
    const r = await api.post('/api/corrective/', form)
    setActions(a => [r.data, ...a])
    setForm(false)
  }

  const updateStatus = async (id, status) => {
    await api.put(`/api/corrective/${id}`, { status })
    setActions(a => a.map(x => x.id === id ? { ...x, status } : x))
  }

  const STATUS_COLORS = {
    open: 'bg-red-100 text-red-700',
    in_progress: 'bg-amber-100 text-amber-700',
    resolved: 'bg-green-100 text-green-700',
    wont_fix: 'bg-gray-100 text-gray-500',
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Corrective Actions</h1>
            <p className="text-sm text-gray-400 mt-0.5">Track and resolve inspection violations</p>
          </div>
          <button onClick={() => setForm(s => !s)} className="btn-primary">+ New Action</button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {['open','in_progress','resolved','all'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${filter === s ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
              {s.replace('_',' ')}
            </button>
          ))}
        </div>

        {showForm && (
          <div className="card p-5">
            <form onSubmit={save} className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Title *</label>
                <input className="input" required value={form.title} placeholder="e.g. Fix walk-in fridge temperature"
                  onChange={e => setF(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="label">Violation code</label>
                <input className="input" value={form.violation_code} placeholder="e.g. 04C"
                  onChange={e => setF(f => ({ ...f, violation_code: e.target.value }))} />
              </div>
              <div>
                <label className="label">Severity</label>
                <select className="input" value={form.severity} onChange={e => setF(f => ({ ...f, severity: e.target.value }))}>
                  <option value="critical">Critical</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div>
                <label className="label">Assign to</label>
                <input className="input" value={form.assigned_to} placeholder="Staff member name"
                  onChange={e => setF(f => ({ ...f, assigned_to: e.target.value }))} />
              </div>
              <div>
                <label className="label">Due date</label>
                <input type="date" className="input" value={form.due_date}
                  onChange={e => setF(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div className="col-span-2 flex gap-2">
                <button type="button" onClick={() => setForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Create action</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader size={20} className="animate-spin text-gray-400" /></div>
        ) : actions.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-gray-400">No {filter !== 'all' ? filter.replace('_',' ') : ''} actions</p>
          </div>
        ) : (
          <div className="space-y-2">
            {actions.map(a => (
              <div key={a.id} className={`card p-4 ${a.severity === 'critical' && a.status === 'open' ? 'border-red-200' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {a.violation_code && <span className="text-xs font-mono font-bold bg-gray-100 px-1.5 py-0.5 rounded">{a.violation_code}</span>}
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[a.status]}`}>{a.status.replace('_',' ')}</span>
                      {a.assigned_to && <span className="text-xs text-gray-400">→ {a.assigned_to}</span>}
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                    {a.due_date && <p className="text-xs text-gray-400 mt-0.5">Due: {a.due_date}</p>}
                  </div>
                  {a.status !== 'resolved' && (
                    <select className="input text-xs w-36 shrink-0"
                      value={a.status} onChange={e => updateStatus(a.id, e.target.value)}>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="wont_fix">Won't Fix</option>
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}


// ═══════════════════════════════════════════════
// INSPECTOR VISIT LOG
// ═══════════════════════════════════════════════
export function InspectorVisit() {
  const [visits, setVisits]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setForm]   = useState(false)
  const [form, setF] = useState({ visit_date: new Date().toISOString().slice(0,10), inspector_name:'', inspection_type:'routine', grade_received:'', score:'', violations_found:[], notes:'' })

  useEffect(() => {
    api.get('/api/visits/').then(r => setVisits(r.data || [])).finally(() => setLoading(false))
  }, [])

  const save = async (e) => {
    e.preventDefault()
    const r = await api.post('/api/visits/', { ...form, score: form.score ? parseInt(form.score) : null })
    setVisits(v => [r.data, ...v])
    setForm(false)
  }

  const GRADE_COLOR = { A: 'text-green-600 bg-green-50', B: 'text-amber-600 bg-amber-50', C: 'text-red-600 bg-red-50' }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Inspector Visit Log</h1>
            <p className="text-sm text-gray-400 mt-0.5">Record actual DOH inspection results</p>
          </div>
          <button onClick={() => setForm(s => !s)} className="btn-primary">+ Log Visit</button>
        </div>

        {showForm && (
          <div className="card p-5">
            <form onSubmit={save} className="grid grid-cols-2 gap-3">
              <div><label className="label">Visit date *</label><input type="date" className="input" required value={form.visit_date} onChange={e => setF(f => ({ ...f, visit_date: e.target.value }))} /></div>
              <div>
                <label className="label">Inspection type</label>
                <select className="input" value={form.inspection_type} onChange={e => setF(f => ({ ...f, inspection_type: e.target.value }))}>
                  {['routine','reinspection','complaint','monitoring'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div><label className="label">Inspector name</label><input className="input" value={form.inspector_name} onChange={e => setF(f => ({ ...f, inspector_name: e.target.value }))} /></div>
              <div><label className="label">Grade received</label><select className="input" value={form.grade_received} onChange={e => setF(f => ({ ...f, grade_received: e.target.value }))}><option value="">--</option>{['A','B','C','N','Z'].map(g => <option key={g} value={g}>{g}</option>)}</select></div>
              <div><label className="label">Score (points)</label><input type="number" className="input" value={form.score} placeholder="e.g. 8" onChange={e => setF(f => ({ ...f, score: e.target.value }))} /></div>
              <div><label className="label">Notes</label><input className="input" value={form.notes} onChange={e => setF(f => ({ ...f, notes: e.target.value }))} /></div>
              <div className="col-span-2 flex gap-2">
                <button type="button" onClick={() => setForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Save visit</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader size={20} className="animate-spin text-gray-400" /></div>
        ) : visits.length === 0 ? (
          <div className="card p-10 text-center"><p className="text-gray-400">No visits logged yet</p></div>
        ) : (
          <div className="space-y-3">
            {visits.map(v => (
              <div key={v.id} className="card p-4 flex items-center gap-4">
                {v.grade_received && (
                  <div className={`text-3xl font-black w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${GRADE_COLOR[v.grade_received] || 'text-gray-600 bg-gray-50'}`}>
                    {v.grade_received}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{v.visit_date}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{v.inspection_type}</span>
                    {v.score !== null && <span className="text-xs text-gray-400">Score: {v.score} pts</span>}
                  </div>
                  {v.inspector_name && <p className="text-sm text-gray-400 mt-0.5">Inspector: {v.inspector_name}</p>}
                  {v.total_violations > 0 && <p className="text-sm text-red-600 font-medium mt-0.5">{v.total_violations} violations ({v.critical_violations} critical)</p>}
                  {v.notes && <p className="text-xs text-gray-400 mt-1">{v.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
