/**
 * CustomerDashboard — Active rentals overview, countdown, AI suggestions
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Package, FileText, CreditCard, Clock, ShoppingCart, ArrowRight, Brain, MapPin, Activity } from 'lucide-react'

const API = 'http://localhost:8000/api/v1'

export default function CustomerDashboard({ onNavigate }) {
  const { authFetch } = useAuth()
  const [bookings, setBookings] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [bRes, nRes] = await Promise.all([
          authFetch(`${API}/customer/bookings`),
          authFetch(`${API}/customer/notifications`)
        ])
        if (bRes.ok) setBookings(await bRes.json())
        if (nRes.ok) setNotifications(await nRes.json())
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const active = bookings.filter(b => b.status === 'active' || b.status === 'dispatched')
  const pending = bookings.filter(b => b.status === 'requested' || b.status === 'quoted')
  const totalSpent = bookings.filter(b => b.total_price).reduce((a, b) => a + (b.total_price || 0), 0)

  const getStatusColor = (s) => {
    const map = { requested: '#d97706', quoted: '#FFC500', confirmed: '#3b82f6', dispatched: '#8b5cf6', active: '#16a34a', returning: '#f59e0b', completed: '#666', cancelled: '#dc2626' }
    return map[s] || '#666'
  }

  return (
    <div className="page-content">
      {/* Welcome & Quick Actions */}
      <div className="chart-card full-width" style={{ background: 'linear-gradient(135deg, #2E2725 0%, #1a1614 100%)', border: 'none', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: '#FFC500', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Welcome back!</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Manage your equipment rentals, track deliveries, and access AI recommendations.</p>
          </div>
          <button className="btn btn-primary" onClick={() => onNavigate('book')}>
            <ShoppingCart size={16} /> Book New Equipment
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-icon"><Activity size={22} /></div>
          <div className="stat-label">Active Rentals</div>
          <div className="stat-value">{active.length}</div>
          <div className="stat-change positive">Currently On Site</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon"><Clock size={22} /></div>
          <div className="stat-label">Pending Requests</div>
          <div className="stat-value">{pending.length}</div>
          <div className="stat-change positive">Awaiting Review</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><Package size={22} /></div>
          <div className="stat-label">Total Bookings</div>
          <div className="stat-value">{bookings.length}</div>
          <div className="stat-change positive">All Time</div>
        </div>
        <div className="stat-card violet">
          <div className="stat-icon"><CreditCard size={22} /></div>
          <div className="stat-label">Total Spend</div>
          <div className="stat-value">₹{(totalSpent / 100000).toFixed(1)}L</div>
          <div className="stat-change positive">Lifetime</div>
        </div>
      </div>

      {/* Recent Bookings & Notifications */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Recent Bookings</h3>
              <p className="card-subtitle">Latest rental requests and status</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('rentals')}>View All <ArrowRight size={12} /></button>
          </div>
          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#666' }}>Loading...</div>
          ) : bookings.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center' }}>
              <p style={{ color: '#999', marginBottom: 12 }}>No bookings yet</p>
              <button className="btn btn-primary" onClick={() => onNavigate('book')}>Create Your First Booking</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bookings.slice(0, 5).map(b => (
                <div key={b.id} style={{ padding: 12, background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#2E2725' }}>{b.job_type} — {b.location}</div>
                    <div style={{ fontSize: 11, color: '#666' }}>{b.duration_days} days • Starts {b.start_date}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 4, background: `${getStatusColor(b.status)}18`, color: getStatusColor(b.status), textTransform: 'uppercase' }}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="chart-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Notifications</h3>
              <p className="card-subtitle">Recent updates and alerts</p>
            </div>
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>No notifications</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {notifications.slice(0, 8).map(n => (
                <div key={n.id} style={{ padding: 10, background: n.is_read ? '#FAFAFA' : '#FFF9E6', border: `1px solid ${n.is_read ? '#E5E5E5' : '#FFC500'}`, borderRadius: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#2E2725' }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{n.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="chart-card full-width">
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { icon: ShoppingCart, label: 'Book Equipment', page: 'book', color: '#FFC500' },
            { icon: Brain, label: 'AI Recommendation', page: 'ai-recommend', color: '#8b5cf6' },
            { icon: MapPin, label: 'Track Delivery', page: 'track', color: '#16a34a' },
            { icon: FileText, label: 'View Invoices', page: 'invoices', color: '#3b82f6' },
          ].map((action, i) => {
            const Icon = action.icon
            return (
              <button key={i} onClick={() => onNavigate(action.page)} style={{
                padding: 20, background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: 6,
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                transition: 'all 0.2s'
              }}>
                <Icon size={24} style={{ color: action.color }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#2E2725' }}>{action.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
