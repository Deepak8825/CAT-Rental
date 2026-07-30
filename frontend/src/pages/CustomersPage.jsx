/**
 * CustomersPage — Customer Directory & Account Risk Profiles
 * Renders customer list with risk scores, lifetime value, and active rental status
 */
import { useState } from 'react'
import { Users, Shield, DollarSign, Award, Search } from 'lucide-react'

// Sample dataset populated from synthetic customers.csv format
const MOCK_CUSTOMERS = [
  { id: '1ca9595e-b927-4c8b-a17f-323e0c283060', name: 'Natalie Graves', email: 'mcmahonmary@example.org', phone: '001-353-336-6589', company: 'Moore-Hayes', risk_score: 79.6, ltv: 12990.26, total_rentals: 21, is_active: true },
  { id: '0b0f5fd2-9141-4623-9ab3-7b9414d43046', name: 'Michelle Walsh', email: 'hollandbrianna@example.net', phone: '260.775.7112', company: 'Wheeler, Simmons and Moore', risk_score: 39.6, ltv: 8790.42, total_rentals: 8, is_active: true },
  { id: 'c3770f50-7096-4ffa-8ec8-3df91ff0f2c8', name: 'Jennifer Robinson', email: 'reynoldsisabel@example.com', phone: '(851)390-9177', company: 'Thornton-Olson', risk_score: 68.3, ltv: 81398.45, total_rentals: 22, is_active: true },
  { id: 'b2c31650-b23a-4c34-898a-70205c337192', name: 'Sarah Weber', email: 'amanda91@example.net', phone: '+1-477-668-7545', company: 'Davis, Hanson and Brown', risk_score: 56.6, ltv: 113212.13, total_rentals: 15, is_active: true },
  { id: '3f483723-85eb-43fc-aa06-a41e4b92850a', name: 'Brian Lam', email: 'qshepherd@example.com', phone: '(820)249-0759', company: 'Garcia LLC', risk_score: 42.2, ltv: 85191.49, total_rentals: 13, is_active: true },
  { id: '4cf6ec55-a7f7-463a-b26c-5fa9ecff193c', name: 'Stephanie Velez', email: 'lbarry@example.com', phone: '573-462-1860', company: 'Garcia PLC', risk_score: 20.7, ltv: 35743.81, total_rentals: 20, is_active: true },
  { id: '6977c136-837c-44cb-9bf0-0a3ee8532eb4', name: 'Kimberly Moran', email: 'daniellegreene@example.org', phone: '763-508-3476', company: 'Harris PLC', risk_score: 43.1, ltv: 143156.06, total_rentals: 14, is_active: true },
  { id: '713a8773-913e-4531-a453-18bf5e372f56', name: 'Jeremy Flynn', email: 'jeffreycooper@example.net', phone: '5027726297', company: 'Thompson-Vasquez', risk_score: 34.0, ltv: 60704.35, total_rentals: 13, is_active: true },
]

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = MOCK_CUSTOMERS.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalLtv = MOCK_CUSTOMERS.reduce((acc, curr) => acc + curr.ltv, 0)
  const avgRisk = (MOCK_CUSTOMERS.reduce((acc, curr) => acc + curr.risk_score, 0) / MOCK_CUSTOMERS.length).toFixed(1)

  return (
    <div className="page-content">
      {/* Overview Cards */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon"><Users size={22} /></div>
          <div className="stat-label">Total Accounts</div>
          <div className="stat-value">{MOCK_CUSTOMERS.length}</div>
          <div className="stat-change positive">Enterprise Clients</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon"><DollarSign size={22} /></div>
          <div className="stat-label">Total Customer LTV</div>
          <div className="stat-value">₹{(totalLtv / 100000).toFixed(1)}L</div>
          <div className="stat-change positive">Cumulative Contract Value</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><Award size={22} /></div>
          <div className="stat-label">Active Renters</div>
          <div className="stat-value">{MOCK_CUSTOMERS.filter(c => c.is_active).length}</div>
          <div className="stat-change positive">100% Verified</div>
        </div>
        <div className="stat-card violet">
          <div className="stat-icon"><Shield size={22} /></div>
          <div className="stat-label">Avg Risk Score</div>
          <div className="stat-value">{avgRisk}</div>
          <div className="stat-change positive">Insurance Rated</div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="feature-filter-bar" style={{ marginBottom: 20 }}>
        <div className="filter-controls-group">
          <div className="filter-group">
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Client Directory ({filtered.length})
            </span>
          </div>
        </div>
        <div className="search-bar" style={{ background: '#FFF', border: '1px solid #E5E5E5' }}>
          <Search size={15} style={{ color: '#666' }} />
          <input 
            placeholder="Search customer or company..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ color: '#2E2725' }}
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="chart-card full-width">
        <div className="card-header">
          <div>
            <h3 className="card-title">Customer Accounts</h3>
            <p className="card-subtitle">Lifetime rental statistics & risk rating</p>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Company</th>
              <th>Contact</th>
              <th>Total Bookings</th>
              <th>Lifetime Value (LTV)</th>
              <th>Risk Score</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 700, color: '#2E2725' }}>{c.name}</td>
                <td>{c.company}</td>
                <td style={{ fontSize: 12, color: '#666' }}>
                  {c.email}<br />{c.phone}
                </td>
                <td style={{ fontWeight: 600 }}>{c.total_rentals} rentals</td>
                <td style={{ fontWeight: 700, color: '#2E2725' }}>₹{c.ltv.toLocaleString()}</td>
                <td>
                  <span className={`badge ${c.risk_score < 40 ? 'badge-healthy' : c.risk_score < 70 ? 'badge-warning' : 'badge-critical'}`}>
                    {c.risk_score} / 100
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
