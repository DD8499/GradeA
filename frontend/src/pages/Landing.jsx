import { ArrowRight, ArrowUp, Bell, Check, ChevronLeft, ChevronRight, ClipboardList, Clock3, Play, ShieldCheck, Sparkles, Star, Thermometer, TrendingUp, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const PAIN = [
  { num: '$2,000+', label: 'Fines per inspection', desc: 'A single critical violation triggers $200–$2,000 per item. Violations stack fast.' },
  { num: '22%', label: 'Revenue drop from B grade', desc: 'Restaurants with B or C grades in their window see immediate, sustained drops in foot traffic.' },
  { num: '27,000', label: 'Restaurants inspected yearly', desc: 'Every NYC restaurant is inspected at least once a year — unannounced. Yours is next.' },
]

const FEATURES = [
  { icon: ClipboardList, title: 'NYC DOH full checklist', desc: 'All 200+ NYC DOH criteria, organized by category and filtered for your cuisine type. Updated when rules change.' },
  { icon: Thermometer, title: 'Temperature logging', desc: 'Staff logs fridge, freezer, and hot food temps. Instant alert if anything drifts outside safe range.' },
  { icon: Zap, title: 'AI violation risk report', desc: 'Gemini AI cross-references your profile with NYC DOH data to predict your top 5 most likely violations.' },
  { icon: Bell, title: 'Re-inspection countdown', desc: 'GradeA pulls your last inspection date from NYC Open Data and sends alerts 30, 14, 7 days before your window.' },
  { icon: ShieldCheck, title: 'Mobile-first for staff', desc: 'No login for staff. Share a link — they complete the checklist on their phone in under 5 minutes.' },
  { icon: Check, title: 'Photo documentation', desc: 'Staff photos corrective actions. Build an audit trail inspectors respect before they even walk in.' },
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

const HIGHLIGHTS = [
  { icon: Clock3, title: 'Daily prep in 5 minutes', desc: 'Staff finish each round before the lunch rush and never miss a critical item.' },
  { icon: Sparkles, title: 'Built for NYC kitchens', desc: 'The workflow matches the same categories inspectors care about most.' },
]

const STATS = [
  { value: 94, suffix: '%', label: 'readiness score', desc: 'Average daily score across active kitchens.' },
  { value: 3, suffix: 'x', label: 'faster corrective action', desc: 'Issues surface early and get fixed before they become fines.' },
  { value: 15, suffix: 'm', label: 'staff touches monthly', desc: 'Simple mobile checklists keep your team aligned every day.' },
  { value: 24, suffix: 'h', label: 'average alert lead time', desc: 'Re-inspection windows are surfaced before the rush gets busy.' },
]

const PROBLEM_POINTS = [
  'No one tells you the exact 200+ criteria inspectors use — you have to figure it out yourself',
  'Staff don’t know DOH standards — nobody teaches them what to look for',
  'Temperatures drift unnoticed overnight — no monitoring, no alerts',
  'Important documents expire without warning',
  'Owners don’t know their re-inspection is coming until the inspector walks in',
]

const SOLUTION_DAY1 = [
  'Your last DOH grade auto-loaded from NYC Open Data',
  'Checklist filtered for your cuisine type & equipment',
  'Re-inspection countdown already running',
  'AI violation risk report ready to generate',
  'Staff checklist link ready to share',
]

const SOLUTION_CHANGES = [
  'Staff complete a 5-minute checklist every morning',
  'You see a daily readiness score before you arrive',
  'Temperature alerts come to your phone before they become violations',
  'Inspector shows up → you know you’re ready',
]

const SENSOR_FEATURES = [
  { temp: '38°F', label: 'Walk-in Fridge', status: '✓ OK', color: 'text-emerald-500' },
  { temp: '146°F', label: 'Hot Holding', status: '✓ OK', color: 'text-amber-500' },
  { temp: '44°F', label: 'Reach-in Fridge', status: '⚠ VIOLATION', color: 'text-red-500' },
  { temp: '-4°F', label: 'Freezer', status: '✓ OK', color: 'text-sky-400' },
]

const PHOTO_STEPS = [
  { num: '1', title: 'Force camera capture', desc: 'On mobile, the file picker opens the camera directly — no gallery access. Staff must take a photo right now, not upload a saved image.', result: '✓ Prevents: using saved/old photos from the camera roll' },
  { num: '2', title: 'EXIF timestamp check', desc: 'The photo’s EXIF metadata is extracted and verified. Photos older than 90 minutes are rejected automatically.', result: '✓ Prevents: using yesterday’s photo again' },
  { num: '3', title: 'Perceptual hash (duplicate detection)', desc: 'A perceptual hash is computed and compared against the last 24 hours of submissions. Photos 97%+ similar to a recent upload are rejected.', result: '✓ Prevents: submitting the same photo twice' },
  { num: '4', title: 'Gemini Vision AI content check', desc: 'Gemini AI analyzes the image and verifies subject, authenticity, and clarity before accepting it as evidence.', result: '✓ Prevents: screenshots, photos of other photos, irrelevant images' },
]

const AI_FEATURES = [
  { icon: '📊', title: 'AI Violation Risk Report', desc: 'Generated fresh every day. Gemini cross-references your cuisine type, equipment, and borough with NYC DOH public violation data to predict your top 5 most likely violations — with specific fix steps for each one.', example: '#1 — 04H Cross-contamination — raw chicken above ready-to-eat ingredients. Est. fine: $200–$2,000. Fix: color-coded cutting boards, dedicated raw shelves.' },
  { icon: '💬', title: 'AI Compliance Chatbot (24/7)', desc: 'Ask any question about DOH compliance and get an expert-level answer in seconds. The AI knows your restaurant profile, your last grade, your cuisine type, and all NYC DOH violation codes.', example: 'Q: “What temperature does my walk-in need to be?” A: “NYC DOH requires cold storage at ≤41°F (5°C). Above this is critical violation 04C, worth up to 28 points. Log the temperature every morning and alert me if it drifts above 39°F as an early warning.”' },
]

const MORE_FEATURES = [
  { emoji: '👥', title: 'Staff Management & Food Protection Cert Tracking', desc: 'Add all staff members with their roles and Food Protection Certificate numbers. GradeA alerts you 30 days before any cert expires, and shows you who is certified on every shift.' },
  { emoji: '📁', title: 'Document Vault — All Compliance Documents in One Place', desc: 'Upload your DOH operating permit, liquor license, PCO reports, workers comp, and insurance certificates. GradeA tracks expiry dates and alerts you before they lapse.' },
  { emoji: '✅', title: 'Corrective Action Tracker', desc: 'When a checklist item fails, a corrective action ticket is automatically created. Assign it to a staff member, set a due date, and require before/after photo evidence.' },
  { emoji: '🕵️', title: 'Inspector Visit Log', desc: 'After every real DOH inspection, log the grade, score, and violations found. GradeA compares predicted vs actual violations and stores your inspection history.' },
  { emoji: '📊', title: 'Analytics — 90-Day Trends', desc: 'Score trend charts, most common failures, staff performance, temperature violation frequency, and predicted grade — all in one dashboard.' },
  { emoji: '🐀', title: 'Pest Control Log', desc: 'Log every PCO visit with operator name, license number, products used, areas treated, and next scheduled visit. Keeps your 08A and 08B violations from ever happening.' },
  { emoji: '📱', title: 'Mobile App (PWA) — Install to iPhone or Android', desc: 'Installs to your phone home screen like a native app. Works offline, supports push notifications, and gives staff camera access for photo documentation.' },
]

const COMPARISON_ROWS = [
  ['NYC DOH violation checklist (200+ items)', '✓', 'partial', '✗', '✓'],
  ['Live IoT temperature sensors', '✓', '✗', '✗', '✗'],
  ['AI violation risk report (daily)', '✓', '✗', '✗', 'varies'],
  ['AI compliance chatbot (24/7)', '✓', '✗', '✗', '✗'],
  ['Custom checklist items (owner-created)', '✓', '✓', '✗', 'varies'],
  ['Photo validation (AI + hash + timestamp)', '✓', '✗', '✗', '✗'],
  ['SMS + WhatsApp + Push alerts', '✓', '✗', '✗', '✗'],
  ['Staff Food Protection Cert tracking', '✓', '✗', '✗', 'varies'],
  ['Document vault + expiry alerts', '✓', '✗', '✗', 'varies'],
  ['NYC Open Data auto-sync (grade + date)', '✓', '✗', '✗', '✗'],
  ['Works offline on mobile', '✓', '✓', '✗', '✗'],
  ['Inspector visit log + countdown', '✓', '✗', '✗', 'varies'],
  ['Practice inspection mode (AI quiz)', '✓', '✗', '✗', '✗'],
]

const renderStatusCell = (value) => {
  if (value === '✓') {
    return <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">✓</span>
  }

  if (value === '✗') {
    return <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600">✗</span>
  }

  if (value === 'partial') {
    return <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600">~</span>
  }

  return <span className="text-sm text-gray-600">{value}</span>
}

const COMPARISON_NOTES = [
  { accent: 'border-amber-300 text-amber-600', title: 'Paper & manual tracking', desc: 'Zero cost but zero protection. No alerts, no history, no accountability. Staff can claim they checked something they didn’t. If a DOH inspector asks for temperature logs and you have none, it’s an automatic violation.' },
  { accent: 'border-amber-300 text-amber-600', title: 'Toast / Square / 7shifts', desc: 'Excellent POS and scheduling tools — but they are not compliance tools. None of them know NYC DOH violation codes, none have temperature sensors, and none of them will help you pass an inspection.' },
  { accent: 'border-red-500 text-red-600', title: 'Health consultants', desc: ' $200–$500/hour. Can tell you what to do, but they are not in your kitchen every day. No ongoing monitoring, no temperature alerts, no daily checklists. GradeA is your full-time compliance team at 1/100th of the cost.' },
  { accent: 'border-green-500 text-emerald-600', title: 'GradeA', desc: 'The only tool built specifically for NYC DOH compliance. Real-time sensors. AI predictions. Photo-verified checklists. NYC Open Data integration. Automatic alerts. $39–$79/month with a 14-day free trial.' },
]

const ROI_METHODS = [
  { value: 0, label: 'Paper / manual (no cost, but time loss)' },
  { value: 200, label: 'Another SaaS tool ($200/mo)' },
  { value: 500, label: 'Health consultant ($500/mo)' },
  { value: 1200, label: 'Full compliance service ($1,200/mo)' },
]

const PRICING_PLANS = [
  { title: 'Paper / Manual', price: '$0', note: 'No cost but no protection. One missed violation costs $200–$2,000.', features: ['Partial checklist only', 'No temperature monitoring', 'No alerts', 'No AI or analytics'] },
  { title: 'GradeA Starter', price: '$39', note: '14-day free trial — no card needed', features: ['NYC DOH full checklist', 'Daily mobile checklists (5 staff)', 'Temperature logging + email alerts', 'Re-inspection countdown', 'Document vault', '1 location'], highlight: false },
  { title: 'GradeA Pro', price: '$79', note: '14-day free trial — no card needed', features: ['Everything in Starter', 'Live IoT sensor integration', 'AI violation risk report', 'AI compliance chatbot', 'SMS + WhatsApp alerts', 'Staff cert tracking', 'Up to 3 locations', 'Practice inspection mode'], highlight: true },
  { title: 'Health Consultant', price: '$500+', note: 'Not in your kitchen daily. No ongoing monitoring or alerts.', features: ['Periodic audit only', 'No real-time monitoring', 'No daily checklists', 'No temperature alerts'] },
]

const START_STEPS = [
  { num: '1', title: 'Create free account', desc: 'Go to gradea.app, click Start Free Trial. No credit card — 14 days full access to every Pro feature.' },
  { num: '2', title: 'Set up in 3 minutes', desc: 'Enter your restaurant name. GradeA searches NYC Open Data, auto-fills your last grade, and loads your checklist immediately.' },
  { num: '3', title: 'Share with your team', desc: 'Copy the staff checklist link and drop it in your kitchen group chat. Staff start completing it today — no training needed.' },
]

function Reveal({ children, className = '', delay = 0 }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function Counter({ value, suffix = '', duration = 1400 }) {
  const [display, setDisplay] = useState(0)
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return

    const start = performance.now()
    let frame

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(value * eased))

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick)
      }
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [duration, value, visible])

  return <span ref={ref}>{display}{suffix}</span>
}

