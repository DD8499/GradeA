// ── ScoreGauge ──────────────────────────────────────────────
export function ScoreGauge({ score = 0, size = 120 }) {
  const radius    = (size - 16) / 2
  const circumf   = 2 * Math.PI * radius
  const offset    = circumf - (score / 100) * circumf
  const color     = score >= 80 ? '#16A34A' : score >= 60 ? '#D97706' : '#DC2626'
  const label     = score >= 80 ? 'Ready' : score >= 60 ? 'Needs Work' : 'At Risk'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#E5E7EB" strokeWidth={10}
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circumf}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center" style={{ marginTop: size / 2 - 16 }}>
        <span className="text-2xl font-black" style={{ color }}>{score}</span>
        <span className="text-xs font-semibold text-gray-400 -mt-0.5">{label}</span>
      </div>
    </div>
  )
}

// Wrapper with relative positioning for the overlay text
export function ScoreGaugeCard({ score = 0, size = 140 }) {
  const color = score >= 80 ? '#16A34A' : score >= 60 ? '#D97706' : '#DC2626'
  const label = score >= 80 ? 'Ready' : score >= 60 ? 'Needs Work' : 'At Risk'
  const radius    = (size - 16) / 2
  const circumf   = 2 * Math.PI * radius
  const offset    = circumf - (score / 100) * circumf

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ position: 'absolute' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#E5E7EB" strokeWidth={12} />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth={12}
          strokeDasharray={circumf} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="flex flex-col items-center z-10">
        <span className="text-3xl font-black leading-none" style={{ color }}>{score}</span>
        <span className="text-xs font-semibold text-gray-400 mt-0.5">{label}</span>
      </div>
    </div>
  )
}

// ── CountdownBanner ──────────────────────────────────────────
export function CountdownBanner({ daysUntil, nextDate }) {
  if (daysUntil === undefined || daysUntil === null) return null

  const isUrgent  = daysUntil <= 14
  const isCritical = daysUntil <= 7

  const bg      = isCritical ? 'bg-red-50 border-red-200'   : isUrgent ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
  const text    = isCritical ? 'text-red-800'  : isUrgent ? 'text-amber-800' : 'text-blue-800'
  const subtext = isCritical ? 'text-red-600'  : isUrgent ? 'text-amber-600' : 'text-blue-600'
  const icon    = isCritical ? '🔴' : isUrgent ? '⚠️' : '📅'

  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${bg}`}>
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${text}`}>
          {isCritical
            ? `Inspection window opens in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} — be ready!`
            : isUrgent
            ? `Re-inspection due in ~${daysUntil} days`
            : `Next inspection estimated in ~${daysUntil} days`
          }
        </p>
        {nextDate && (
          <p className={`text-xs mt-0.5 ${subtext}`}>
            Estimated window: {new Date(nextDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>
      {isCritical && (
        <span className={`text-xs font-bold px-2 py-1 rounded-full bg-red-100 ${text} whitespace-nowrap`}>
          URGENT
        </span>
      )}
    </div>
  )
}
