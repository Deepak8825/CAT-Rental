/**
 * MyRentalsPage — All bookings with status pipeline and filters
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { FileText, Clock } from 'lucide-react'

const API = 'http://localhost:8000/api/v1'

export default function MyRentalsPage({ onNavigate }) {
  const { authFetch } = useAuth()
  const [bookings, setBookings] = useState([])
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch(`${API}/customer/bookings`)
        if (res.ok) setBookings(await res.json())
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filter === 'ALL' ? bookings : bookings.filter(b => b.status === filter.toLowerCase())

  const getStatusColor = (s) => {
    const map = { requested:'#d97706', quoted:'#FFC500', confirmed:'#3b82f6', dispatched:'#8b5cf6', active:'#16a34a', returning:'#f59e0b', completed:'#666', cancelled:'#dc2626' }
    return map[s] || '#666'
  }

  const handleAcceptQuote = async (bookingId) => {
    try {
      const res = await authFetch(`${API}/customer/bookings/${bookingId}/accept-quote`, { method: 'POST' })
      if (res.ok) {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'confirmed' } : b))
      }
    } catch {}
  }

  return (
    <div className="page-content">
      <div className="feature-filter-bar" style={{ marginBottom: 20 }}>
        <div className="filter-controls-group">
          <div className="filter-group">
            <label className="filter-label">Status:</label>
            <div className="filter-pills">
              {['ALL','REQUESTED','QUOTED','CONFIRMED','ACTIVE','COMPLETED'].map(s => (
                <button key={s} className={`filter-pill ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="chart-card full-width" style={{ padding: 40, textAlign: 'center' }}>Loading bookings...</div>
      ) : filtered.length === 0 ? (
        <div className="chart-card full-width" style={{ padding: 40, textAlign: 'center' }}>
          <FileText size={40} style={{ color: '#999', marginBottom: 12 }} />
          <p style={{ color: '#666' }}>No bookings found</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => onNavigate('book')}>Create Booking</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(b => (
            <div key={b.id} className="chart-card full-width" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: '#2E2725' }}>{b.job_type}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 4, background: `${getStatusColor(b.status)}15`, color: getStatusColor(b.status), textTransform: 'uppercase' }}>
                      {b.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    📍 {b.location} • {b.duration_days} days • Starts {b.start_date}
                  </div>
                  {b.total_price && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#2E2725', marginTop: 4 }}>Total: ₹{b.total_price?.toLocaleString()}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {b.status === 'quoted' && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleAcceptQuote(b.id)}>Accept Quote</button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('track')}>Track</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
