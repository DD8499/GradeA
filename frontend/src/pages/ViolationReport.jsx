import { useState, useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import api from '../lib/api'
import { AlertTriangle, Zap, RefreshCw, ChevronDown, ChevronUp, Clock, Loader } from 'lucide-react'

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  general:  { label: 'General',  bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
}
const PROB_COLOR = { high: 'text-red-600', medium: 'text-amber-600', low: 'text-green-600' }

export default function ViolationReport() {
  const [report, setReport]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded]     = useState({})

  useEffect(() => { loadReport() }, [])

  const loadReport = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/violations/report')
      setReport(res.data)
    } catch { setReport(null) }
    finally { setLoading(false) }
  }

  const generateReport = async () => {
    setGenerating(true)
    try {
      const res = await api.post('/api/violations/generate')
      setReport(res.data)
      setExpanded({})
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to generate report. Check that Gemini API key is configured.')
    } finally { setGenerating(false) }
  }

  const toggle = (i) => setExpanded(e => ({ ...e, [i]: !e[i] }))

  const risks = report?.risks || []
  const critical = risks.filter(r => r.severity === 'critical').length

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">AI Violation Risk Report</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Powered by Gemini AI + NYC DOH public violation data
            </p>
          </div>
          <button onClick={generateReport} disabled={generating} className="btn-primary">
            {generating
              ? <><Loader size={15} className="animate-spin" /> Generating…</>
              : report
              ? <><RefreshCw size={15} /> Regenerate</>
              : <><Zap size={15} /> Generate report</>
            }
          </button>
        </div>

        {/* Last generated */}
        {report?.generated_at && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock size={12} />
            Last generated: {new Date(report.generated_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
            {report.cuisine_type && ` · ${report.cuisine_type} cuisine`}
            {report.borough && ` · ${report.borough}`}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <Loader size={24} className="animate-spin text-gray-400" />
          </div>
        )}

        {/* Generating animation */}
        {generating && (
          <div className="card p-8 text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-green-100" />
              <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap size={24} className="text-green-600" />
              </div>
            </div>
            <p className="text-gray-700 font-semibold">Analyzing your kitchen profile…</p>
            <p className="text-sm text-gray-400 mt-1">Cross-referencing with NYC DOH violation database</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !generating && !report && (
          <div className="card p-10 text-center">
            <AlertTriangle size={40} className="text-amber-400 mx-auto mb-4" />
            <h2 className="font-bold text-gray-900 mb-2">No report yet</h2>
            <p className="text-sm text-gray-400 mb-5 max-w-xs mx-auto">
              Generate your AI violation risk report to see which violations your kitchen is most likely to get flagged for.
            </p>
            <button onClick={generateReport} className="btn-primary">
              <Zap size={16} /> Generate my report
            </button>
          </div>
        )}

        {/* Report */}
        {!loading && !generating && risks.length > 0 && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-4 text-center">
                <p className="text-2xl font-black text-gray-900">{risks.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Total risks</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-black text-red-600">{critical}</p>
                <p className="text-xs text-gray-400 mt-0.5">Critical</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-black text-amber-600">{risks.length - critical}</p>
                <p className="text-xs text-gray-400 mt-0.5">General</p>
              </div>
            </div>

            {/* Risk cards */}
            <div className="space-y-3">
              {risks.map((risk, i) => {
                const cfg = SEVERITY_CONFIG[risk.severity] || SEVERITY_CONFIG.general
                const isOpen = expanded[i]

                return (
                  <div key={i} className={`rounded-xl border overflow-hidden ${cfg.border}`}>
                    <button
                      className={`w-full p-4 text-left ${cfg.bg} hover:brightness-95 transition-all`}
                      onClick={() => toggle(i)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0 mt-0.5 ${
                          i === 0 ? 'bg-red-600' : i === 1 ? 'bg-red-500' : i === 2 ? 'bg-amber-500' : 'bg-gray-400'
                        }`}>{risk.rank}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-gray-600">{risk.violation_code}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                              {cfg.label}
                            </span>
                            {risk.probability && (
                              <span className={`text-xs font-semibold ${PROB_COLOR[risk.probability] || ''}`}>
                                {risk.probability} probability
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-gray-900 mt-1">{risk.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{risk.description}</p>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">{risk.estimated_fine}</span>
                          {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                        </div>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="bg-white border-t border-gray-100 p-4">
                        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">How to fix it:</p>
                        <ol className="space-y-2">
                          {(risk.fix_steps || []).map((step, si) => (
                            <li key={si} className="flex gap-2.5 text-sm text-gray-700">
                              <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                {si + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                          <span className="text-xs text-gray-400">Check frequency:</span>
                          <span className="text-xs font-semibold text-gray-600 capitalize">{risk.check_frequency}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <p className="text-xs text-gray-400 text-center pb-4">
              Report generated by Gemini AI using your kitchen profile and NYC DOH open data.
              This is a risk estimate — not a substitute for official guidance.
            </p>
          </>
        )}
      </div>
    </AppLayout>
  )
}
