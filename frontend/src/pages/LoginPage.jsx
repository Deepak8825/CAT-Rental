/**
 * LoginPage — Unified login with Admin/Customer role tabs.
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogIn, Shield, Users, Eye, EyeOff, AlertTriangle } from 'lucide-react'

export default function LoginPage() {
  const [loginRole, setLoginRole] = useState('customer')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(email, password, loginRole)
      if (data.role === 'admin') {
        navigate('/admin/dashboard', { replace: true })
      } else {
        navigate('/customer/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const seedAdmin = async () => {
    try {
      await fetch('http://localhost:8000/api/v1/auth/seed-admin', { method: 'POST' })
      if (loginRole === 'admin') {
        setEmail('admin01@gmail.com')
        setPassword('passadmin123')
      } else {
        setEmail('user01@gmail.com')
        setPassword('pass123')
      }
    } catch {
      if (loginRole === 'admin') {
        setEmail('admin01@gmail.com')
        setPassword('passadmin123')
      } else {
        setEmail('user01@gmail.com')
        setPassword('pass123')
      }
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">CAT</div>
          <h1 className="login-title">Caterpillar Dealer</h1>
          <p className="login-subtitle">Asset Intelligence Platform</p>
        </div>

        {/* Role Tabs */}
        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${loginRole === 'customer' ? 'active' : ''}`}
            onClick={() => { setLoginRole('customer'); setEmail(''); setPassword('') }}
          >
            <Users size={16} /> Customer
          </button>
          <button
            type="button"
            className={`login-tab ${loginRole === 'admin' ? 'active' : ''}`}
            onClick={() => { setLoginRole('admin'); setEmail(''); setPassword('') }}
          >
            <Shield size={16} /> Admin
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="login-error">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={loginRole === 'admin' ? 'admin01@gmail.com' : 'user01@gmail.com'}
              required
            />
          </div>

          <div className="login-field">
            <label>Password</label>
            <div className="login-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={loginRole === 'admin' ? 'passadmin123' : 'pass123'}
                required
              />
              <button type="button" className="login-eye" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? (
              <><div className="loading-spinner" style={{ width: 16, height: 16 }}></div> Signing In...</>
            ) : (
              <><LogIn size={16} /> Sign In as {loginRole === 'admin' ? 'Administrator' : 'Customer'}</>
            )}
          </button>
        </form>

        {/* Quick Autofill Helper */}
        <div className="login-footer" style={{ marginTop: 16 }}>
          <button type="button" onClick={seedAdmin} className="login-seed-btn">
            ⚡ Auto-Fill Demo Credentials ({loginRole === 'admin' ? 'admin01@gmail.com' : 'user01@gmail.com'})
          </button>
        </div>

        {/* Register link (customers only) */}
        {loginRole === 'customer' && (
          <div className="login-footer" style={{ marginTop: 12 }}>
            Don't have an account? <Link to="/register">Register here</Link>
          </div>
        )}
      </div>
    </div>
  )
}
