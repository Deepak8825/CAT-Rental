/**
 * ProfilePage — Customer profile completion and management
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { User, CheckCircle2, Save } from 'lucide-react'

const API = 'http://localhost:8000/api/v1'

export default function ProfilePage() {
  const { authFetch } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    company: '', phone: '', business_type: '', gst_number: '',
    insurance_provider: '', insurance_policy_number: '',
    billing_address: '', site_address: '',
    preferred_locations: [], preferred_categories: [],
  })

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch(`${API}/customer/profile`)
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
          setForm({
            company: data.company || '',
            phone: data.phone || '',
            business_type: data.profile?.business_type || '',
            gst_number: data.profile?.gst_number || '',
            insurance_provider: data.profile?.insurance_provider || '',
            insurance_policy_number: data.profile?.insurance_policy_number || '',
            billing_address: data.profile?.billing_address || '',
            site_address: data.profile?.site_address || '',
            preferred_locations: data.profile?.preferred_locations || [],
            preferred_categories: data.profile?.preferred_categories || [],
          })
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const res = await authFetch(`${API}/customer/profile`, {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      if (res.ok) setMessage('Profile updated successfully!')
    } catch {}
    setSaving(false)
  }

  if (loading) return <div className="page-content"><div style={{ padding: 40, textAlign: 'center' }}>Loading profile...</div></div>

  return (
    <div className="page-content">
      {/* Completion Status */}
      <div className="chart-card full-width" style={{ marginBottom: 20, background: profile?.profile?.profile_completed ? '#f0fdf4' : '#FFF9E6', border: `1px solid ${profile?.profile?.profile_completed ? '#16a34a' : '#FFC500'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {profile?.profile?.profile_completed ? <CheckCircle2 size={22} style={{ color: '#16a34a' }} /> : <User size={22} style={{ color: '#d97706' }} />}
          <div>
            <div style={{ fontWeight: 700, color: '#2E2725' }}>{profile?.profile?.profile_completed ? 'Profile Complete' : 'Complete Your Profile'}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{profile?.profile?.profile_completed ? 'Your account is verified and ready for bookings' : 'Fill in business details, GST, and billing address to unlock full features'}</div>
          </div>
        </div>
      </div>

      {message && <div style={{ padding: 12, background: '#f0fdf4', border: '1px solid #16a34a', borderRadius: 6, color: '#16a34a', fontWeight: 600, fontSize: 13, marginBottom: 16 }}>{message}</div>}

      <form onSubmit={handleSave}>
        <div className="charts-grid">
          {/* Business Info */}
          <div className="chart-card">
            <div className="card-header"><h3 className="card-title">Business Information</h3></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="login-field">
                <label>Company Name</label>
                <input type="text" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="Your company name" />
              </div>
              <div className="login-field">
                <label>Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" />
              </div>
              <div className="login-field">
                <label>Business Type</label>
                <select className="filter-select" style={{ width: '100%' }} value={form.business_type} onChange={e => setForm(p => ({ ...p, business_type: e.target.value }))}>
                  <option value="">Select...</option>
                  <option value="construction">Construction</option>
                  <option value="mining">Mining</option>
                  <option value="infrastructure">Infrastructure</option>
                  <option value="agriculture">Agriculture</option>
                  <option value="real_estate">Real Estate</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="login-field">
                <label>GST Number</label>
                <input type="text" value={form.gst_number} onChange={e => setForm(p => ({ ...p, gst_number: e.target.value }))} placeholder="22AAAAA0000A1Z5" />
              </div>
            </div>
          </div>

          {/* Insurance & Address */}
          <div className="chart-card">
            <div className="card-header"><h3 className="card-title">Insurance & Address</h3></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="login-field">
                <label>Insurance Provider</label>
                <input type="text" value={form.insurance_provider} onChange={e => setForm(p => ({ ...p, insurance_provider: e.target.value }))} placeholder="ICICI Lombard" />
              </div>
              <div className="login-field">
                <label>Policy Number</label>
                <input type="text" value={form.insurance_policy_number} onChange={e => setForm(p => ({ ...p, insurance_policy_number: e.target.value }))} placeholder="POL-2025-XXXX" />
              </div>
              <div className="login-field">
                <label>Billing Address</label>
                <textarea value={form.billing_address} onChange={e => setForm(p => ({ ...p, billing_address: e.target.value }))} rows={2} style={{ width: '100%', padding: 8, border: '1px solid #E5E5E5', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} placeholder="Registered office address" />
              </div>
              <div className="login-field">
                <label>Default Site Address</label>
                <textarea value={form.site_address} onChange={e => setForm(p => ({ ...p, site_address: e.target.value }))} rows={2} style={{ width: '100%', padding: 8, border: '1px solid #E5E5E5', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} placeholder="Primary construction site" />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}
