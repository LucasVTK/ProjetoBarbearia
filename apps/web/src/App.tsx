import { Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { AdminLayout } from './layouts/AdminLayout'
import { DashboardPage } from './pages/admin/DashboardPage'
import { ServicesPage } from './pages/admin/ServicesPage'
import { AgendaPage } from './pages/admin/AgendaPage'
import { ClientsPage } from './pages/admin/ClientsPage'
import { FinancePage } from './pages/admin/FinancePage'
import { ProfessionalsPage } from './pages/admin/ProfessionalsPage'
import { SettingsPage } from './pages/admin/SettingsPage'
import { BookingPage } from './pages/booking/BookingPage'
import { CancelPage } from './pages/booking/CancelPage'
import { ProtectedRoute } from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      {/* Público */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* App do cliente — público */}
      <Route path="/agendar/:slug" element={<BookingPage />} />
      <Route path="/cancelar/:token" element={<CancelPage />} />

      {/* Painel admin — protegido */}
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="agenda"   element={<AgendaPage />} />
        <Route path="services"      element={<ServicesPage />} />
        <Route path="professionals" element={<ProfessionalsPage />} />
        <Route path="clients"       element={<ClientsPage />} />
        <Route path="finance"       element={<FinancePage />} />
        <Route path="settings"      element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
