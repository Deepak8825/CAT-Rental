/**
 * SettingsPage — System & API Configuration Panel
 */
import { useState, useEffect } from 'react'
import { Settings, Server, Bell, Shield, Database, CheckCircle2, XCircle } from 'lucide-react'

const API = 'http://localhost:8000/api/v1'

export default function SettingsPage() {
  const [apiStatus, setApiStatus] = useState('checking')
  const [notifications, setNotifications] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    fetch(`${API}/equipment/categories`)
      .then(res => res.ok ? setApiStatus('connected') : setApiStatus('error'))
      .catch(() => setApiStatus('error'))
  }, [])

  return (
    <div className="page-content">
      <div className="charts-grid">
        {/* API Status Card */}
        <div className="chart-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Backend API Health</h3>
              <p className="card-subtitle">FastAPI Server Connection</p>
            </div>
            <Server size={20} style={{ color: '#FFC500' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: '#FAFAFA', borderRadius: 6, border: '1px solid #E5E5E5' }}>
            {apiStatus === 'connected' ? (
              <>
                <CheckCircle2 size={24} style={{ color: '#16a34a' }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#2E2725' }}>FastAPI Backend Online</div>
                  <div style={{ fontSize: 12, color: '#666' }}>Endpoint: http://localhost:8000</div>
                </div>
              </>
            ) : (
              <>
                <XCircle size={24} style={{ color: '#dc2626' }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#2E2725' }}>Backend Unreachable</div>
                  <div style={{ fontSize: 12, color: '#666' }}>Using frontend synthetic fallbacks</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Platform Settings */}
        <div className="chart-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">System Preferences</h3>
              <p className="card-subtitle">Telemetry & notification options</p>
            </div>
            <Settings size={20} style={{ color: '#2E2725' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#2E2725' }}>Real-time Telemetry Stream</div>
                <div style={{ fontSize: 12, color: '#666' }}>Poll CAN-bus sensors every 2s</div>
              </div>
              <input 
                type="checkbox" 
                checked={autoRefresh} 
                onChange={(e) => setAutoRefresh(e.target.checked)} 
                style={{ width: 18, height: 18, accentColor: '#FFC500', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#2E2725' }}>Critical Failure Alerts</div>
                <div style={{ fontSize: 12, color: '#666' }}>Notify when machine health &lt; 50%</div>
              </div>
              <input 
                type="checkbox" 
                checked={notifications} 
                onChange={(e) => setNotifications(e.target.checked)} 
                style={{ width: 18, height: 18, accentColor: '#FFC500', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
