/**
 * MyRentalsPage — All bookings with status pipeline, filters, and auto-refresh
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { FileText, Clock, CheckCircle, Truck, ArrowRight, RefreshCw } from 'lucide-react'

const API = 'http://localhost:8000/api/v1'

export default function MyRentalsPage({ onNavigate }) {
  const { authFetch } = useAuth()
  const [bookings, setBookings] = useState([])
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchBookings = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    try {
      const res = await authFetch(`${API}/customer/bookings`)
      if (res.ok) setBookings(await res.json())
    } catch (err) {
      console.error('Fetch bookings error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchBookings()

    // Poll every 8s so dealer approvals reflect in real time
    const interval = setInterval(() => {
      fetchBookings(false)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  const filtered = filter === 'ALL' ? bookings : bookings.filter(b => b.status === filter.toLowerCase())

  const getStatusColor = (s) => {
    const map = {
      requested: '#d97706',
      quoted: '#FFC500',
      confirmed: '#3b82f6',
      dispatched: '#8b5cf6',
      active: '#16a34a',
      returning: '#f59e0b',
      completed: '#666',
      cancelled: '#dc2626'
    }
    return map[s] || '#666'
  }

  const handleAcceptQuote = async (bookingId) => {
    try {
      const res = await authFetch(`${API}/customer/bookings/${bookingId}/accept-quote`, { method: 'POST' })
      if (res.ok) {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'confirmed' } : b))
        fetchBookings(false)
      }
    } catch {}
  }

  return (
    <div className="page-content">
      {/* Header & Filter bar */}
      <div className="feature-filter-bar" style={{ marginBottom: 20 }}>
        <div className="filter-controls-group">
          <div className="filter-group">
            <label className="filter-label">Filter Status:</label>
            <div className="filter-pills">
              {['ALL','REQUESTED','QUOTED','CONFIRMED','DISPATCHED','ACTIVE','COMPLETED'].map(s => (
                <button
                  key={s}
                  className={`filter-pill ${filter === s ? 'active' : ''}`}
                  onClick={() => setFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => fetchBookings(true)}
          title="Refresh Bookings"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="chart-card full-width" style={{ padding: 40, textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 12px' }}></div>
          Loading your bookings...
        </div>
      ) : filtered.length === 0 ? (
        <div className="chart-card full-width" style={{ padding: 40, textAlign: 'center' }}>
          <FileText size={40} style={{ color: '#999', marginBottom: 12 }} />
          <p style={{ color: '#666' }}>No bookings found</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => onNavigate('book')}>Create Booking</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(b => {
            const st = String(b.status).toLowerCase()

            return (
              <div key={b.id} className="chart-card full-width" style={{
                padding: 20,
                borderLeft: `4px solid ${getStatusColor(st)}`,
                position: 'relative',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    {/* Header Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 16, color: '#2E2725' }}>{b.job_type}</span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: 6,
                        background: `${getStatusColor(st)}18`,
                        color: getStatusColor(st),
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}>
                        {st}
                      </span>
                    </div>

                    {/* Subtitle / Details */}
                    <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                      📍 {b.location} • {b.duration_days} days • Starts {b.start_date}
                    </div>

                    {/* Dealer Status Banners */}
                    {st === 'quoted' && b.has_quotation && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E',
                        padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        marginTop: 4, marginBottom: 8,
                      }}>
                        <Clock size={16} /> ⏳ Quotation Received — Awaiting Dealer Approval after acceptance
                      </div>
                    )}

                    {st === 'dispatched' && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: '#F3E8FF', border: '1px solid #C084FC', color: '#6B21A8',
                        padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        marginTop: 4, marginBottom: 8,
                      }}>
                        <Truck size={16} /> 🚚 Approved & Dispatched by Caterpillar Dealer
                      </div>
                    )}

                    {st === 'confirmed' && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: '#EFF6FF', border: '1px solid #93C5FD', color: '#1E40AF',
                        padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        marginTop: 4, marginBottom: 8,
                      }}>
                        <CheckCircle size={16} /> ✅ Confirmed by Caterpillar Dealer
                      </div>
                    )}

                    {b.total_price && (
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#2E2725', marginTop: 4 }}>
                        Total Cost: ₹{b.total_price?.toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {st === 'quoted' && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleAcceptQuote(b.id)}>
                        Accept Quote
                      </button>
                    )}
                    <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('track')}>
                      Track Progress <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
