/**
 * RegisterPage — Customer self-registration form.
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { UserPlus, AlertTriangle } from 'lucide-react'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(name, email, password, company, phone)
      navigate('/customer/profile', { replace: true })
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 480 }}>
        <div className="login-logo">
          <div className="login-logo-icon">CAT</div>
          <h1 className="login-title">Create Account</h1>
          <p className="login-subtitle">Register as a Caterpillar Dealer customer</p>
        </div>

        {error && (
          <div className="login-error">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label>Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Smith" required />
          </div>

          <div className="login-field">
            <label>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
          </div>

          <div className="login-field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" required minLength={6} />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div className="login-field" style={{ flex: 1 }}>
              <label>Company Name</label>
              <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Your company" />
            </div>
            <div className="login-field" style={{ flex: 1 }}>
              <label>Phone Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
          </div>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Creating Account...' : <><UserPlus size={16} /> Create Account</>}
          </button>
        </form>

        <div className="login-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
