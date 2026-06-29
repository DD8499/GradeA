// ── LiveGauge ────────────────────────────────────────────────
// Real-time temperature gauge — animated SVG arc
export function LiveGauge({ value, unit = 'F', minSafe, maxSafe, name, lastUpdated, isViolation }) {
  const size     = 140
  const cx       = size / 2
  const cy       = size / 2
  const r        = 55
  const stroke   = 10
  const startAngle = -220
  const endAngle   = 40
  const totalArc   = endAngle - startAngle

  // Map value to arc
  let pct = 0
  if (value !== null && value !== undefined) {
    const lo = minSafe ? minSafe - 10 : 20
    const hi = maxSafe ? maxSafe + 10 : 200
    pct = Math.max(0, Math.min(1, (value - lo) / (hi - lo)))
  }

  const toRad = deg => (deg * Math.PI) / 180
  const arcPath = (start, sweep) => {
    const s = toRad(start)
    const e = toRad(start + sweep)
    const x1 = cx + r * Math.cos(s)
    const y1 = cy + r * Math.sin(s)
    const x2 = cx + r * Math.cos(e)
    const y2 = cy + r * Math.sin(e)
    const large = sweep > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }

  const color = isViolation ? '#EF4444' : value === null ? '#9CA3AF' : '#16A34A'
  const bgPath    = arcPath(startAngle, totalArc)
  const fillSweep = pct * totalArc
  const fillPath  = fillSweep > 0 ? arcPath(startAngle, fillSweep) : null

  const ago = lastUpdated
    ? (() => {
        const diff = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 1000)
        if (diff < 60) return `${diff}s ago`
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
        return `${Math.floor(diff / 3600)}h ago`
      })()
    : 'Never'

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track */}
          <path d={bgPath} fill="none" stroke="#E5E7EB" strokeWidth={stroke} strokeLinecap="round" />
          {/* Fill */}
          {fillPath && (
            <path
              d={fillPath} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
              style={{ transition: 'all 0.8s ease', filter: isViolation ? 'drop-shadow(0 0 4px #EF4444)' : 'none' }}
            />
          )}
          {/* Violation ring */}
          {isViolation && (
            <circle cx={cx} cy={cy} r={r + stroke / 2 + 3} fill="none" stroke="#FEE2E2" strokeWidth={2}
              style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
            />
          )}
          {/* Center value */}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="900" fill={color}
            style={{ fontFamily: 'system-ui, sans-serif' }}>
            {value !== null && value !== undefined ? value.toFixed(1) : '—'}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="#6B7280"
            style={{ fontFamily: 'system-ui, sans-serif' }}>
            °{unit}
          </text>
        </svg>
        {/* Violation badge */}
        {isViolation && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-black">!</span>
          </div>
        )}
      </div>
      <p className="text-xs font-semibold text-gray-800 mt-1 text-center max-w-[120px] truncate">{name}</p>
      {maxSafe && <p className="text-xs text-gray-400">safe ≤{maxSafe}°{unit}</p>}
      {minSafe && !maxSafe && <p className="text-xs text-gray-400">safe ≥{minSafe}°{unit}</p>}
      <p className="text-xs text-gray-300 mt-0.5">{ago}</p>
    </div>
  )
}

// ── NotificationBell ─────────────────────────────────────────
import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

export function NotificationBell() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const r = await api.get('/api/notifications/unread-count')
        setCount(r.data.count || 0)
      } catch {}
    }
    load()
    const interval = setInterval(load, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [])

  return (
    <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
      <Bell size={18} className={count > 0 ? 'text-gray-900' : 'text-gray-400'} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
