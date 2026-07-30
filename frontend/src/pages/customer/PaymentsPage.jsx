/**
 * PaymentsPage — Payment history and new payment actions
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { CreditCard, CheckCircle2 } from 'lucide-react'

const API = 'http://localhost:8000/api/v1'

export default function PaymentsPage() {
  const { authFetch } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch(`${API}/customer/payments`)
        if (res.ok) setPayments(await res.json())
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const getTypeBadge = (t) => {
    const map = { advance: 'badge-active', partial: 'badge-pending', balance: 'badge-healthy', refund: 'badge-critical' }
    return map[t] || 'badge-completed'
  }

  return (
    <div className="page-content">
      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-icon"><CheckCircle2 size={22} /></div>
          <div className="stat-label">Completed Payments</div>
          <div className="stat-value">{payments.filter(p => p.status === 'completed').length}</div>
          <div className="stat-change positive">Verified</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon"><CreditCard size={22} /></div>
          <div className="stat-label">Total Paid</div>
          <div className="stat-value">₹{(payments.reduce((a, p) => a + p.amount, 0) / 1000).toFixed(0)}K</div>
          <div className="stat-change positive">All Transactions</div>
        </div>
      </div>

      <div className="chart-card full-width">
        <div className="card-header">
          <h3 className="card-title">Payment History</h3>
          <p className="card-subtitle">All payment transactions across your bookings</p>
        </div>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center' }}>Loading...</div>
        ) : payments.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>No payments yet</div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Transaction Ref</th><th>Booking</th><th>Amount</th><th>Type</th><th>Method</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700 }}>{p.transaction_ref || '—'}</td>
                  <td style={{ fontSize: 11 }}>#{p.booking_id?.slice(0, 8)}</td>
                  <td style={{ fontWeight: 700, color: '#2E2725' }}>₹{p.amount?.toLocaleString()}</td>
                  <td><span className={`badge ${getTypeBadge(p.type)}`}>{p.type}</span></td>
                  <td>{p.method}</td>
                  <td style={{ fontSize: 11 }}>{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}</td>
                  <td><span className="badge badge-healthy">{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
