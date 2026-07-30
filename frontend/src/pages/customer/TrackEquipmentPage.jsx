/**
 * TrackEquipmentPage — Order tracking timeline with status stepper
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { MapPin, CheckCircle2, Clock, Circle } from 'lucide-react'

const API = 'http://localhost:8000/api/v1'

export default function TrackEquipmentPage() {
  const { authFetch } = useAuth()
  const [bookings, setBookings] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch(`${API}/customer/bookings`)
        if (res.ok) {
          const data = await res.json()
          setBookings(data.filter(b => !['completed', 'cancelled'].includes(b.status)))
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const loadDetail = async (id) => {
    setSelectedId(id)
    try {
      const res = await authFetch(`${API}/customer/bookings/${id}`)
      if (res.ok) setDetail(await res.json())
    } catch {}
  }

  const PIPELINE = ['requested', 'quoted', 'confirmed', 'dispatched', 'active', 'returning', 'completed']

  return (
    <div className="page-content">
      <div className="feature-filter-bar" style={{ marginBottom: 20 }}>
        <div className="filter-controls-group">
          <div className="filter-group">
            <label className="filter-label"><MapPin size={15} /> Track Booking:</label>
            <select className="filter-select" value={selectedId || ''} onChange={e => loadDetail(e.target.value)}>
              <option value="">Select a booking...</option>
              {bookings.map(b => (
                <option key={b.id} value={b.id}>#{b.id.slice(0,8)} — {b.job_type} ({b.status})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {detail ? (
        <div className="charts-grid">
          {/* Status Pipeline */}
          <div className="chart-card">
            <div className="card-header">
              <h3 className="card-title">Booking Pipeline</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {PIPELINE.map((stage, i) => {
                const currentIdx = PIPELINE.indexOf(detail.status)
                const isCompleted = i < currentIdx
                const isCurrent = i === currentIdx
                return (
                  <div key={stage} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 24 }}>
                      {isCompleted ? <CheckCircle2 size={20} style={{ color: '#16a34a' }} /> : isCurrent ? <Clock size={20} style={{ color: '#FFC500' }} /> : <Circle size={20} style={{ color: '#E5E5E5' }} />}
                      {i < PIPELINE.length - 1 && <div style={{ width: 2, height: 24, background: isCompleted ? '#16a34a' : '#E5E5E5' }}></div>}
                    </div>
                    <div>
                      <div style={{ fontWeight: isCurrent ? 800 : 600, fontSize: 13, color: isCurrent ? '#FFC500' : isCompleted ? '#2E2725' : '#999', textTransform: 'capitalize' }}>{stage}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Event Timeline */}
          <div className="chart-card">
            <div className="card-header">
              <h3 className="card-title">Event Timeline</h3>
            </div>
            {(detail.tracking || []).length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No tracking events yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(detail.tracking || []).map((t, i) => (
                  <div key={i} style={{ padding: 12, background: '#FAFAFA', borderRadius: 6, borderLeft: '3px solid #FFC500' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#2E2725' }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{t.description}</div>
                    <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>{t.timestamp ? new Date(t.timestamp).toLocaleString() : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="chart-card full-width" style={{ padding: 40, textAlign: 'center' }}>
          <MapPin size={40} style={{ color: '#999', marginBottom: 12 }} />
          <p style={{ color: '#666' }}>Select a booking above to track its status</p>
        </div>
      )}
    </div>
  )
}
