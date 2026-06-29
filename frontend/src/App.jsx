import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'

import Landing           from './pages/Landing'
import Login             from './pages/Login'
import Register          from './pages/Register'
import Onboarding        from './pages/Onboarding'
import Dashboard         from './pages/Dashboard'
import DailyChecklist    from './pages/DailyChecklist'
import ChecklistBuilder  from './pages/ChecklistBuilder'
import StaffChecklist    from './pages/StaffChecklist'
import Temperatures      from './pages/Temperatures'
import ViolationReport   from './pages/ViolationReport'
import Settings          from './pages/Settings'
import SensorDashboard   from './pages/SensorDashboard'
import Analytics         from './pages/Analytics'
import PracticeMode      from './pages/PracticeMode'
import { NotificationCenter, DocumentVault, StaffManagement } from './pages/NotificationCenter'
import { AIChat, CorrectiveActions, InspectorVisit }          from './pages/AIChat'

const P = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"             element={<Landing />} />
        <Route path="/login"        element={<Login />} />
        <Route path="/register"     element={<Register />} />
        <Route path="/staff/:token" element={<StaffChecklist />} />

        <Route path="/onboarding"         element={<P><Onboarding /></P>} />
        <Route path="/dashboard"          element={<P><Dashboard /></P>} />
        <Route path="/checklist"          element={<P><DailyChecklist /></P>} />
        <Route path="/checklist-builder"  element={<P><ChecklistBuilder /></P>} />
        <Route path="/temperatures"       element={<P><Temperatures /></P>} />
        <Route path="/sensors"            element={<P><SensorDashboard /></P>} />
        <Route path="/violations"         element={<P><ViolationReport /></P>} />
        <Route path="/analytics"          element={<P><Analytics /></P>} />
        <Route path="/practice"           element={<P><PracticeMode /></P>} />
        <Route path="/notifications"      element={<P><NotificationCenter /></P>} />
        <Route path="/documents"          element={<P><DocumentVault /></P>} />
        <Route path="/staff"              element={<P><StaffManagement /></P>} />
        <Route path="/corrective"         element={<P><CorrectiveActions /></P>} />
        <Route path="/visits"             element={<P><InspectorVisit /></P>} />
        <Route path="/chat"               element={<P><AIChat /></P>} />
        <Route path="/settings"           element={<P><Settings /></P>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
