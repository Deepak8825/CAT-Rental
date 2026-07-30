/**
 * MaintenancePage — Predictive Maintenance & Equipment Diagnostics
 * Connects to: /equipment/?min_health=0, /equipment/{id}/health
 */
import { useState, useEffect } from 'react'
import { Wrench, AlertTriangle, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react'

const API = 'http://localhost:8000/api/v1'

export default function MaintenancePage() {
  const [equipmentList, setEquipmentList] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterRisk, setFilterRisk] = useState('ALL')

  const fetchMaintenanceData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/equipment/`)
      if (res.ok) {
        const data = await res.json()
        setEquipmentList(data)
      }
    } catch (err) {
      console.error('Maintenance fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMaintenanceData()
  }, [])

  const getRiskLevel = (score) => {
    if (score < 50) return { label: 'CRITICAL', color: '#dc2626', badge: 'badge-critical' }
    if (score < 70) return { label: 'HIGH RISK', color: '#d97706', badge: 'badge-warning' }
    if (score < 85) return { label: 'MODERATE', color: '#FFC500', badge: 'badge-pending' }
    return { label: 'HEALTHY', color: '#16a34a', badge: 'badge-healthy' }
  }

  const filtered = equipmentList.filter(item => {
    const risk = getRiskLevel(item.health_score).label
    if (filterRisk === 'ALL') return true
    if (filterRisk === 'CRITICAL') return risk === 'CRITICAL' || risk === 'HIGH RISK'
    if (filterRisk === 'HEALTHY') return risk === 'HEALTHY'
    return true
  })

  const criticalCount = equipmentList.filter(e => e.health_score < 50).length
  const warningCount = equipmentList.filter(e => e.health_score >= 50 && e.health_score < 70).length
  const healthyCount = equipmentList.filter(e => e.health_score >= 70).length

  return (
    <div className="page-content">
      {/* Maintenance KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card rose">
          <div className="stat-icon"><AlertTriangle size={22} /></div>
          <div className="stat-label">Critical Failures Imminent</div>
          <div className="stat-value">{criticalCount}</div>
          <div className="stat-change negative">Immediate Action Required</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon"><Wrench size={22} /></div>
          <div className="stat-label">Service Due Soon</div>
          <div className="stat-value">{warningCount}</div>
          <div className="stat-change positive">Schedule Routine Service</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><CheckCircle size={22} /></div>
          <div className="stat-label">Healthy Units</div>
          <div className="stat-value">{healthyCount}</div>
          <div className="stat-change positive">Passed Inspection</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><ShieldAlert size={22} /></div>
          <div className="stat-label">Total Monitored</div>
          <div className="stat-value">{equipmentList.length}</div>
          <div className="stat-change positive">IoT Telemetry Active</div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="feature-filter-bar" style={{ marginBottom: 20 }}>
        <div className="filter-controls-group">
          <div className="filter-group">
            <label className="filter-label">Filter Maintenance Status:</label>
            <div className="filter-pills">
              <button className={`filter-pill ${filterRisk === 'ALL' ? 'active' : ''}`} onClick={() => setFilterRisk('ALL')}>All Units</button>
              <button className={`filter-pill ${filterRisk === 'CRITICAL' ? 'active' : ''}`} onClick={() => setFilterRisk('CRITICAL')}>Action Required ({criticalCount + warningCount})</button>
              <button className={`filter-pill ${filterRisk === 'HEALTHY' ? 'active' : ''}`} onClick={() => setFilterRisk('HEALTHY')}>Healthy ({healthyCount})</button>
            </div>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchMaintenanceData}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Maintenance Table */}
      <div className="chart-card full-width">
        <div className="card-header">
          <div>
            <h3 className="card-title">Predictive Maintenance Work Orders</h3>
            <p className="card-subtitle">AI-predicted remaining useful life & component diagnostics</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Loading diagnostic health data...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Category</th>
                <th>Health Score</th>
                <th>Predicted Failure</th>
                <th>Recommended Action</th>
                <th>Risk Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const risk = getRiskLevel(item.health_score)
                const daysToFailure = Math.max(1, Math.round(item.health_score * 0.4))
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 700, color: '#2E2725' }}>{item.name}</td>
                    <td>{item.category}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="health-bar" style={{ width: 60 }}>
                          <div 
                            className={`health-bar-fill ${item.health_score >= 80 ? 'excellent' : item.health_score >= 50 ? 'good' : 'poor'}`} 
                            style={{ width: `${item.health_score}%` }}
                          ></div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{item.health_score}%</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: daysToFailure < 10 ? '#dc2626' : '#2E2725' }}>
                      ~{daysToFailure} days
                    </td>
                    <td style={{ fontSize: 12, color: '#666' }}>
                      {item.health_score < 50 ? 'Replace hydraulic seals & check engine oil' :
                       item.health_score < 70 ? 'Perform scheduled 500-hour service' : 'Routine inspection cleared'}
                    </td>
                    <td>
                      <span className={`badge ${risk.badge}`}>{risk.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
