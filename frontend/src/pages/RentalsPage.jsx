/**
 * RentalsPage — Bookings & Rental Management
 * Connects to: /rentals/, /rentals/analytics/summary
 */
import { useState, useEffect } from 'react'
import { FileText, DollarSign, Calendar, Activity, Search, RefreshCw } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const API = 'http://localhost:8000/api/v1'

export default function RentalsPage() {
  const [rentals, setRentals] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [rentRes, analRes] = await Promise.all([
        fetch(`${API}/rentals/${statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''}`),
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

  const filteredRentals = rentals.filter(r => 
    String(r.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(r.customer_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(r.equipment_id).toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status) => {
    const s = String(status).toLowerCase()
    if (s === 'active') return <span className="badge badge-active">Active</span>
    if (s === 'completed') return <span className="badge badge-completed">Completed</span>
    if (s === 'pending') return <span className="badge badge-pending">Pending</span>
    return <span className="badge badge-critical">{status}</span>
  }

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-icon"><Activity size={22} /></div>
          <div className="stat-label">Active Rentals</div>
          <div className="stat-value">{analytics?.active_rentals ?? '—'}</div>
          <div className="stat-change positive">Currently Out on Site</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><FileText size={22} /></div>
          <div className="stat-label">Total Rental Orders</div>
          <div className="stat-value">{analytics?.total_rentals ?? rentals.length ?? '—'}</div>
          <div className="stat-change positive">Lifetime Bookings</div>
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
              placeholder="Search by ID or customer..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ color: '#2E2725' }}
            />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchData}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Rentals Table */}
      <div className="chart-card full-width">
        <div className="card-header">
          <div>
            <h3 className="card-title">Rental Agreements</h3>
            <p className="card-subtitle">Active and past equipment leases</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 12px' }}></div>
            Loading rentals...
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Daily Rate</th>
                <th>Total Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRentals.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                    No rental records found
                  </td>
                </tr>
              ) : (
                filteredRentals.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#2E2725' }}>
                      {String(r.id).slice(0, 8)}...
                    </td>
                    <td>{r.start_date}</td>
                    <td>{r.end_date || 'Ongoing'}</td>
                    <td>₹{r.daily_rate?.toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: '#2E2725' }}>
                      ₹{r.total_cost?.toLocaleString()}
                    </td>
                    <td>{getStatusBadge(r.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
