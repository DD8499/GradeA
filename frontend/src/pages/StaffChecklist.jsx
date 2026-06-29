import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { Send, Loader, ShieldCheck, Camera, Check, X,
         ChevronDown, ChevronUp, AlertTriangle, RefreshCw } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function PhotoCapture({ itemId, itemTitle, restaurantId, staffName, validationType, aiHint, onSuccess }) {
  const [status, setStatus]   = useState('idle')
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState(null)
  const [warnings, setWarnings] = useState([])
  const fileRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(file)
    setStatus('uploading'); setMessage(''); setWarnings([])
    const fd = new FormData()
    fd.append('file', file)
    fd.append('item_id', itemId)
    fd.append('item_title', itemTitle)
    fd.append('restaurant_id', restaurantId)
    fd.append('submitted_by', staffName || 'Staff')
    fd.append('validation_type', validationType || 'none')
    fd.append('ai_hint', aiHint || '')
    try {
      const res = await axios.post(`${API}/api/photos/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (res.data.success) {
        setStatus('success'); setMessage(res.data.message || 'Validated!')
        setWarnings(res.data.warnings || []); onSuccess?.(res.data.photo_url)
      } else {
        setStatus('error'); setMessage(res.data.message || 'Validation failed.'); setPreview(null)
      }
    } catch (err) {
      setStatus('error'); setMessage(err.response?.data?.detail || 'Upload failed.'); setPreview(null)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const VBADGE = { none:{l:'Any photo',c:'bg-gray-800 text-gray-400'}, timestamp:{l:'Fresh photo required',c:'bg-blue-900 text-blue-300'}, hash:{l:'Duplicate check',c:'bg-purple-900 text-purple-300'}, ai:{l:'AI verified',c:'bg-amber-900 text-amber-300'}, strict:{l:'Strict validation',c:'bg-green-900 text-green-300'} }
  const vb = VBADGE[validationType] || VBADGE.none

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <Camera size={12} className="text-gray-500" />
        <span className="text-xs text-gray-500">Photo required</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${vb.c}`}>{vb.l}</span>
      </div>

      {status === 'success' && (
        <div className="rounded-xl overflow-hidden" style={{ border: '2px solid #16A34A' }}>
          {preview && <img src={preview} alt="Evidence" className="w-full h-28 object-cover" />}
          <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(22,163,74,.1)' }}>
            <Check size={13} className="text-green-400 shrink-0" />
            <p className="text-xs text-green-400 font-semibold flex-1">{message}</p>
            <button onClick={() => { setStatus('idle'); setPreview(null); setWarnings([]) }}
              className="text-xs text-green-500 hover:underline shrink-0 flex items-center gap-1">
              <RefreshCw size={9} /> Retake
            </button>
          </div>
          {warnings.map((w,i) => <div key={i} className="px-3 py-1.5 text-xs text-amber-400 flex items-center gap-2" style={{ background: 'rgba(245,158,11,.08)' }}><AlertTriangle size={10} />{w}</div>)}
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(239,68,68,.08)', border: '2px solid rgba(239,68,68,.3)' }}>
          <div className="flex items-start gap-2"><X size={13} className="text-red-400 shrink-0 mt-0.5" /><p className="text-xs text-red-400 font-semibold">{message}</p></div>
          <label className="flex items-center gap-2 text-xs text-red-400 font-bold cursor-pointer hover:text-red-300">
            <Camera size={12} /> Take a new photo
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          </label>
        </div>
      )}

      {status === 'uploading' && (
        <div className="rounded-xl p-3" style={{ background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.2)' }}>
          {preview && <img src={preview} alt="" className="w-full h-20 object-cover rounded-lg mb-2 opacity-50" />}
          <div className="flex items-center gap-2">
            <Loader size={12} className="animate-spin text-blue-400" />
            <p className="text-xs text-blue-400 font-semibold">
              {validationType === 'ai' || validationType === 'strict' ? 'AI analyzing photo…' : 'Validating…'}
            </p>
          </div>
        </div>
      )}

      {status === 'idle' && (
        <label className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-colors active:opacity-70"
          style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.09)' }}>
          <Camera size={16} className="text-white shrink-0" />
          <div><p className="text-sm font-semibold text-white">Take photo now</p><p className="text-xs text-gray-500">Camera only — gallery not allowed</p></div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        </label>
      )}
    </div>
  )
}

