import { Link } from 'react-router-dom'
import { ShieldCheck, Check, Thermometer, Bell, ClipboardList, Zap, Star } from 'lucide-react'

const PAIN = [
  { num: '$2,000+', label: 'Fines per inspection', desc: 'A single critical violation triggers $200–$2,000 per item. Violations stack fast.' },
  { num: '22%',     label: 'Revenue drop from B grade', desc: 'Restaurants with B or C grades in their window see immediate, sustained drops in foot traffic.' },
  { num: '27,000',  label: 'Restaurants inspected yearly', desc: 'Every NYC restaurant is inspected at least once a year — unannounced. Yours is next.' },
]

const FEATURES = [
  { icon: ClipboardList, title: 'NYC DOH full checklist', desc: 'All 200+ NYC DOH criteria, organized by category and filtered for your cuisine type. Updated when rules change.' },
  { icon: Thermometer,   title: 'Temperature logging', desc: 'Staff logs fridge, freezer, and hot food temps. Instant alert if anything drifts outside safe range.' },
  { icon: Zap,           title: 'AI violation risk report', desc: 'Gemini AI cross-references your profile with NYC DOH data to predict your top 5 most likely violations.' },
  { icon: Bell,          title: 'Re-inspection countdown', desc: 'GradeA pulls your last inspection date from NYC Open Data and sends alerts 30, 14, 7 days before your window.' },
  { icon: ShieldCheck,   title: 'Mobile-first for staff', desc: 'No login for staff. Share a link — they complete the checklist on their phone in under 5 minutes.' },
  { icon: Check,         title: 'Photo documentation', desc: 'Staff photos corrective actions. Build an audit trail inspectors respect before they even walk in.' },
]

const STEPS = [
  { n: 1, title: 'Set up your kitchen profile', desc: 'Enter your cuisine type, equipment, and borough. GradeA loads the violations most common for your kitchen.' },
  { n: 2, title: 'Your staff checks off the list daily', desc: 'Share a simple link. Staff tap pass/fail on each item — no login needed. Takes under 5 minutes.' },
  { n: 3, title: 'Get your inspection-readiness score', desc: 'See a daily score and every item that could trigger a violation — before the inspector walks in.' },
]

const TESTIMONIALS = [
  { quote: 'We got a B grade two years in a row. After two months with GradeA, we passed with a perfect A and zero critical violations.', name: 'Marco R.', biz: 'La Cucina, Astoria, Queens' },
  { quote: 'The daily checklist changed our kitchen culture. My staff now knows exactly what inspectors look for. No more surprises.', name: 'Jennifer S.', biz: 'Sunrise Diner, Flatbush, Brooklyn' },
  { quote: 'The re-inspection countdown literally saved us. GradeA reminded us 14 days out and we were fully prepared.', name: 'Ahmed K.', biz: 'Spice Route, Jackson Heights' },
]

const FAQS = [
  { q: 'How does GradeA know the NYC DOH inspection criteria?', a: 'GradeA is built directly from the NYC DOH Restaurant Inspection public data and official violation codes — the exact same criteria real inspectors use. We update automatically when NYC DOH rules change.' },
  { q: 'Do my kitchen staff need training?', a: 'None. The daily checklist is designed for kitchen workers, not office users. Staff open a link on their phone, tap checkboxes, and that\'s it. No account or password required.' },
  { q: 'Does this work for all NYC restaurant types?', a: 'Yes. When you set up your profile, GradeA customizes the checklist for your kitchen — full-service, fast food, café, bakery, food truck, catering. Violations prioritized for your specific operation.' },
  { q: 'Can I use this outside New York City?', a: 'GradeA is currently built for NYC DOH compliance. Chicago and Los Angeles are coming next — sign up and we\'ll notify you when your city is available.' },
]

