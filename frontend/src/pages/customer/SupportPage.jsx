/**
 * SupportPage — Create and view support tickets
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { LifeBuoy, Send } from 'lucide-react'

const API = 'http://localhost:8000/api/v1'

export default function SupportPage() {
  const { authFetch } = useAuth()
  const [tickets, setTickets] = useState([])
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadTickets = async () => {
    try {
      const res = await authFetch(`${API}/customer/support`)
      if (res.ok) setTickets(await res.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadTickets() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await authFetch(`${API}/customer/support`, {
        method: 'POST',
        body: JSON.stringify({ subject, description, priority }),
      })
      if (res.ok) {
        setSubject(''); setDescription('')
        loadTickets()
      }
    } catch {}
    setSubmitting(false)
  }

  const getStatusBadge = (s) => {
    const map = { open: 'badge-warning', in_progress: 'badge-active', resolved: 'badge-healthy', closed: 'badge-completed' }
    return map[s] || 'badge-completed'
  }

  return (
    <div className="page-content">
      <div className="charts-grid">
        {/* Create Ticket */}
        <div className="chart-card">
          <div className="card-header">
            <h3 className="card-title">Submit Support Request</h3>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="login-field">
              <label>Subject</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief description of your issue" required />
            </div>
            <div className="login-field">
              <label>Priority</label>
              <select className="filter-select" style={{ width: '100%' }} value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="login-field">
              <label>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your issue in detail..." rows={4} style={{ width: '100%', padding: 10, border: '1px solid #E5E5E5', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Send size={14} /> {submitting ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </form>
        </div>

        {/* Ticket History */}
        <div className="chart-card">
          <div className="card-header">
            <h3 className="card-title">My Tickets</h3>
          </div>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>
              <LifeBuoy size={32} style={{ marginBottom: 8, color: '#ccc' }} />
              <p>No support tickets yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
              {tickets.map(t => (
                <div key={t.id} style={{ padding: 12, background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#2E2725' }}>{t.subject}</span>
                    <span className={`badge ${getStatusBadge(t.status)}`}>{t.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#666' }}>{t.description?.slice(0, 100)}</div>
                  {t.admin_response && (
                    <div style={{ marginTop: 8, padding: 8, background: '#FFF9E6', borderRadius: 4, fontSize: 11, color: '#2E2725' }}>
                      <strong>Response:</strong> {t.admin_response}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
