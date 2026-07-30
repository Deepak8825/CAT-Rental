/**
 * Caterpillar Dealer Asset Management Platform — Main Application
 * Multi-Role Routing Architecture (/login, /admin/*, /customer/*)
 */
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminLayout from './layouts/AdminLayout'
import CustomerLayout from './layouts/CustomerLayout'

export default function App() {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Admin Portal (Protected) */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      />

      {/* Customer Portal (Protected) */}
      <Route
        path="/customer/*"
        element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout />
          </ProtectedRoute>
        }
      />

      {/* Default Catch-All */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