export default function Landing() {
  return (
    <div className="bg-white min-h-screen">

      {/* NAV */}
      <nav className="bg-gray-950 border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-green-600 rounded-md flex items-center justify-center">
              <ShieldCheck size={14} className="text-white" />
            </div>
            <span className="font-extrabold text-white text-lg tracking-tight">
              Grade<span className="text-green-400">A</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Sign in</Link>
            <Link to="/register" className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-gray-950 text-center px-5 py-20 sm:py-28">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Synced with NYC DOH violation database
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white leading-none tracking-tight mb-5">
            Your kitchen is always<br />
            <span className="text-green-400">inspection ready.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto mb-8 leading-relaxed">
            NYC health inspectors show up unannounced. GradeA keeps your restaurant inspection-ready every day — so an A grade stays in your window.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register" className="bg-green-600 hover:bg-green-700 text-white font-bold px-7 py-3.5 rounded-xl text-base transition-colors w-full sm:w-auto">
              Start free — no credit card
            </Link>
            <a href="#how" className="text-gray-400 hover:text-white text-sm transition-colors">
              See how it works ↓
            </a>
          </div>

          {/* Grade cards */}
          <div className="flex items-end justify-center gap-4 mt-14">
            {[
              { grade: 'C', color: 'text-red-500',   border: 'border-gray-800', opacity: 'opacity-20' },
              { grade: 'B', color: 'text-amber-500', border: 'border-gray-800', opacity: 'opacity-35' },
              { grade: 'A', color: 'text-green-400', border: 'border-green-500', ring: 'ring-4 ring-green-500/20', scale: 'scale-110' },
            ].map(({ grade, color, border, opacity, ring, scale }) => (
              <div key={grade} className={`bg-white rounded-xl w-28 py-5 text-center border-2 ${border} ${opacity || ''} ${ring || ''} ${scale ? 'transform ' + scale : ''} transition-transform`}>
                <div className={`text-7xl font-black leading-none ${color}`}>{grade}</div>
                <div className="text-gray-400 text-xs font-semibold mt-1 uppercase tracking-wider">Grade</div>
                <div className="text-gray-400 text-[9px] mt-1 leading-tight">NYC Dept. of Health</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PAIN */}
      <section className="bg-gray-50 py-16 px-5">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-red-500 text-center mb-3">The real cost of being unprepared</p>
          <h2 className="text-3xl font-black text-gray-900 text-center mb-10">NYC inspectors don't give warnings.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {PAIN.map(p => (
              <div key={p.num} className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="text-4xl font-black text-red-600 mb-2">{p.num}</div>
                <div className="font-bold text-gray-900 mb-2">{p.label}</div>
                <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-16 px-5">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-green-600 text-center mb-3">How it works</p>
          <h2 className="text-3xl font-black text-gray-900 text-center mb-10">Daily prep in under 5 minutes.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map(s => (
              <div key={s.n}>
                <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 font-black text-sm flex items-center justify-center mb-4">{s.n}</div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-gray-50 py-16 px-5">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-green-600 text-center mb-3">Features</p>
          <h2 className="text-3xl font-black text-gray-900 text-center mb-10">Everything to keep that A.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map(f => {
              const Icon = f.icon
              return (
                <div key={f.title} className="bg-white rounded-2xl p-5 border border-gray-200 flex gap-4">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-16 px-5">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-green-600 text-center mb-3">From restaurant owners</p>
          <h2 className="text-3xl font-black text-gray-900 text-center mb-10">Real kitchens. Real A grades.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} size={12} className="text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed italic mb-4">"{t.quote}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-xs font-bold text-green-700">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.biz}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-gray-50 py-16 px-5">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-green-600 text-center mb-3">Pricing</p>
          <h2 className="text-3xl font-black text-gray-900 text-center mb-2">Less than one fine. Per year.</h2>
          <p className="text-center text-gray-400 text-sm mb-10">14-day free trial · No credit card · Cancel anytime</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: 'Starter', price: '$39', features: ['NYC DOH full checklist','Daily mobile checklists (5 staff)','Temperature logging + alerts','1 location','Email re-inspection alerts','Weekly readiness score'], cta: 'Start free trial', featured: false },
              { name: 'Pro', price: '$79', features: ['Everything in Starter','AI violation risk report (daily)','Photo documentation trail','SMS + WhatsApp alerts','Unlimited staff','Up to 3 locations','Priority support'], cta: 'Start free trial', featured: true },
            ].map(plan => (
              <div key={plan.name} className={`bg-white rounded-2xl p-6 border-2 flex flex-col ${plan.featured ? 'border-green-500' : 'border-gray-200'}`}>
                {plan.featured && <span className="inline-block text-xs bg-green-50 text-green-700 font-bold px-2.5 py-1 rounded-full mb-3 w-fit">Most popular</span>}
                <h3 className="font-black text-gray-900 text-lg">{plan.name}</h3>
                <div className="text-4xl font-black text-gray-900 mt-1 mb-1">{plan.price}<span className="text-base font-normal text-gray-400">/mo</span></div>
                <ul className="mt-4 space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="text-sm text-gray-600 flex items-start gap-2">
                      <Check size={14} className="text-green-600 shrink-0 mt-0.5" />{f}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className={`mt-6 text-center font-bold py-3 rounded-xl text-sm transition-colors ${plan.featured ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-5">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-10">Common questions.</h2>
          <div className="space-y-5">
            {FAQS.map(f => (
              <div key={f.q} className="border-b border-gray-100 pb-5">
                <h3 className="font-bold text-gray-900 mb-2">{f.q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-gray-950 py-20 px-5 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-4xl font-black text-white mb-4 leading-tight">
            An <span className="text-green-400">A grade</span> is not luck.<br />It's daily preparation.
          </h2>
          <p className="text-gray-400 mb-8">Join NYC restaurant owners who stopped worrying about inspections.</p>
          <Link to="/register" className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4 rounded-xl text-base transition-colors">
            Get started free today →
          </Link>
          <p className="text-gray-600 text-xs mt-4">14-day free trial · No credit card · $39/month after</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-950 border-t border-white/5 py-6 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-extrabold text-gray-600 text-sm">Grade<span className="text-green-600">A</span></span>
          <div className="flex gap-5">
            {['Privacy','Terms','Contact','NYC DOH Data'].map(l => (
              <a key={l} href="#" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