export default function StaffChecklist() {
  const { token }      = useParams()
  const [searchParams] = useSearchParams()
  const quickItem      = searchParams.get('item')
  const [data, setData]       = useState(null)
  const [answers, setAnswers] = useState({})
  const [photos, setPhotos]   = useState({})
  const [staffName, setName]  = useState('')
  const [open, setOpen]       = useState({})
  const [loading, setLoad]    = useState(true)
  const [submitting, setSub]  = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')

  useEffect(() => {
    axios.get(`${API}/api/custom-checklist/combined`, { headers: { 'X-Staff-Token': token } })
      .catch(() => axios.get(`${API}/api/checklists/staff/${token}`))
      .then(r => {
        setData(r.data)
        const o = {}; r.data.categories?.forEach((_, i) => { if (i < 2) o[i] = true }); setOpen(o)
        if (quickItem) setTimeout(() => document.getElementById(`item-${quickItem}`)?.scrollIntoView({ behavior:'smooth', block:'center' }), 600)
      })
      .catch(() => setError('Invalid or expired staff link. Ask your manager for a new one.'))
      .finally(() => setLoad(false))
  }, [token])

  const setAnswer = (code, status) => setAnswers(a => ({ ...a, [code]: { ...a[code], status } }))
  const setNote   = (code, note)   => setAnswers(a => ({ ...a, [code]: { ...a[code], note } }))
  const onPhoto   = (code, url)    => setPhotos(p => ({ ...p, [code]: url }))

  const missingPhotos = () => {
    if (!data) return []
    const m = []
    for (const cat of data.categories || [])
      for (const item of cat.items)
        if (item.photo_required && answers[item.code]?.status === 'pass' && !photos[item.code])
          m.push(item.title || item.code)
    return m
  }

  const submit = async () => {
    if (!staffName.trim()) { alert('Please enter your name.'); return }
    const mp = missingPhotos()
    if (mp.length) { alert(`Upload required photos for:\n• ${mp.join('\n• ')}`); return }
    setSub(true)
    try {
      const checklistData = {}
      for (const [code, ans] of Object.entries(answers))
        checklistData[code] = { ...ans, photo_url: photos[code] || null }
      const res = await axios.post(`${API}/api/checklists/staff/${token}/submit`, { submitted_by: staffName, checklist_data: checklistData })
      setResult(res.data)
    } catch { alert('Submission failed. Try again.') }
    finally { setSub(false) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background:'#07090F' }}><Loader size={24} className="animate-spin" style={{ color:'#4ADE80' }} /></div>
  if (error)   return <div className="min-h-screen flex items-center justify-center px-4" style={{ background:'#07090F' }}><div className="text-center"><AlertTriangle size={32} className="text-red-400 mx-auto mb-3" /><p className="text-red-400 text-sm">{error}</p></div></div>
  if (result)  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background:'#07090F' }}>
      <div className="text-center max-w-sm w-full">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5 ${result.score>=80?'bg-green-600':result.score>=60?'bg-amber-500':'bg-red-600'}`}>
          <span className="text-4xl font-black text-white">{result.score}</span>
        </div>
        <h2 className="text-xl font-black text-white mb-2">Checklist submitted!</h2>
        <p className="text-gray-400 text-sm">{result.items_passed} passed · {result.items_failed} need attention</p>
        {result.items_failed > 0 && (
          <div className="mt-4 rounded-xl p-4 text-left" style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)' }}>
            <p className="text-red-300 text-sm font-semibold mb-2">Notify your manager:</p>
            {(result.open_issues||[]).map(c => <p key={c} className="text-red-400 text-xs font-mono py-0.5">• {c}</p>)}
          </div>
        )}
        <p className="text-gray-600 text-xs mt-6">Thank you, {staffName}!</p>
      </div>
    </div>
  )

  const answered = Object.keys(answers).length
  const total    = data?.total_items || (data?.categories?.reduce((s,c)=>s+c.items.length,0)) || 0
  const mp       = missingPhotos()

  return (
    <div className="min-h-screen" style={{ background:'#07090F' }}>
      {/* Header */}
      <div className="sticky top-0 z-10" style={{ background:'#0D1117', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-0.5">
            <ShieldCheck size={15} style={{ color:'#4ADE80' }} />
            <span className="font-black text-white">Grade<span style={{ color:'#4ADE80' }}>A</span></span>
          </div>
          <p className="text-sm font-semibold text-white">{data?.restaurant_name}</p>
          <p className="text-xs" style={{ color:'rgba(255,255,255,.28)' }}>Daily Checklist · {data?.today}</p>
        </div>
        <div className="h-1 mx-0" style={{ background:'rgba(255,255,255,.05)' }}>
          <div className="h-1 transition-all duration-500" style={{ width:`${total>0?(answered/total)*100:0}%`, background:'linear-gradient(90deg,#22C55E,#4ADE80)' }} />
        </div>
        <div className="px-4 py-1.5 flex justify-between text-xs" style={{ color:'rgba(255,255,255,.28)' }}>
          <span>{answered}/{total} answered</span>
          {mp.length > 0 && <span className="text-amber-400 font-semibold">📷 {mp.length} photo{mp.length!==1?'s':''} needed</span>}
        </div>
      </div>

      {/* Name */}
      <div className="px-4 py-3" style={{ background:'#0D1117', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
        <input className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:'#fff' }}
          placeholder="Your name (required)" value={staffName} onChange={e=>setName(e.target.value)} />
      </div>

      {/* Items */}
      <div className="pb-32">
        {data?.categories?.map((cat, ci) => {
          const catAns  = cat.items.filter(i => answers[i.code]).length
          const catFail = cat.items.filter(i => answers[i.code]?.status === 'fail').length
          const isOpen  = !!open[ci]
          return (
            <div key={cat.category} style={{ borderBottom:'1px solid rgba(255,255,255,.04)' }}>
              <button className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-60"
                onClick={() => setOpen(o => ({ ...o, [ci]: !o[ci] }))}>
                <span className="text-lg">{cat.label?.split(' ')[0]}</span>
                <span className="font-semibold text-white text-sm flex-1 text-left truncate">{cat.label?.split(' ').slice(1).join(' ')}</span>
                <span className="text-xs" style={{ color:'rgba(255,255,255,.28)' }}>{catAns}/{cat.items.length}</span>
                {catFail > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background:'rgba(239,68,68,.15)',color:'#F87171' }}>{catFail} ✗</span>}
                {isOpen ? <ChevronUp size={15} className="text-gray-600" /> : <ChevronDown size={15} className="text-gray-600" />}
              </button>

              {isOpen && cat.items.map(item => {
                const status   = answers[item.code]?.status
                const hasPhoto = !!photos[item.code]
                const needsPhoto = item.photo_required && status === 'pass' && !hasPhoto
                return (
                  <div id={`item-${item.code}`} key={item.code} className="px-4 py-3"
                    style={{ borderTop:'1px solid rgba(255,255,255,.03)', background: status==='fail'?'rgba(239,68,68,.05)':needsPhoto?'rgba(245,158,11,.03)':'transparent' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded font-mono"
                            style={{ background:item.severity==='critical'?'rgba(239,68,68,.15)':'rgba(245,158,11,.15)', color:item.severity==='critical'?'#F87171':'#FCD34D' }}>
                            {item.code}
                          </span>
                          {item.photo_required && (
                            <span className="text-xs flex items-center gap-1" style={{ color:hasPhoto?'#4ADE80':'rgba(255,255,255,.3)' }}>
                              <Camera size={9} />{hasPhoto?'✓ Photo':'Photo required'}
                            </span>
                          )}
                          {item.item_type === 'custom' && (
                            <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background:'rgba(167,139,250,.15)',color:'#A78BFA' }}>Custom</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        {(item.daily_checks||[]).slice(0,2).map((c,i)=><p key={i} className="text-xs mt-0.5" style={{ color:'rgba(255,255,255,.28)' }}>› {c}</p>)}
                        {status==='fail' && (
                          <input className="mt-2 w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                            style={{ background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:'#fff' }}
                            placeholder="What needs fixing?" value={answers[item.code]?.note||''} onChange={e=>setNote(item.code,e.target.value)} />
                        )}
                        {item.photo_required && status==='pass' && (
                          <PhotoCapture itemId={item.code} itemTitle={item.title} restaurantId={data.restaurant_id}
                            staffName={staffName} validationType={item.photo_validation||'none'} aiHint={item.ai_prompt_hint||''}
                            onSuccess={url=>onPhoto(item.code,url)} />
                        )}
                        {needsPhoto && <p className="mt-1.5 text-xs text-amber-400 flex items-center gap-1"><AlertTriangle size={10}/> Upload photo to complete this item</p>}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {[['pass',Check,'#22C55E','#16A34A','rgba(22,163,74,.35)'],['fail',X,'#F87171','#EF4444','rgba(239,68,68,.3)']].map(([s,Icon,c1,c2,glow])=>(
                          <button key={s} onClick={()=>setAnswer(item.code,s)}
                            style={{ width:48,height:42,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',
                              background:status===s?`linear-gradient(140deg,${c1},${c2})`:'rgba(255,255,255,.06)',
                              color:status===s?'#fff':'rgba(255,255,255,.3)',
                              boxShadow:status===s?`0 4px 12px ${glow}`:'none',
                              transition:'all .15s' }}>
                            <Icon size={17} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Submit */}
      <div className="fixed bottom-0 left-0 right-0 p-4"
        style={{ background:'rgba(13,17,23,.96)',backdropFilter:'blur(16px)',borderTop:'1px solid rgba(255,255,255,.06)' }}>
        {mp.length>0 && <p className="text-center text-xs text-amber-400 mb-2">📷 {mp.length} required photo{mp.length!==1?'s':''} still needed</p>}
        <button onClick={submit} disabled={submitting||answered===0||!staffName.trim()}
          className="w-full font-black py-4 rounded-2xl text-base flex items-center justify-center gap-2 transition-all"
          style={{
            background:submitting||answered===0||!staffName.trim()?'rgba(255,255,255,.07)':'linear-gradient(140deg,#22C55E,#16A34A)',
            color:submitting||answered===0||!staffName.trim()?'rgba(255,255,255,.25)':'#fff',
            boxShadow:answered>0&&staffName.trim()?'0 8px 24px rgba(22,163,74,.4)':'none',
          }}>
          {submitting?<><Loader size={18} className="animate-spin"/>Submitting…</>:<><Send size={18}/>Submit checklist ({answered}/{total})</>}
        </button>
      </div>
    </div>
  )
}
