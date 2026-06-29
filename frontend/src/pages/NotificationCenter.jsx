// ═══════════════════════════════════════════════
// NOTIFICATION CENTER
// ═══════════════════════════════════════════════
import { useState, useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import api from '../lib/api'
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, Thermometer, FileText, Calendar, Loader, X } from 'lucide-react'

const TYPE_CONFIG = {
  temp_alert:       { icon: Thermometer,   color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
  checklist_fail:   { icon: AlertTriangle, color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  cert_expiry:      { icon: FileText,      color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  doc_expiry:       { icon: FileText,      color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  inspection_due:   { icon: Calendar,      color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  corrective:       { icon: AlertTriangle, color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200' },
}

export function NotificationCenter() {
  const [notifs, setNotifs]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [unreadOnly, setUnread]   = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get(`/api/notifications/?limit=100${unreadOnly ? '&unread_only=true' : ''}`)
      setNotifs(r.data || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [unreadOnly])

  const markRead = async (id) => {
    await api.post(`/api/notifications/${id}/read`)
    setNotifs(n => n.map(x => x.id === id ? { ...x, read_at: new Date().toISOString() } : x))
  }

  const markAllRead = async () => {
    await api.post('/api/notifications/read-all')
    setNotifs(n => n.map(x => ({ ...x, read_at: new Date().toISOString() })))
  }

  const del = async (id) => {
    await api.delete(`/api/notifications/${id}`)
    setNotifs(n => n.filter(x => x.id !== id))
  }

  const unreadCount = notifs.filter(n => !n.read_at).length

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Notifications</h1>
            {unreadCount > 0 && <p className="text-sm text-gray-400 mt-0.5">{unreadCount} unread</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setUnread(s => !s)}
              className={`btn-secondary text-xs ${unreadOnly ? 'border-green-500 text-green-700' : ''}`}>
              {unreadOnly ? 'Show all' : 'Unread only'}
            </button>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="btn-secondary text-xs">
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader size={20} className="animate-spin text-gray-400" /></div>
        ) : notifs.length === 0 ? (
          <div className="card p-12 text-center">
            <Bell size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No notifications{unreadOnly ? ' unread' : ''}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map(n => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.corrective
              const Icon = cfg.icon
              const isRead = !!n.read_at
              return (
                <div key={n.id} className={`card border flex items-start gap-3 p-4 transition-all ${
                  isRead ? 'opacity-60' : `${cfg.bg} ${cfg.border}`
                }`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isRead ? 'bg-gray-100' : cfg.bg}`}>
                    <Icon size={16} className={isRead ? 'text-gray-400' : cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isRead ? 'text-gray-500' : 'text-gray-900'}`}>{n.title}</p>
                    {n.body && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{n.body}</p>}
                    <p className="text-xs text-gray-300 mt-1">
                      {new Date(n.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!isRead && (
                      <button onClick={() => markRead(n.id)} title="Mark read"
                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-green-600 rounded-md hover:bg-white transition-colors">
                        <Check size={14} />
                      </button>
                    )}
                    <button onClick={() => del(n.id)} title="Delete"
                      className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 rounded-md hover:bg-white transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default NotificationCenter


// ═══════════════════════════════════════════════
// DOCUMENT VAULT  — DocumentVault.jsx
// ═══════════════════════════════════════════════
export function DocumentVault() {
  const [docs, setDocs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setForm]   = useState(false)
  const [form, setF]          = useState({ name:'', doc_type:'doh_permit', expiry_date:'', issued_date:'', notes:'', alert_days_before:30 })

  useEffect(() => {
    api.get('/api/documents/').then(r => setDocs(r.data || [])).finally(() => setLoading(false))
  }, [])

  const save = async (e) => {
    e.preventDefault()
    const r = await api.post('/api/documents/', form)
    setDocs(d => [...d, r.data])
    setForm(false)
    setF({ name:'', doc_type:'doh_permit', expiry_date:'', issued_date:'', notes:'', alert_days_before:30 })
  }

  const remove = async (id) => {
    if (!confirm('Delete this document?')) return
    await api.delete(`/api/documents/${id}`)
    setDocs(d => d.filter(x => x.id !== id))
  }

  const today = new Date().toISOString().slice(0, 10)
  const DOC_LABELS = {
    doh_permit: '🏥 DOH Operating Permit', food_cert: '📜 Food Protection Certificate',
    pco_report: '🐀 PCO Report', liquor_license: '🍷 Liquor License',
    workers_comp: '👷 Workers Comp', insurance: '🛡️ Insurance Certificate',
    equipment_cert: '⚙️ Equipment Cert', other: '📄 Other',
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Document Vault</h1>
            <p className="text-sm text-gray-400 mt-0.5">All compliance documents in one place with expiry tracking</p>
          </div>
          <button onClick={() => setForm(s => !s)} className="btn-primary"><FileText size={14} /> Add Document</button>
        </div>

        {showForm && (
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4">Add document</h2>
            <form onSubmit={save} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label">Document name *</label>
                  <input className="input" required value={form.name} placeholder="e.g. DOH Operating Permit 2024"
                    onChange={e => setF(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Document type</label>
                  <select className="input" value={form.doc_type} onChange={e => setF(f => ({ ...f, doc_type: e.target.value }))}>
                    {Object.entries(DOC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Alert me N days before expiry</label>
                  <input type="number" className="input" value={form.alert_days_before}
                    onChange={e => setF(f => ({ ...f, alert_days_before: parseInt(e.target.value) }))} />
                </div>
                <div>
                  <label className="label">Issue date</label>
                  <input type="date" className="input" value={form.issued_date}
                    onChange={e => setF(f => ({ ...f, issued_date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Expiry date</label>
                  <input type="date" className="input" value={form.expiry_date}
                    onChange={e => setF(f => ({ ...f, expiry_date: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="label">Notes</label>
                  <input className="input" value={form.notes} placeholder="Optional notes"
                    onChange={e => setF(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Save document</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader size={20} className="animate-spin text-gray-400" /></div>
        ) : docs.length === 0 ? (
          <div className="card p-12 text-center">
            <FileText size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-400 mb-2">No documents saved yet</p>
            <p className="text-sm text-gray-300">Add your DOH permit, food protection certs, and PCO reports</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map(doc => {
              const isExpired = doc.expiry_date && doc.expiry_date < today
              const daysLeft = doc.expiry_date ? Math.ceil((new Date(doc.expiry_date) - new Date()) / 86400000) : null
              const isExpiringSoon = daysLeft !== null && daysLeft <= doc.alert_days_before && daysLeft > 0

              return (
                <div key={doc.id} className={`card p-4 flex items-center gap-3 ${isExpired ? 'border-red-200 bg-red-50' : isExpiringSoon ? 'border-amber-200 bg-amber-50' : ''}`}>
                  <div className="text-2xl shrink-0">{DOC_LABELS[doc.doc_type]?.split(' ')[0] || '📄'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900">{doc.name}</p>
                    <p className="text-xs text-gray-400">{DOC_LABELS[doc.doc_type]?.split(' ').slice(1).join(' ')}</p>
                    {doc.expiry_date && (
                      <p className={`text-xs font-semibold mt-0.5 ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-gray-400'}`}>
                        {isExpired ? '⚠️ EXPIRED' : isExpiringSoon ? `⚠️ Expires in ${daysLeft} days` : `Expires: ${doc.expiry_date}`}
                      </p>
                    )}
                  </div>
                  <button onClick={() => remove(doc.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}


// ═══════════════════════════════════════════════
// STAFF MANAGEMENT — StaffManagement.jsx
// ═══════════════════════════════════════════════
export function StaffManagement() {
  const [staff, setStaff]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setForm]   = useState(false)
  const [form, setF]          = useState({ name:'', role:'staff', email:'', phone:'', food_cert_number:'', food_cert_expires:'', notes:'' })

  useEffect(() => {
    api.get('/api/staff/').then(r => setStaff(r.data || [])).finally(() => setLoading(false))
  }, [])

  const save = async (e) => {
    e.preventDefault()
    const r = await api.post('/api/staff/', form)
    setStaff(s => [...s, r.data])
    setForm(false)
    setF({ name:'', role:'staff', email:'', phone:'', food_cert_number:'', food_cert_expires:'', notes:'' })
  }

  const remove = async (id) => {
    if (!confirm('Remove this staff member?')) return
    await api.delete(`/api/staff/${id}`)
    setStaff(s => s.filter(x => x.id !== id))
  }

  const today = new Date().toISOString().slice(0, 10)
  const ROLES = ['owner', 'manager', 'supervisor', 'staff']
  const ROLE_BADGE = { owner: 'bg-purple-100 text-purple-700', manager: 'bg-blue-100 text-blue-700', supervisor: 'bg-green-100 text-green-700', staff: 'bg-gray-100 text-gray-600' }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Staff Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">Track Food Protection Certificates and expiry dates</p>
          </div>
          <button onClick={() => setForm(s => !s)} className="btn-primary"><Users size={14} /> Add Staff</button>
        </div>

        {showForm && (
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4">Add staff member</h2>
            <form onSubmit={save} className="grid grid-cols-2 gap-3">
              <div><label className="label">Name *</label><input className="input" required value={form.name} onChange={e => setF(f => ({ ...f, name: e.target.value }))} /></div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => setF(f => ({ ...f, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => setF(f => ({ ...f, email: e.target.value }))} /></div>
              <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setF(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><label className="label">Food Protection Cert #</label><input className="input" value={form.food_cert_number} onChange={e => setF(f => ({ ...f, food_cert_number: e.target.value }))} /></div>
              <div><label className="label">Cert expiry date</label><input type="date" className="input" value={form.food_cert_expires} onChange={e => setF(f => ({ ...f, food_cert_expires: e.target.value }))} /></div>
              <div className="col-span-2 flex gap-2">
                <button type="button" onClick={() => setForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Save staff member</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader size={20} className="animate-spin text-gray-400" /></div>
        ) : staff.length === 0 ? (
          <div className="card p-10 text-center">
            <Users size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-400">No staff members added yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {staff.map(s => {
              const certExpired = s.food_cert_expires && s.food_cert_expires < today
              const daysLeft = s.food_cert_expires ? Math.ceil((new Date(s.food_cert_expires) - new Date()) / 86400000) : null
              const expiringSoon = daysLeft !== null && daysLeft <= 30 && daysLeft > 0
              return (
                <div key={s.id} className={`card p-4 flex items-center gap-3 ${certExpired ? 'border-red-200 bg-red-50' : expiringSoon ? 'border-amber-200 bg-amber-50' : ''}`}>
                  <div className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                    {s.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900">{s.name}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[s.role] || ROLE_BADGE.staff}`}>
                        {s.role}
                      </span>
                    </div>
                    {s.food_cert_number && (
                      <p className="text-xs text-gray-400 mt-0.5">Cert #{s.food_cert_number}</p>
                    )}
                    {s.food_cert_expires && (
                      <p className={`text-xs font-semibold mt-0.5 ${certExpired ? 'text-red-600' : expiringSoon ? 'text-amber-600' : 'text-gray-400'}`}>
                        {certExpired ? '⚠️ CERT EXPIRED' : expiringSoon ? `⚠️ Cert expires in ${daysLeft} days` : `Cert expires: ${s.food_cert_expires}`}
                      </p>
                    )}
                  </div>
                  <button onClick={() => remove(s.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

import { Users } from 'lucide-react'
