import { useState, useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import api from '../lib/api'
import { Flame, Play, Check, X, ChevronRight, Trophy, Loader, RefreshCw, Brain } from 'lucide-react'

const PRACTICE_QUESTIONS = [
  { code:'04C', q:'What is the maximum safe temperature for cold food storage?', options:['45°F','41°F','38°F','50°F'], answer:1, explanation:'NYC DOH requires cold food at ≤41°F (5°C). Above this is a critical violation code 04C.' },
  { code:'04A', q:'What minimum temperature must hot food be held at?', options:['130°F','135°F','140°F','145°F'], answer:2, explanation:'Hot holding minimum is 140°F (60°C) per NYC DOH. Below this is critical violation 04A.' },
  { code:'04H', q:'In what order should these items be stored top-to-bottom in a refrigerator?', options:['Poultry → beef → produce → fish','Produce → fish → beef → poultry','Produce → whole beef → ground beef → poultry','Fish → produce → poultry → beef'], answer:2, explanation:'Top to bottom: ready-to-eat/produce, whole cuts beef/fish, ground meat, raw poultry (lowest, highest risk).' },
  { code:'05D', q:'What must every handwashing sink have to pass inspection?', options:['Hot water only','Hot water, cold water, soap, and paper towels','Soap and hand sanitizer','Cold water and soap dispenser'], answer:1, explanation:'NYC DOH requires hot AND cold running water, soap, and paper towels at every designated handwashing sink.' },
  { code:'08A', q:'What is the highest-point critical violation in NYC?', options:['Improper temperature','Evidence of rats or mice','Food from unapproved source','Improper cooking temperature'], answer:1, explanation:'Evidence of rodents (08A) carries up to 28 points — the maximum single violation, almost guaranteeing a C grade.' },
  { code:'04L', q:'How long can ready-to-eat food be stored after preparation?', options:['3 days','5 days','7 days','10 days'], answer:2, explanation:'Ready-to-eat food may be kept for a maximum of 7 days. All containers must be labeled with the preparation date.' },
  { code:'06C', q:'What concentration of chlorine sanitizer is required?', options:['25-50 ppm','50-100 ppm','100-200 ppm','200-400 ppm'], answer:1, explanation:'Chlorine sanitizer must be 50-100 ppm. Test with strips. Too low = no sanitation. Too high = chemical contamination.' },
  { code:'04E', q:'To what temperature must whole poultry be cooked?', options:['145°F','150°F','155°F','165°F'], answer:3, explanation:'Poultry must reach 165°F internal temp to destroy Salmonella. This is a critical cooking temperature under 04E.' },
  { code:'09B', q:'Where must toxic chemicals be stored?', options:['Near food for easy access','Below food and food contact surfaces','Above food storage areas','Anywhere in the kitchen'], answer:1, explanation:'Chemicals must be stored SEPARATELY from food, BELOW food storage, and labeled. Improper storage is critical violation 09B.' },
  { code:'05H', q:'What does NYC require regarding Food Protection Certificates?', options:['One certificate per restaurant','One certified person must be present every shift','All staff must be certified','Certificates only required for managers'], answer:1, explanation:'At least ONE Food Protection Certificate holder must be on duty EVERY shift. This is checked during every inspection.' },
]

export default function PracticeMode() {
  const [started, setStarted]   = useState(false)
  const [current, setCurrent]   = useState(0)
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmit]  = useState(false)
  const [answers, setAnswers]   = useState([])
  const [done, setDone]         = useState(false)
  const [saving, setSaving]     = useState(false)

  const question = PRACTICE_QUESTIONS[current]
  const correct  = answers.filter(a => a.correct).length

  const choose = (idx) => { if (!submitted) setSelected(idx) }

  const submitAnswer = () => {
    if (selected === null) return
    const isCorrect = selected === question.answer
    setAnswers(a => [...a, { code: question.code, selected, correct: isCorrect }])
    setSubmit(true)
  }

  const next = () => {
    if (current < PRACTICE_QUESTIONS.length - 1) {
      setCurrent(c => c + 1); setSelected(null); setSubmit(false)
    } else {
      setDone(true)
      savePractice()
    }
  }

  const savePractice = async () => {
    setSaving(true)
    try {
      await api.post('/api/analytics/practice', {
        questions: PRACTICE_QUESTIONS.map((q, i) => ({
          code: q.code, question: q.q,
          user_answer: answers[i]?.selected ?? null,
          correct: answers[i]?.correct ?? false,
          explanation: q.explanation,
        })),
        score: Math.round((correct / PRACTICE_QUESTIONS.length) * 100),
        total_questions: PRACTICE_QUESTIONS.length,
      }).catch(() => {}) // Non-blocking
    } finally { setSaving(false) }
  }

  const restart = () => { setStarted(false); setCurrent(0); setSelected(null); setSubmit(false); setAnswers([]); setDone(false) }

  const gradeColor = (pct) => pct >= 80 ? '#16A34A' : pct >= 60 ? '#D97706' : '#EF4444'
  const gradeLabel = (pct) => pct >= 80 ? 'A — Excellent!' : pct >= 60 ? 'B — Good effort' : 'C — Keep studying'
  const scorePct   = Math.round((correct / PRACTICE_QUESTIONS.length) * 100)

  if (!started) return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="card p-8 text-center" style={{ background: 'linear-gradient(160deg,#07090F 0%,#0D1117 100%)', border: '1px solid rgba(255,255,255,.08)' }}>
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(140deg,#F59E0B,#D97706)', boxShadow: '0 8px 24px rgba(245,158,11,.3)' }}>
            <Flame size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2" style={{ letterSpacing: '-.03em' }}>Practice Inspection Mode</h1>
          <p className="text-gray-400 mb-6 text-sm leading-relaxed max-w-sm mx-auto">
            Test your knowledge against real NYC DOH inspection criteria. 10 questions, instant feedback, score saved to your analytics.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[['10', 'Questions'], ['~5', 'Minutes'], ['AI', 'Powered']].map(([n, l]) => (
              <div key={l} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
                <div className="text-2xl font-black" style={{ color: '#4ADE80' }}>{n}</div>
                <div className="text-xs text-gray-500 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setStarted(true)} className="btn-primary text-base px-8 py-3.5 w-full justify-center">
            <Play size={18} /> Start practice inspection
          </button>
        </div>
      </div>
    </AppLayout>
  )

  if (done) return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="card p-8 text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: gradeColor(scorePct), boxShadow: `0 8px 32px ${gradeColor(scorePct)}55` }}>
            <span className="text-4xl font-black text-white">{correct}</span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-1">{gradeLabel(scorePct)}</h2>
          <p className="text-gray-400 mb-2">{correct} of {PRACTICE_QUESTIONS.length} correct · {scorePct}%</p>
          <div className="flex gap-2 mt-5">
            <button onClick={restart} className="btn-secondary flex-1"><RefreshCw size={15} /> Try again</button>
          </div>
        </div>

        {/* Review */}
        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-3">Review your answers</h3>
          <div className="space-y-4">
            {PRACTICE_QUESTIONS.map((q, i) => {
              const a = answers[i]
              const isCorrect = a?.correct
              return (
                <div key={i} className={`rounded-xl p-4 border ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-start gap-2 mb-2">
                    {isCorrect ? <Check size={15} className="text-green-600 shrink-0 mt-0.5" /> : <X size={15} className="text-red-500 shrink-0 mt-0.5" />}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{q.q}</p>
                      <p className={`text-xs mt-1 font-semibold ${isCorrect ? 'text-green-700' : 'text-red-600'}`}>
                        {isCorrect ? '✓ Correct' : `✗ You chose: "${q.options[a?.selected]}"`}
                      </p>
                      {!isCorrect && <p className="text-xs text-green-700 mt-0.5">Correct: "{q.options[q.answer]}"</p>}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed ml-5">{q.explanation}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${((current) / PRACTICE_QUESTIONS.length) * 100}%`, background: 'linear-gradient(90deg,#22C55E,#4ADE80)' }} />
          </div>
          <span className="text-sm font-bold text-gray-500">{current + 1}/{PRACTICE_QUESTIONS.length}</span>
        </div>

        {/* Question card */}
        <div className="card p-6 animate-slide-up">
          <div className="flex items-center gap-2 mb-4">
            <span className="badge-critical font-mono">{question.code}</span>
            <Brain size={14} className="text-purple-400" />
            <span className="text-xs text-gray-400">NYC DOH Practice</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-5 leading-snug">{question.q}</h2>

          <div className="space-y-2.5">
            {question.options.map((opt, i) => {
              let bg = 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
              if (submitted) {
                if (i === question.answer) bg = 'bg-green-50 border-green-400 text-green-800'
                else if (i === selected && i !== question.answer) bg = 'bg-red-50 border-red-300 text-red-700'
                else bg = 'bg-gray-50 border-gray-100 text-gray-400'
              } else if (selected === i) {
                bg = 'bg-blue-50 border-blue-400 text-blue-800'
              }

              return (
                <button key={i} onClick={() => choose(i)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${bg} ${!submitted && 'cursor-pointer'}`}>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-white border-2 border-current flex items-center justify-center text-xs font-bold shrink-0">
                      {submitted && i === question.answer ? <Check size={12} /> : submitted && i === selected && i !== question.answer ? <X size={12} /> : String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </div>
                </button>
              )
            })}
          </div>

          {submitted && (
            <div className={`mt-4 rounded-xl p-4 ${answers[answers.length-1]?.correct ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              <p className={`text-sm font-bold mb-1 ${answers[answers.length-1]?.correct ? 'text-green-800' : 'text-amber-800'}`}>
                {answers[answers.length-1]?.correct ? '✓ Correct!' : 'Not quite — here\'s why:'}
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">{question.explanation}</p>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {!submitted ? (
              <button onClick={submitAnswer} disabled={selected === null} className="btn-primary flex-1">
                Submit answer
              </button>
            ) : (
              <button onClick={next} className="btn-primary flex-1">
                {current < PRACTICE_QUESTIONS.length - 1 ? <><ChevronRight size={16} /> Next question</> : <><Trophy size={16} /> See results</>}
              </button>
            )}
          </div>
        </div>

        {/* Score so far */}
        <div className="card p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
            <Trophy size={15} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Score so far</p>
            <p className="text-sm font-bold text-gray-900">
              {answers.filter(a=>a.correct).length}/{answers.length} correct
              {answers.length > 0 ? ` (${Math.round(answers.filter(a=>a.correct).length/answers.length*100)}%)` : ''}
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
