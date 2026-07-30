/**
 * AlertsPage — System & Machine Telemetry Alerts Log
 * Connects to: /analytics/dashboard (recent_events)
 */
import { useState, useEffect } from 'react'
import { Bell, AlertTriangle, Clock, MapPin, Check, Filter } from 'lucide-react'

const API = 'http://localhost:8000/api/v1'

const STATIC_ALERTS = [
  { id: 1, type: 'critical', title: 'Engine Overheat Alert', machine: 'CAT 320 Excavator #247', time: '3 mins ago', detail: 'Coolant temp exceeded 112°C threshold' },
  { id: 2, type: 'warning', title: 'Hydraulic Pressure Low', machine: 'Komatsu PC200 #189', time: '15 mins ago', detail: 'Line pressure dropped below 2200 PSI' },
  { id: 3, type: 'info', title: 'Geofence Exit Event', machine: 'Volvo EC220 #312', time: '42 mins ago', detail: 'Unit exited authorized North Region perimeter' },
  { id: 4, type: 'warning', title: 'Battery Undervoltage', machine: 'CAT 966 Loader #156', time: '1 hour ago', detail: 'Terminal voltage recorded at 10.8V' },
  { id: 5, type: 'critical', title: 'Vibration Anomaly', machine: 'Liebherr LTM Crane #078', time: '2 hours ago', detail: 'Bearing vibration frequency spike > 5.5g' },
]

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(STATIC_ALERTS)
  const [severityFilter, setSeverityFilter] = useState('ALL')

  useEffect(() => {
    fetch(`${API}/analytics/dashboard`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.recent_events && data.recent_events.length > 0) {
          const mapped = data.recent_events.map(e => ({
            id: e.id,
            type: e.severity === 'critical' ? 'critical' : e.severity === 'warning' ? 'warning' : 'info',
            title: e.title || e.event_type,
            machine: `Asset #${String(e.id).slice(0, 4)}`,
            time: e.event_time ? new Date(e.event_time).toLocaleTimeString() : 'Recently',
            detail: `Event type: ${e.event_type}`
          }))
          setAlerts(mapped)
        }
      })
      .catch(() => {})
  }, [])

  const filteredAlerts = alerts.filter(a => severityFilter === 'ALL' || a.type === severityFilter.toLowerCase())

  return (
    <div className="page-content">
      {/* Alert KPI Summary */}
      <div className="stats-grid">
        <div className="stat-card rose">
          <div className="stat-icon"><AlertTriangle size={22} /></div>
          <div className="stat-label">Critical Alerts</div>
          <div className="stat-value">{alerts.filter(a => a.type === 'critical').length}</div>
          <div className="stat-change negative">High Priority</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon"><Clock size={22} /></div>
          <div className="stat-label">Warnings</div>
          <div className="stat-value">{alerts.filter(a => a.type === 'warning').length}</div>
          <div className="stat-change positive">Requires Review</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><MapPin size={22} /></div>
          <div className="stat-label">Geofence Events</div>
          <div className="stat-value">{alerts.filter(a => a.type === 'info').length}</div>
          <div className="stat-change positive">Informational</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><Bell size={22} /></div>
          <div className="stat-label">Total Notifications</div>
          <div className="stat-value">{alerts.length}</div>
          <div className="stat-change positive">System Live</div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="feature-filter-bar" style={{ marginBottom: 20 }}>
        <div className="filter-controls-group">
          <div className="filter-group">
            <label className="filter-label"><Filter size={15} /> Severity Filter:</label>
            <div className="filter-pills">
              {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map(s => (
                <button
                  key={s}
                  className={`filter-pill ${severityFilter === s ? 'active' : ''}`}
                  onClick={() => setSeverityFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Log Container */}
      <div className="chart-card full-width">
        <div className="card-header">
          <div>
            <h3 className="card-title">Real-Time Event Audit Log</h3>
            <p className="card-subtitle">Active telemetry warnings and safety incidents</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredAlerts.map(alert => (
            <div key={alert.id} className={`alert-card ${alert.type}`} style={{ padding: 16 }}>
              <div style={{ marginTop: 2 }}>
                {alert.type === 'critical' && <AlertTriangle size={18} style={{ color: '#dc2626' }} />}
                {alert.type === 'warning' && <Clock size={18} style={{ color: '#d97706' }} />}
                {alert.type === 'info' && <MapPin size={18} style={{ color: '#2E2725' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#2E2725' }}>{alert.title}</span>
                  <span className="alert-time">{alert.time}</span>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#666' }}>{alert.machine}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{alert.detail}</div>
              </div>
              <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'center' }}>
                <Check size={14} /> Acknowledge
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
