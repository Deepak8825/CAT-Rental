/**
 * AIRecommendationPage — Explainable AI machine recommendation results
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Brain, CheckCircle2, AlertTriangle, Fuel, TrendingUp, Shield } from 'lucide-react'

const API = 'http://localhost:8000/api/v1'

export default function AIRecommendationPage() {
  const { authFetch } = useAuth()
  const [bookings, setBookings] = useState([])
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch(`${API}/customer/bookings`)
        if (res.ok) {
          const data = await res.json()
          setBookings(data.filter(b => b.has_quotation || b.status === 'quoted' || b.status === 'requested'))
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const loadRecommendations = async (bookingId) => {
    setSelectedBooking(bookingId)
    try {
      const res = await authFetch(`${API}/customer/recommendations/${bookingId}`)
      if (res.ok) {
        const data = await res.json()
        setRecommendations(data.recommendations || [])
      }
    } catch {}
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="chart-card full-width" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #2E2725, #1a1614)', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Brain size={28} style={{ color: '#FFC500' }} />
          <div>
            <h2 style={{ color: '#FFC500', fontSize: 18, fontWeight: 800 }}>AI Machine Recommendation Engine</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Explainable AI analyzes your job requirements to recommend the best-fit equipment</p>
          </div>
        </div>
      </div>

      {/* Booking Selector */}
      <div className="feature-filter-bar" style={{ marginBottom: 20 }}>
        <div className="filter-controls-group">
          <div className="filter-group">
            <label className="filter-label">Select Booking:</label>
            <select className="filter-select" value={selectedBooking || ''} onChange={e => loadRecommendations(e.target.value)}>
              <option value="">Choose a booking...</option>
              {bookings.map(b => (
                <option key={b.id} value={b.id}>
                  #{b.id.slice(0, 8)} — {b.job_type} ({b.location})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {recommendations.map((rec, idx) => (
            <div key={idx} className="chart-card full-width" style={{ borderLeft: rec.is_primary ? '4px solid #FFC500' : '1px solid #E5E5E5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {rec.is_primary && <span className="badge badge-active">⭐ Primary Recommendation</span>}
                    <span className="badge badge-healthy">Fit: {rec.fit_score}%</span>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#2E2725' }}>{rec.equipment_name}</h3>
                  <p style={{ fontSize: 12, color: '#666' }}>{rec.equipment_model} • {rec.category} • ₹{rec.daily_rate?.toLocaleString()}/day</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: rec.confidence >= 80 ? '#16a34a' : '#d97706' }}>{rec.confidence}%</div>
                  <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase' }}>Confidence</div>
                </div>
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                <div style={{ padding: 12, background: '#FAFAFA', borderRadius: 6, textAlign: 'center' }}>
                  <Fuel size={18} style={{ color: '#d97706', marginBottom: 4 }} />
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#2E2725' }}>{rec.estimated_fuel_per_day?.toFixed(0)}L</div>
                  <div style={{ fontSize: 10, color: '#666' }}>Est. Fuel/Day</div>
                </div>
                <div style={{ padding: 12, background: '#FAFAFA', borderRadius: 6, textAlign: 'center' }}>
                  <TrendingUp size={18} style={{ color: '#16a34a', marginBottom: 4 }} />
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#2E2725' }}>{rec.expected_productivity?.toFixed(0)}%</div>
                  <div style={{ fontSize: 10, color: '#666' }}>Productivity</div>
                </div>
                <div style={{ padding: 12, background: '#FAFAFA', borderRadius: 6, textAlign: 'center' }}>
                  <Shield size={18} style={{ color: '#3b82f6', marginBottom: 4 }} />
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#2E2725' }}>{rec.health_score}%</div>
                  <div style={{ fontSize: 10, color: '#666' }}>Health Score</div>
                </div>
                <div style={{ padding: 12, background: '#FAFAFA', borderRadius: 6, textAlign: 'center' }}>
                  <AlertTriangle size={18} style={{ color: rec.risk_score < 30 ? '#16a34a' : '#d97706', marginBottom: 4 }} />
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#2E2725' }}>{rec.risk_score?.toFixed(0)}</div>
                  <div style={{ fontSize: 10, color: '#666' }}>Risk Score</div>
                </div>
              </div>

              {/* Explainable AI Reasoning */}
              <div style={{ background: '#FAFAFA', borderRadius: 6, padding: 14, border: '1px solid #E5E5E5' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#2E2725', textTransform: 'uppercase', marginBottom: 8 }}>
                  🧠 AI Reasoning
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(rec.reasoning || []).map((reason, ri) => (
                    <li key={ri} style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      ) : selectedBooking ? (
        <div className="chart-card full-width" style={{ textAlign: 'center', padding: 40 }}>
          <Brain size={40} style={{ color: '#999', marginBottom: 12 }} />
          <p style={{ color: '#666' }}>No recommendations generated yet. AI is processing...</p>
        </div>
      ) : (
        <div className="chart-card full-width" style={{ textAlign: 'center', padding: 40 }}>
          <Brain size={40} style={{ color: '#999', marginBottom: 12 }} />
          <p style={{ color: '#666' }}>Select a booking above to view AI recommendations</p>
        </div>
      )}
    </div>
  )
}
