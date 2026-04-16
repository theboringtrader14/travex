import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Topbar    from './components/Topbar'
import GlobePage  from './pages/GlobePage'
import TripsPage  from './pages/TripsPage'
import BudgetPage from './pages/BudgetPage'
import BuddyPage  from './pages/BuddyPage'
import StatsPage  from './pages/StatsPage'

function AppShell() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index       element={<GlobePage />}  />
          <Route path="/trips"  element={<TripsPage />}  />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/buddy"  element={<BuddyPage />}  />
          <Route path="/stats"  element={<StatsPage />}  />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
