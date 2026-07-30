/**
 * CustomerSettingsPage — Account preferences and notification settings
 */
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Settings, Bell, Shield, Eye } from 'lucide-react'

export default function CustomerSettingsPage() {
  const { user } = useAuth()
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [smsNotifs, setSmsNotifs] = useState(false)
  const [bookingAlerts, setBookingAlerts] = useState(true)
  const [paymentAlerts, setPaymentAlerts] = useState(true)
  const [aiSuggestions, setAiSuggestions] = useState(true)

  return (
    <div className="page-content">
      <div className="charts-grid">
        {/* Notification Preferences */}
        <div className="chart-card">
          <div className="card-header">
            <h3 className="card-title">Notification Preferences</h3>
            <Bell size={18} style={{ color: '#FFC500' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Email Notifications', desc: 'Receive updates via email', state: emailNotifs, setter: setEmailNotifs },
              { label: 'SMS Alerts', desc: 'Critical alerts via SMS', state: smsNotifs, setter: setSmsNotifs },
              { label: 'Booking Status Updates', desc: 'Get notified when booking status changes', state: bookingAlerts, setter: setBookingAlerts },
              { label: 'Payment Confirmations', desc: 'Receipts and payment notifications', state: paymentAlerts, setter: setPaymentAlerts },
              { label: 'AI Recommendations', desc: 'Receive AI-powered suggestions for optimization', state: aiSuggestions, setter: setAiSuggestions },
            ].map((opt, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#2E2725', fontSize: 13 }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>{opt.desc}</div>
                </div>
                <input type="checkbox" checked={opt.state} onChange={e => opt.setter(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#FFC500', cursor: 'pointer' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Account Info */}
        <div className="chart-card">
          <div className="card-header">
            <h3 className="card-title">Account Details</h3>
            <Shield size={18} style={{ color: '#2E2725' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: 12, background: '#FAFAFA', borderRadius: 6 }}>
              <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase' }}>Email</div>
              <div style={{ fontWeight: 600, color: '#2E2725' }}>{user?.email || 'Not available'}</div>
            </div>
            <div style={{ padding: 12, background: '#FAFAFA', borderRadius: 6 }}>
              <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase' }}>Account Type</div>
              <div style={{ fontWeight: 600, color: '#2E2725' }}>Customer</div>
            </div>
            <div style={{ padding: 12, background: '#FAFAFA', borderRadius: 6 }}>
              <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase' }}>Platform</div>
              <div style={{ fontWeight: 600, color: '#2E2725' }}>Caterpillar Dealer Asset Intelligence</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