export default function Landing() {
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [roiLocations, setRoiLocations] = useState(1)
  const [roiMethod, setRoiMethod] = useState(0)
  const [roiHours, setRoiHours] = useState(8)
  const [roiPlan, setRoiPlan] = useState(79)
  const [showScrollTop, setShowScrollTop] = useState(false)

  const savingsPerMonth = Math.max(0, (roiMethod + roiHours * 20) - roiPlan)
  const roiAnnual = `$${Math.max(0, Math.round(savingsPerMonth * 12 * roiLocations)).toLocaleString()}`
  const roiHoursSaved = `${Math.max(0, roiHours * 52 * roiLocations).toLocaleString()}`
  const roiPayback = savingsPerMonth > 0 ? `${Math.max(1, Math.round(roiPlan / savingsPerMonth))} months` : 'N/A'
  const roiSummary = savingsPerMonth > 0
    ? `With ${roiLocations} location${roiLocations > 1 ? 's' : ''}, GradeA saves about ${roiAnnual} per year and delivers a payback of ${roiPayback}.`
    : 'Choose your current compliance method and weekly hours to see how much GradeA can save.'

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length)
    }, 6000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToTestimonial = (index) => {
    setActiveTestimonial(index)
  }

  return (
    <div id="top" className="min-h-screen overflow-x-hidden bg-white scroll-smooth">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-gray-950">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-600">
              <ShieldCheck size={14} className="text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-white">
              Grade<span className="text-green-400">A</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-gray-400 transition-colors hover:text-white">Sign in</Link>
            <Link to="/register" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700">
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gray-950 px-5 py-20 text-center sm:py-28">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-70" />
        <div className="glow-orb absolute bottom-[-4rem] right-[-5rem] h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            Synced with NYC DOH violation database
          </div>
          <h1 className="mb-5 text-4xl font-black leading-none tracking-tight text-white sm:text-6xl">
            Your kitchen is always<br />
            <span className="text-green-400">inspection ready.</span>
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-gray-400">
            NYC health inspectors show up unannounced. GradeA keeps your restaurant inspection-ready every day — so an A grade stays in your window.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register" className="btn-primary w-full px-7 py-3.5 text-base sm:w-auto">
              Start free — no credit card
            </Link>
            <a href="#how" className="btn-secondary w-full sm:w-auto">
              See how it works
            </a>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <Reveal className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 text-left shadow-2xl backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-semibold text-green-300">
                <Sparkles size={16} />
                Daily readiness score
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <div className="text-5xl font-black tracking-tight text-white">92%</div>
                <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  ahead of schedule
                </div>
              </div>
              <p className="mt-3 max-w-md text-sm leading-6 text-gray-400">
                Your team closes the biggest risks before the next inspection window and never loses the rhythm of prep.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <a href="#how" className="inline-flex items-center gap-2 text-sm font-semibold text-green-200 transition-colors hover:text-white">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                    <Play size={14} className="ml-0.5" />
                  </span>
                  Watch the 90-second tour
                </a>
              </div>
            </Reveal>

            <Reveal delay={120} className="grid gap-3">
              {HIGHLIGHTS.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="rounded-2xl border border-white/10 bg-white/6 p-4 text-left shadow-lg backdrop-blur">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/15 text-green-300">
                      <Icon size={16} />
                    </div>
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-gray-400">{item.desc}</p>
                  </div>
                )
              })}
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-red-500">The reality every NYC restaurant owner faces</span>
            <h2 className="mb-5 text-3xl font-black text-gray-900">NYC inspectors show up unannounced.<br />Are you ready right now?</h2>
            <p className="mb-10 max-w-3xl text-base leading-8 text-gray-600">The NYC Department of Health inspects every restaurant at least once per year — with zero warning. Most owners have no system to prepare. The cost of being caught unprepared is severe.</p>
          </Reveal>
          <div className="grid gap-5 xl:grid-cols-4">
            {PAIN.map((p) => (
              <Reveal key={p.num} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="text-4xl font-black text-red-600">{p.num}</div>
                <div className="mt-3 font-semibold text-gray-900">{p.label}</div>
                <p className="mt-4 text-sm leading-relaxed text-gray-500">{p.desc}</p>
              </Reveal>
            ))}
          </div>

          <Reveal delay={100} className="mt-10 rounded-3xl border border-gray-200 bg-white p-8 shadow-lg">
            <p className="text-xl font-semibold text-gray-900">"I had no idea my fridge was running at 44°F. The DOH inspector found it, gave me a critical violation, and I had a B grade in my window for four months. I lost regulars I never got back."</p>
            <p className="mt-4 text-sm text-gray-500">— Restaurant owner, Crown Heights, Brooklyn (before GradeA)</p>
          </Reveal>
        </div>
      </section>

      <section id="how" className="relative overflow-hidden bg-gradient-to-b from-gray-50 via-white to-gray-50 px-5 py-16">
        <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(22,163,74,0.12),transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <Reveal>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-green-600">How GradeA solves it</p>
              <h2 className="mb-4 text-3xl font-black text-gray-900">One platform. Every compliance need. $39/month.</h2>
              <p className="max-w-xl text-base leading-8 text-gray-500">GradeA is purpose-built for NYC restaurants. Not a generic SaaS tool adapted for compliance — a product built from the ground up around the NYC DOH inspection system, available from day one with no setup cost.</p>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              <Reveal delay={80} className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-gray-900">What you get on day 1</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  {SOLUTION_DAY1.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1 text-green-600">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={160} className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-gray-900">What changes for you</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  {SOLUTION_CHANGES.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1 text-green-600">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-green-600">Feature 1 — The one no competitor has</span>
            <h2 className="mb-5 text-3xl font-black text-gray-900">Live temperature monitoring from a $9 chip.</h2>
            <p className="mb-10 max-w-3xl text-base leading-8 text-gray-600">A tiny ESP32 sensor ($9 in hardware, firmware included in GradeA Pro) connects to your restaurant WiFi and sends fridge, freezer, and hot holding temperatures to your dashboard every 5 minutes — automatically.</p>
          </Reveal>
          <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
            <Reveal className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
              <div className="mb-6 rounded-3xl border border-gray-200 bg-gray-50 p-5">
                <div className="flex items-center justify-between gap-4 text-sm font-semibold text-gray-900">
                  <span>Live Sensor Dashboard</span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-red-600">• LIVE</span>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {SENSOR_FEATURES.map((g) => (
                    <div
                      key={g.label}
                      className={`rounded-3xl p-4 shadow-sm ${g.color === 'text-red-500' ? 'bg-red-50 ring-2 ring-red-200 animate-pulse' : 'bg-white'} transition-all duration-300`}
                    >
                      <div className={`text-3xl font-black ${g.color}`}>{g.temp}</div>
                      <div className="mt-2 text-sm text-gray-600">{g.label}</div>
                      <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${g.color === 'text-red-500' ? 'bg-red-100 text-red-700' : 'bg-green-50 text-emerald-700'}`}>{g.status}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-3xl bg-red-50 p-4 text-sm text-red-700">
                  <div className="font-semibold">Reach-in at 44°F — SMS + email sent to owner</div>
                  <div className="mt-1 text-xs text-red-500">Alert sent within 30 seconds of reading</div>
                </div>
              </div>
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5">
                <div className="text-2xl">💡</div>
                <p className="mt-4 text-sm leading-6 text-gray-700"><strong>Why this matters:</strong> Temperature violations (04A and 04C) carry up to 28 points each — the maximum possible for any single violation. One fridge running warm overnight can cost $2,000+ in fines and drop you from A to C. GradeA catches it first.</p>
              </div>
            </Reveal>
            <Reveal delay={80} className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
              <div className="space-y-4 text-sm text-gray-600">
                {[
                  'Reads every 5 minutes — catches problems before inspectors do',
                  'Violation → SMS + email + WhatsApp + push notification in <30 seconds',
                  '90-day temperature history for DOH compliance and HACCP',
                  'Works with DIY ESP32 kit (~$9) or commercial sensors: Govee ($15), SensorPush ($49)',
                  'Battery monitoring, WiFi signal strength, last-seen tracking per device',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-1 text-green-600">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-green-600">Feature 2</span>
            <h2 className="mb-5 text-3xl font-black text-gray-900">Smart daily checklists — built by owners, completed by staff.</h2>
            <p className="mb-10 max-w-3xl text-base leading-8 text-gray-600">GradeA comes with 200+ NYC DOH violation criteria filtered for your kitchen. But owners can also create their own custom items — anything specific to your kitchen, equipment, or neighborhood that isn't in the standard list.</p>
          </Reveal>
          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-gray-900">🏥 NYC DOH Built-in (200+ items)</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  'All 8 violation categories covered',
                  'Filtered for your cuisine type and equipment',
                  'Updated automatically when NYC DOH rules change',
                  'Each item linked to the exact violation code and fine amount',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 text-green-600">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={80} className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-gray-900">📌 Custom Items (owner-created)</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  'Add any item specific to your kitchen',
                  'Set severity (critical / general)',
                  'Assign to a category with custom instructions',
                  'Mark as photo-required (see Feature 3)',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 text-green-600">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <Reveal delay={160} className="mt-10 rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-gray-900">For staff — no login, no training needed</h3>
            <p className="mb-6 text-sm leading-7 text-gray-600">Owners share a unique link in their kitchen group chat. Staff open it on their phone, tap pass or fail on each item, and submit. The owner sees results in real time. The checklist works completely offline — no WiFi needed in basements.</p>
            <div className="flex flex-wrap gap-3">
              {['No login required', 'Works offline', 'Camera-first on mobile', 'Results visible in real time'].map((item) => (
                <span key={item} className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">{item}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-gray-50 px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-purple-600">Feature 3 — Unique to GradeA</span>
            <h2 className="mb-5 text-3xl font-black text-gray-900">Photo evidence with AI validation.<br />Staff can&apos;t fake it.</h2>
            <p className="mb-10 max-w-3xl text-base leading-8 text-gray-600">When an owner marks a checklist item as photo-required, staff must upload a live photo to complete that item. GradeA runs up to 4 layers of validation to ensure the photo is genuine and current.</p>
          </Reveal>
          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
              {PHOTO_STEPS.map((step) => (
                <div key={step.num} className="mb-6 rounded-3xl border border-gray-200 p-5">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-lg font-black text-green-700">{step.num}</div>
                  <div className="text-base font-semibold text-gray-900">{step.title}</div>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{step.desc}</p>
                  <p className="mt-3 text-sm font-semibold text-green-700">{step.result}</p>
                </div>
              ))}
            </Reveal>
            <Reveal delay={80} className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
              <p className="text-sm leading-7 text-gray-600">Owners choose which validation level to apply per checklist item. A fridge temperature photo might only need timestamp + hash. A corrective action might need full AI validation with a custom hint telling Gemini exactly what to look for: <em>&ldquo;fridge thermometer showing temperature in Fahrenheit&rdquo;</em>.</p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-green-600">Feature 4</span>
            <h2 className="mb-5 text-3xl font-black text-gray-900">AI that knows NYC DOH inside out.</h2>
            <p className="mb-10 max-w-3xl text-base leading-8 text-gray-600">GradeA uses Google Gemini AI for two things: predicting your specific violation risks before they happen, and answering any compliance question you have — 24 hours a day, specifically aware of your restaurant&apos;s profile.</p>
          </Reveal>
          <div className="grid gap-6 lg:grid-cols-2">
            {AI_FEATURES.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 80} className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
                <div className="mb-4 text-2xl">{feature.icon}</div>
                <h3 className="mb-4 text-lg font-bold text-gray-900">{feature.title}</h3>
                <p className="mb-5 text-sm leading-7 text-gray-600">{feature.desc}</p>
                <div className="rounded-3xl bg-gray-50 p-4 text-sm text-gray-600">
                  <p className="text-sm font-semibold text-gray-900">Example output:</p>
                  <p className="mt-3 leading-6">{feature.example}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={160} className="mt-10 rounded-3xl border border-amber-200 bg-amber-50/70 p-7 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🔥</div>
              <div>
                <p className="font-semibold text-gray-900">Practice Inspection Mode</p>
                <p className="mt-2 text-sm leading-7 text-gray-600">GradeA also includes a 10-question AI quiz that simulates a real DOH inspection. Staff and managers can test their knowledge, get immediate feedback, and track their score over time in analytics.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-gray-50 px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-green-600">All features</span>
            <h2 className="mb-10 text-3xl font-black text-gray-900">Everything in one platform.</h2>
          </Reveal>
          <div className="space-y-5">
            {MORE_FEATURES.map((item, index) => (
              <Reveal key={item.title} delay={index * 60} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4 text-xl">{item.emoji}</div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">{item.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-green-600">Why GradeA</span>
            <h2 className="mb-5 text-3xl font-black text-gray-900">Compared to every alternative.</h2>
            <p className="mb-10 max-w-3xl text-base leading-8 text-gray-600">Restaurant owners have four options for compliance management. Here’s how GradeA compares honestly to each one.</p>
          </Reveal>
          <div className="overflow-x-auto rounded-3xl border border-gray-200 shadow-sm">
            <table className="min-w-full border-collapse text-left text-sm text-gray-600">
              <thead className="bg-gray-100 text-gray-900">
                <tr>
                  <th className="px-5 py-4">Feature</th>
                  <th className="px-5 py-4">GradeA</th>
                  <th className="px-5 py-4">Paper / Manual</th>
                  <th className="px-5 py-4">Toast / Square</th>
                  <th className="px-5 py-4">Consultants</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row[0]} className="border-t border-gray-200">
                    <td className="px-5 py-4 font-medium text-gray-900">{row[0]}</td>
                    <td className="px-5 py-4">{renderStatusCell(row[1])}</td>
                    <td className="px-5 py-4">{renderStatusCell(row[2])}</td>
                    <td className="px-5 py-4">{renderStatusCell(row[3])}</td>
                    <td className="px-5 py-4">{renderStatusCell(row[4])}</td>
                  </tr>
                ))}
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td className="px-5 py-4 font-semibold text-gray-900">Monthly cost</td>
                  <td className="px-5 py-4 font-bold text-green-600">$39–$79</td>
                  <td className="px-5 py-4 text-gray-500">$0 (+ hidden time cost)</td>
                  <td className="px-5 py-4 text-gray-500">$150–$500+</td>
                  <td className="px-5 py-4 text-gray-500">$200–$500/hr</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="divider my-14 border-t border-gray-200"></div>
          <Reveal>
            <h3 className="mb-4 text-2xl font-semibold text-gray-900">The honest assessment</h3>
            <div className="grid gap-6 xl:grid-cols-2">
              {COMPARISON_NOTES.map((item) => (
                <div key={item.title} className={`rounded-3xl border-l-4 border ${item.accent} bg-white p-7 shadow-sm`}>
                  <h4 className={`text-lg font-semibold ${item.accent}`}>{item.title}</h4>
                  <p className="mt-3 text-sm leading-7 text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-gray-950 px-5 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-gray-400">Calculate your savings</span>
            <h2 className="mb-5 text-3xl font-black">What does GradeA save your restaurant?</h2>
            <p className="mb-10 max-w-3xl text-base leading-8 text-gray-400">Adjust the inputs below to see your personalised ROI.</p>
          </Reveal>
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-200">Number of restaurant locations</label>
                  <input type="range" min="1" max="5" value={roiLocations} onChange={(e) => setRoiLocations(Number(e.target.value))} className="w-full accent-green-500" />
                  <div className="text-sm text-gray-300">{roiLocations} location{roiLocations > 1 ? 's' : ''}</div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-200">Current compliance method</label>
                  <select value={roiMethod} onChange={(e) => setRoiMethod(Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-gray-900 px-4 py-3 text-sm text-gray-200">
                    {ROI_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-200">Hours/week spent on compliance admin</label>
                  <input type="range" min="1" max="20" value={roiHours} onChange={(e) => setRoiHours(Number(e.target.value))} className="w-full accent-green-500" />
                  <div className="text-sm text-gray-300">{roiHours} hrs/week</div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-200">GradeA plan</label>
                  <select value={roiPlan} onChange={(e) => setRoiPlan(Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-gray-900 px-4 py-3 text-sm text-gray-200">
                    <option value={39}>Starter ($39/mo)</option>
                    <option value={79}>Pro ($79/mo)</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4">
                {[
                  { label: 'Annual Savings', value: roiAnnual },
                  { label: 'Hours Saved / Year', value: roiHoursSaved },
                  { label: 'Payback Period', value: roiPayback },
                ].map((card) => (
                  <div key={card.label} className="rounded-3xl border border-white/10 bg-gray-900/80 p-6 text-center transition-transform duration-300 ease-out hover:-translate-y-1">
                    <div className="text-4xl font-black text-white transition-colors duration-300">{card.value}</div>
                    <div className="mt-2 text-sm uppercase tracking-[0.22em] text-gray-400">{card.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-8 text-sm leading-7 text-gray-400">{roiSummary}</p>
          </div>
        </div>
      </section>

      <section className="px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-green-600">Pricing</span>
            <h2 className="mb-5 text-3xl font-black text-gray-900">Simple, transparent pricing.<br />Less than one fine per year.</h2>
          </Reveal>
          <div className="grid gap-6 xl:grid-cols-4">
            {PRICING_PLANS.map((plan) => (
              <Reveal key={plan.title} className={`rounded-3xl border p-6 shadow-sm ${plan.highlight ? 'border-green-500 bg-white' : 'border-gray-200 bg-white'}`}>
                <div className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">{plan.title}</div>
                <div className={`text-4xl font-black ${plan.highlight ? 'text-green-600' : 'text-gray-900'}`}>{plan.price}</div>
                <div className="mt-2 text-sm text-gray-500">/month</div>
                <div className={`mt-3 text-sm font-semibold ${plan.highlight ? 'text-green-700' : 'text-gray-600'}`}>{plan.note}</div>
                <ul className="mt-5 space-y-2 text-sm text-gray-600">
                  {plan.features.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1 text-green-600">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
          <Reveal delay={80} className="mt-10 rounded-3xl border border-green-200 bg-green-50/70 p-7 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="text-3xl">📐</div>
              <p className="text-sm leading-7 text-gray-700"><strong>The math is simple:</strong> One avoided DOH violation fine ($200–$2,000) pays for <strong>5 to 50 months of GradeA Pro</strong>. Annual cost of GradeA Pro: $948. Annual cost of doing nothing and getting caught: potentially $10,000+ in fines plus revenue loss from a lower grade.</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-gray-50 px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-green-600">What restaurant owners say</span>
            <h2 className="mb-10 text-3xl font-black text-gray-900">Real kitchens. Real results.</h2>
          </Reveal>
          <div className="grid gap-6 xl:grid-cols-3">
            {TESTIMONIALS.map((t, index) => (
              <Reveal key={t.name} delay={index * 60} className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
                <div className="mb-5 text-amber-400">★★★★★</div>
                <p className="mb-6 text-sm leading-7 text-gray-700">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">{t.name[0]}</div>
                  <div>
                    <div className="font-semibold text-gray-900">{t.name}</div>
                    <div className="text-sm text-gray-500">{t.biz}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-green-600">Next steps</span>
            <h2 className="mb-10 text-3xl font-black text-gray-900">Ready in 10 minutes.</h2>
          </Reveal>
          <div className="grid gap-6 xl:grid-cols-3">
            {START_STEPS.map((item, index) => (
              <Reveal key={item.title} delay={index * 60} className="rounded-3xl border border-gray-200 bg-white p-7 text-center shadow-sm">
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-400 text-xl font-black text-white">{item.num}</div>
                <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-gray-600">{item.desc}</p>
              </Reveal>
            ))}
          </div>
          <Reveal delay={80} className="mt-12 rounded-[32px] bg-gradient-to-br from-gray-950 via-zinc-900 to-slate-950 px-8 py-14 text-center text-white shadow-[0_30px_90px_rgba(0,0,0,0.22)]">
            <h2 className="mb-4 text-4xl font-black leading-tight">An A grade is not luck.<br />It&apos;s <span className="bg-gradient-to-r from-emerald-300 to-green-400 bg-clip-text text-transparent">daily preparation.</span></h2>
            <p className="mb-8 text-base leading-7 text-gray-300">Start your free 14-day trial. Your kitchen will be inspection-ready by tomorrow morning.</p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/register" className="btn-primary px-8 py-4 text-base">
                Start free trial <ArrowRight size={16} />
              </Link>
              <a href="mailto:ddv841999@gmail.com" className="btn-secondary px-8 py-4">
                Talk to us first
              </a>
            </div>
            <p className="mt-5 text-sm text-gray-500">14-day free trial · $39/month after · Cancel anytime · No contracts</p>
          </Reveal>
          <Reveal delay={160} className="mt-10 rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="text-3xl">📩</div>
              <div>
                <p className="font-semibold text-gray-900">Questions? Talk to a real person.</p>
                <p className="mt-2 text-sm leading-7 text-gray-600">Email us at <strong>ddv841999@gmail.com</strong> — we respond within 2 hours on business days. We&apos;ll walk you through setup on a 15-minute screen share, at no charge.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl transition-transform duration-300 hover:-translate-y-1 hover:bg-emerald-600"
          aria-label="Scroll to top"
        >
          <ArrowUp size={22} />
        </button>
      )}

      <footer className="border-t border-white/5 bg-gray-950 px-5 py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 sm:flex-row">
          <span className="text-sm font-extrabold text-gray-600">Grade<span className="text-green-600">A</span></span>
          <div className="flex gap-5">
            {['Privacy', 'Terms', 'Contact', 'NYC DOH Data'].map((l) => (
              <a key={l} href="#" className="text-xs text-gray-600 transition-colors hover:text-gray-400">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
