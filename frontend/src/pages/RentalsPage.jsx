/**
 * RentalsPage — Bookings & Rental Management (Dealer View)
 * Connects to: /rentals/, /rentals/analytics/summary
 */
import { useState, useEffect, useRef } from 'react'
import { FileText, DollarSign, Calendar, Activity, Search, RefreshCw, CheckCircle2, AlertTriangle, X, Truck, Check } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const API = 'http://localhost:8000/api/v1'

export default function RentalsPage() {
  const [rentals, setRentals] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  // Modal state
  const [confirmModal, setConfirmModal] = useState(null)
  // Toast state
  const [successToast, setSuccessToast] = useState(null)
  const toastTimer = useRef(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [rentRes, analRes] = await Promise.all([
        fetch(`${API}/rentals/${statusFilter !== 'ALL' ? `?status=${statusFilter.toLowerCase()}` : ''}`),
        fetch(`${API}/rentals/analytics/summary`)
      ])

      if (rentRes.ok) setRentals(await rentRes.json())
      if (analRes.ok) setAnalytics(await analRes.json())
    } catch (err) {
      console.error('Rentals page fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [statusFilter])

  useEffect(() => {
    if (successToast) {
      toastTimer.current = setTimeout(() => setSuccessToast(null), 4000)
      return () => clearTimeout(toastTimer.current)
    }
  }, [successToast])

  const handleConfirmAndDispatch = async (rental) => {
    setActionLoading(rental.id)
    try {
      const res = await fetch(`${API}/rentals/${rental.id}/confirm-and-dispatch`, { method: 'PATCH' })
      if (res.ok) {
        setSuccessToast({
          title: '🚚 Booking Confirmed & Dispatched!',
          message: `Order for ${rental.customer_name || 'Customer'} (${rental.equipment_name}) approved, confirmed, and dispatched by Caterpillar Dealer.`,
        })
        await fetchData()
      }
    } catch (err) {
      console.error('Confirm & Dispatch error:', err)
    }
    setActionLoading(null)
  }

  const handleConfirmBooking = async (rental) => {
    setActionLoading(rental.id)
    try {
      const res = await fetch(`${API}/rentals/${rental.id}/confirm`, { method: 'PATCH' })
      if (res.ok) {
        setSuccessToast({
          title: '✅ Booking Confirmed!',
          message: `Booking for ${rental.equipment_name || 'Equipment'} confirmed by Caterpillar Dealer. Customer notified.`,
        })
        await fetchData()
      }
    } catch (err) {
      console.error('Confirm error:', err)
    }
    setActionLoading(null)
  }

  const showDispatchModal = (rental) => {
    setConfirmModal({
      id: rental.id,
      customerName: rental.customer_name || 'Customer',
      customerCompany: rental.customer_company || '',
      equipmentName: rental.equipment_name || 'CAT Equipment',
      equipmentModel: rental.equipment_model || '',
      totalCost: rental.total_cost,
      startDate: rental.start_date,
      endDate: rental.end_date,
    })
  }

  const handleConfirmDispatch = async () => {
    if (!confirmModal) return
    const rentalId = confirmModal.id
    setActionLoading(rentalId)
    setConfirmModal(null)
    try {
      const res = await fetch(`${API}/rentals/${rentalId}/checkout`, { method: 'PATCH' })
      if (res.ok) {
        setSuccessToast({
          title: '🚚 Equipment Dispatched!',
          message: `${confirmModal.equipmentName} dispatched to ${confirmModal.customerName}. Customer notified.`,
        })
        await fetchData()
      }
    } catch (err) {
      console.error('Dispatch error:', err)
    }
    setActionLoading(null)
  }

  const handleReturn = async (rentalId) => {
    setActionLoading(rentalId)
    try {
      const res = await fetch(`${API}/rentals/${rentalId}/return`, { method: 'PATCH' })
      if (res.ok) {
        await fetchData()
      }
    } catch (err) {
      console.error('Return error:', err)
    }
    setActionLoading(null)
  }

  const filteredRentals = rentals.filter(r => 
    String(r.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.customer_name && r.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (r.customer_company && r.customer_company.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (r.equipment_name && r.equipment_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (r.equipment_model && r.equipment_model.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (r.notes && r.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const getStatusBadge = (status) => {
    const s = String(status).toLowerCase()
    if (s === 'active') return <span className="badge badge-active">Active Lease</span>
    if (s === 'completed') return <span className="badge badge-completed">Completed</span>
    if (s === 'pending') return <span className="badge badge-pending">Pending Approval</span>
    return <span className="badge badge-critical">{status}</span>
  }

  return (
    <div className="page-content">
      {/* ── Success Toast ── */}
      {successToast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          color: '#FFF', padding: '16px 24px', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(5,150,105,0.35)',
          display: 'flex', alignItems: 'center', gap: 12,
          animation: 'slideInRight 0.4s ease-out',
          maxWidth: 420,
        }}>
          <CheckCircle2 size={22} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2 }}>{successToast.title}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>{successToast.message}</div>
          </div>
          <button onClick={() => setSuccessToast(null)} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', padding: 4, marginLeft: 8 }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Confirmation Modal ── */}
      {confirmModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setConfirmModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#FFF', borderRadius: 16, padding: 0, width: 460,
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
            animation: 'slideInRight 0.3s ease-out',
            overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #2E2725 0%, #1a1614 100%)',
              padding: '24px 28px', color: '#FFF',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(255,197,0,0.15)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Truck size={20} color="#FFC500" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Dispatch Equipment</h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Caterpillar Dealer Equipment Dispatch</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px 28px' }}>
              <div style={{
                background: '#FAFAFA', borderRadius: 10, padding: 16, marginBottom: 20,
                border: '1px solid #E5E5E5',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>Customer</div>
                    <div style={{ fontWeight: 700, color: '#2E2725', fontSize: 14 }}>{confirmModal.customerName}</div>
                    {confirmModal.customerCompany && <div style={{ fontSize: 11, color: '#666' }}>{confirmModal.customerCompany}</div>}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>Equipment</div>
                    <div style={{ fontWeight: 700, color: '#2E2725', fontSize: 14 }}>{confirmModal.equipmentName}</div>
                    {confirmModal.equipmentModel && <div style={{ fontSize: 11, color: '#666' }}>{confirmModal.equipmentModel}</div>}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>Period</div>
                    <div style={{ fontWeight: 600, color: '#2E2725', fontSize: 13 }}>{confirmModal.startDate} → {confirmModal.endDate || 'Ongoing'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>Total Cost</div>
                    <div style={{ fontWeight: 800, color: '#059669', fontSize: 16 }}>₹{confirmModal.totalCost?.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Warning message */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: '#FFF7ED', border: '1px solid #FDBA74', borderRadius: 8,
                padding: '12px 14px', marginBottom: 20,
              }}>
                <AlertTriangle size={16} color="#EA580C" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12, color: '#9A3412', lineHeight: 1.5 }}>
                  This will <strong>dispatch the equipment</strong> to the customer. Status will change to <strong>"Dispatched"</strong> on the Customer Portal.
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setConfirmModal(null)}
                  style={{ fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmDispatch}
                  style={{
                    fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                    background: '#059669', border: 'none',
                  }}
                >
                  <Truck size={16} /> Confirm Dispatch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-icon"><Activity size={22} /></div>
          <div className="stat-label">Active / Pending Rentals</div>
          <div className="stat-value">{analytics?.active_rentals ?? rentals.filter(r => ['active', 'pending'].includes(String(r.status).toLowerCase())).length}</div>
          <div className="stat-change positive">Customer Bookings</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><FileText size={22} /></div>
          <div className="stat-label">Total Rental Orders</div>
          <div className="stat-value">{analytics?.total_rentals ?? rentals.length}</div>
          <div className="stat-change positive">Lifetime Leases</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon"><DollarSign size={22} /></div>
          <div className="stat-label">Monthly Revenue</div>
          <div className="stat-value">{analytics ? `₹${(analytics.revenue_this_month / 100000).toFixed(1)}L` : '—'}</div>
          <div className="stat-change positive">{analytics ? `${analytics.revenue_change_pct}% MoM` : ''}</div>
        </div>
        <div className="stat-card violet">
          <div className="stat-icon"><Calendar size={22} /></div>
          <div className="stat-label">Last Month Revenue</div>
          <div className="stat-value">{analytics ? `₹${(analytics.revenue_last_month / 100000).toFixed(1)}L` : '—'}</div>
          <div className="stat-change positive">Historical Baseline</div>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      {analytics?.monthly_trend && analytics.monthly_trend.length > 0 && (
        <div className="chart-card full-width" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">Monthly Rental Revenue</h3>
              <p className="card-subtitle">Aggregated booking revenue performance over time</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={analytics.monthly_trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis dataKey="month" stroke="#999999" fontSize={11} />
              <YAxis stroke="#999999" fontSize={11} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={v => [`₹${v.toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#FFC500" fill="rgba(255,197,0,0.15)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Control Bar */}
      <div className="feature-filter-bar" style={{ marginBottom: 20 }}>
        <div className="filter-controls-group">
          <div className="filter-group">
            <label className="filter-label">Filter Status:</label>
            <div className="filter-pills">
              {['ALL', 'ACTIVE', 'PENDING', 'COMPLETED', 'CANCELLED'].map(s => (
                <button
                  key={s}
                  className={`filter-pill ${statusFilter === s ? 'active' : ''}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="search-bar" style={{ background: '#FFF', border: '1px solid #E5E5E5' }}>
            <Search size={15} style={{ color: '#666' }} />
            <input 
              placeholder="Search equipment, customer, ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ color: '#2E2725' }}
            />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchData} title="Refresh Rentals">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Rentals Table */}
      <div className="chart-card full-width">
        <div className="card-header">
          <div>
            <h3 className="card-title">Customer Bookings & Leases</h3>
            <p className="card-subtitle">Real-time dealer view of active & requested rentals</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 12px' }}></div>
            Loading customer bookings...
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Customer</th>
                <th>Equipment</th>
                <th>Period</th>
                <th>Daily Rate</th>
                <th>Total Cost</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRentals.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                    No rental records found
                  </td>
                </tr>
              ) : (
                filteredRentals.map((r) => {
                  const statusLower = String(r.status).toLowerCase()
                  const displayId = r.order_id ? `#${r.order_id}` : `#${String(r.id).slice(0, 8)}`
                  return (
                    <tr key={r.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: '#FFC500', background: '#2E2725', padding: '6px 10px', borderRadius: 4, display: 'inline-block', marginTop: 10 }}>
                        {displayId}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#2E2725', fontSize: 13 }}>{r.customer_name || 'Customer'}</div>
                        {r.customer_company && <div style={{ fontSize: 11, color: '#666' }}>{r.customer_company}</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#2E2725', fontSize: 13 }}>{r.equipment_name || 'CAT Equipment'}</div>
                        <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                          {r.equipment_model && <span>{r.equipment_model}</span>}
                          {r.total_units > 1 && (
                            <span style={{ marginLeft: 6, background: '#FFF9E6', border: '1px solid #FFC500', color: '#2E2725', padding: '1px 6px', borderRadius: 4, fontWeight: 800, fontSize: 10 }}>
                              {r.total_units} Units Order
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{r.start_date}</div>
                        <div style={{ fontSize: 11, color: '#666' }}>to {r.end_date || 'Ongoing'}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>₹{r.daily_rate?.toLocaleString()}/day</td>
                      <td style={{ fontWeight: 800, color: '#059669', fontSize: 14 }}>
                        ₹{r.total_cost?.toLocaleString()}
                      </td>
                      <td>{getStatusBadge(r.status)}</td>
                      <td>
                        {['pending', 'quoted'].includes(statusLower) && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{
                              fontSize: 11, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6,
                              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                              borderColor: '#16a34a', color: '#FFF', fontWeight: 800, borderRadius: 6,
                              boxShadow: '0 2px 8px rgba(22,163,74,0.25)', cursor: 'pointer',
                            }}
                            onClick={() => handleConfirmAndDispatch(r)}
                            disabled={actionLoading === r.id}
                          >
                            {actionLoading === r.id ? (
                              <><RefreshCw size={13} className="animate-spin" /> Processing...</>
                            ) : (
                              <><Check size={13} /><Truck size={13} /> Confirm & Dispatch Booking</>
                            )}
                          </button>
                        )}
                        {['active', 'confirmed', 'dispatched'].includes(statusLower) && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11, padding: '6px 12px' }}
                            onClick={() => handleReturn(r.id)}
                            disabled={actionLoading === r.id}
                          >
                            {actionLoading === r.id ? 'Processing...' : 'Check-in / Complete'}
                          </button>
                        )}
                        {['completed', 'cancelled'].includes(statusLower) && (
                          <span style={{ fontSize: 11, color: '#999', fontWeight: 600 }}>✓ Completed</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Inline animation keyframes */}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateY(-10px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
