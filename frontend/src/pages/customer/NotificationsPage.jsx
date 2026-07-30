/**
 * NotificationsPage — Notification feed with read/unread
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Bell, CheckCircle2, ShoppingCart, CreditCard, AlertTriangle, Brain } from 'lucide-react'

const API = 'http://localhost:8000/api/v1'

export default function NotificationsPage() {
  const { authFetch } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch(`${API}/customer/notifications`)
        if (res.ok) setNotifications(await res.json())
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const markRead = async (id) => {
    try {
      await authFetch(`${API}/customer/notifications/${id}/read`, { method: 'PUT' })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch {}
  }

  const getCategoryIcon = (cat) => {
    const map = { booking: ShoppingCart, payment: CreditCard, alert: AlertTriangle, ai: Brain }
    return map[cat] || Bell
  }

  return (
    <div className="page-content">
      <div className="chart-card full-width">
        <div className="card-header">
          <h3 className="card-title">Notifications</h3>
          <p className="card-subtitle">{notifications.filter(n => !n.is_read).length} unread</p>
        </div>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center' }}>Loading...</div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
            <Bell size={40} style={{ marginBottom: 12, color: '#ccc' }} />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.map(n => {
              const Icon = getCategoryIcon(n.category)
              return (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  style={{ padding: 14, background: n.is_read ? '#FAFAFA' : '#FFF9E6', border: `1px solid ${n.is_read ? '#E5E5E5' : '#FFC500'}`, borderRadius: 6, display: 'flex', gap: 12, cursor: n.is_read ? 'default' : 'pointer' }}
                >
                  <Icon size={18} style={{ color: n.is_read ? '#999' : '#FFC500', marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: n.is_read ? 500 : 700, fontSize: 13, color: '#2E2725' }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{n.message}</div>
                    <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</div>
                  </div>
                  {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFC500', alignSelf: 'center' }}></div>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
