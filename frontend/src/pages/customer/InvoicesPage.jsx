/**
 * InvoicesPage — Invoice list with price breakdowns
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Receipt, ChevronDown, ChevronUp } from 'lucide-react'

const API = 'http://localhost:8000/api/v1'

export default function InvoicesPage() {
  const { authFetch } = useAuth()
  const [bookings, setBookings] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch(`${API}/customer/bookings`)
        if (res.ok) {
          const data = await res.json()
          setBookings(data.filter(b => b.has_quotation))
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const loadDetail = async (id) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
  }

  return (
    <div className="page-content">
      <div className="chart-card full-width">
        <div className="card-header">
          <h3 className="card-title">Invoices & Quotations</h3>
          <p className="card-subtitle">Price breakdown for all bookings with quotations</p>
        </div>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center' }}>Loading...</div>
        ) : bookings.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
            <Receipt size={40} style={{ marginBottom: 12, color: '#ccc' }} />
            <p>No invoices available yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bookings.map(b => (
              <div key={b.id} style={{ border: '1px solid #E5E5E5', borderRadius: 6, overflow: 'hidden' }}>
                <div
                  onClick={() => loadDetail(b.id)}
                  style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: expanded === b.id ? '#FFF9E6' : '#FAFAFA' }}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: '#2E2725' }}>#{b.id.slice(0, 8)}</span>
                    <span style={{ color: '#666', marginLeft: 8 }}>{b.job_type} — {b.location}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 800, color: '#2E2725' }}>₹{b.total_price?.toLocaleString()}</span>
                    {expanded === b.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
                {expanded === b.id && (
                  <div style={{ padding: 16, background: '#fff', borderTop: '1px solid #E5E5E5' }}>
                    <p style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                      Quotation generated with AI dynamic pricing engine. View breakdown:
                    </p>
                    <div style={{ fontSize: 12, color: '#999' }}>
                      Full price breakdown available in booking detail view.
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
