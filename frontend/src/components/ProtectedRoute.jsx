/**
 * ProtectedRoute — Role-based route guard component.
 * Redirects unauthenticated users to /login.
 * Redirects users with wrong role to their correct dashboard.
 */
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, role, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#F5F5F5', color: '#2E2725', fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 16px', width: 40, height: 40 }}></div>
          <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Authenticating...
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && role !== requiredRole) {
    // Redirect to the correct portal
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />
    if (role === 'customer') return <Navigate to="/customer/dashboard" replace />
    return <Navigate to="/login" replace />
  }

  return children
}
