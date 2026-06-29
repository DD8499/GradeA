import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { NotificationBell } from './LiveGauge'
import {
  LayoutDashboard, ClipboardCheck, Thermometer,
  AlertTriangle, Settings, LogOut, ShieldCheck,
  Wifi, BarChart2, Bell, FolderOpen, Users,
  CheckSquare, ClipboardList, MessageCircle,
  ListChecks, Flame
} from 'lucide-react'

const NAV = [
  { group: 'Main',
    items: [
      { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/analytics',    icon: BarChart2,        label: 'Analytics' },
    ]
  },
  { group: 'Daily Ops',
    items: [
      { to: '/checklist',    icon: ClipboardCheck,   label: 'Daily Checklist' },
      { to: '/checklist-builder', icon: ListChecks,  label: 'My Checklists',  badge: 'Custom' },
      { to: '/temperatures', icon: Thermometer,      label: 'Temperatures' },
      { to: '/sensors',      icon: Wifi,             label: 'Live Sensors',   badge: 'IoT' },
    ]
  },
  { group: 'Compliance',
    items: [
      { to: '/violations',   icon: AlertTriangle,    label: 'AI Risk Report' },
      { to: '/corrective',   icon: CheckSquare,      label: 'Actions' },
      { to: '/visits',       icon: ClipboardList,    label: 'Inspector Visits' },
      { to: '/practice',     icon: Flame,            label: 'Practice Mode',  badge: 'AI' },
    ]
  },
  { group: 'Management',
    items: [
      { to: '/staff',        icon: Users,            label: 'Staff & Certs' },
      { to: '/documents',    icon: FolderOpen,       label: 'Documents' },
      { to: '/chat',         icon: MessageCircle,    label: 'AI Assistant',   badge: 'AI' },
    ]
  },
]

export default function Sidebar({ restaurantName }) {
  const { signOut } = useAuth()
  const navigate    = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside style={{ background: 'var(--navy)', minHeight: '100vh' }}
      className="w-56 shrink-0 flex flex-col border-r border-white/[0.06]">

      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-1">
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(140deg,#22C55E,#16A34A)', boxShadow: '0 4px 12px rgba(22,163,74,.35)' }}>
              <ShieldCheck size={15} className="text-white" />
            </div>
            <span className="font-black text-lg text-white tracking-tight" style={{ letterSpacing: '-.03em' }}>
              Grade<span style={{ color: '#4ADE80' }}>A</span>
            </span>
          </NavLink>
          <NotificationBell />
        </div>
        {restaurantName && (
          <p className="text-xs truncate pl-10" style={{ color: 'rgba(255,255,255,.28)' }}>
            {restaurantName}
          </p>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV.map(group => (
          <div key={group.group} className="mb-4">
            <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,.22)', letterSpacing: '.12em' }}>
              {group.group}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label, badge }) => (
                <NavLink key={to} to={to}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                  <Icon size={15} className="shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                  {badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ background: 'rgba(74,222,128,.12)', color: '#4ADE80' }}>
                      {badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-3 space-y-0.5 border-t border-white/[0.06] pt-3">
        <NavLink to="/notifications" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Bell size={15} /><span>Notifications</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Settings size={15} /><span>Settings</span>
        </NavLink>
        <button onClick={handleSignOut}
          className="sidebar-link w-full hover:!bg-red-500/10 hover:!text-red-400">
          <LogOut size={15} /><span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
