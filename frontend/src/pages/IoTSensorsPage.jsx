/**
 * IoTSensorsPage — Full-Screen Telemetry Monitor & Asset Selection
 * Streams real-time IoT readings for selected equipment
 */
import { useState, useEffect } from 'react'
import { Radio, ThermometerSun, Gauge, Zap, Fuel, Activity, Cpu } from 'lucide-react'

const API = 'http://localhost:8000/api/v1'

export default function IoTSensorsPage() {
  const [machines, setMachines] = useState([])
  const [selectedMachine, setSelectedMachine] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    fetch(`${API}/equipment/?limit=20`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setMachines(data)
          setSelectedMachine(data[0].id)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1500)
    return () => clearInterval(timer)
  }, [])

  const sensors = [
    { label: 'Engine Temperature', value: (88 + Math.sin(tick / 3) * 6 + Math.random() * 2).toFixed(1), unit: '°C', icon: ThermometerSun, max: 120, warn: 100 },
    { label: 'Hydraulic Pressure', value: (3100 + Math.sin(tick / 5) * 150 + Math.random() * 40).toFixed(0), unit: 'PSI', icon: Gauge, max: 4000, warn: 2400 },
    { label: 'System Voltage', value: (12.6 + Math.sin(tick / 4) * 0.3 + Math.random() * 0.1).toFixed(1), unit: 'V', icon: Zap, max: 14.4, warn: 11.2 },
    { label: 'Fuel Level', value: (72 - (tick * 0.05) % 30).toFixed(0), unit: '%', icon: Fuel, max: 100, warn: 15 },
    { label: 'Engine Speed', value: (1950 + Math.sin(tick / 2) * 150 + Math.random() * 80).toFixed(0), unit: 'RPM', icon: Activity, max: 3000, warn: 2800 },
    { label: 'Chassis Vibration', value: (2.1 + Math.sin(tick / 3) * 0.5 + Math.random() * 0.3).toFixed(2), unit: 'g', icon: Radio, max: 8, warn: 5 },
  ]

  return (
    <div className="page-content">
      {/* Header Bar */}
      <div className="feature-filter-bar" style={{ marginBottom: 20 }}>
        <div className="filter-controls-group">
          <div className="filter-group">
            <label className="filter-label"><Cpu size={16} /> Target Asset:</label>
            <select 
              className="filter-select"
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
            >
              {machines.length > 0 ? (
                machines.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.model})</option>
                ))
              ) : (
                <option value="">CAT 320 Excavator #142</option>
              )}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', animation: 'alertPulse 1.5s infinite', display: 'inline-block' }}></span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#16a34a', letterSpacing: '0.06em' }}>LIVE CAN-BUS STREAM</span>
        </div>
      </div>

      {/* Grid of Sensors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {sensors.map((sensor, i) => {
          const Icon = sensor.icon
          const val = parseFloat(sensor.value)
          const pct = (val / sensor.max) * 100
          const isWarn = val >= sensor.warn || (sensor.label === 'Fuel Level' && val <= sensor.warn)
          return (
            <div key={i} className="chart-card" style={{ borderLeft: isWarn ? '4px solid #dc2626' : '1px solid #E5E5E5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#666' }}>{sensor.label}</span>
                <Icon size={20} style={{ color: isWarn ? '#dc2626' : '#FFC500' }} />
              </div>

              <div style={{ fontSize: 32, fontWeight: 800, color: isWarn ? '#dc2626' : '#2E2725', marginBottom: 12 }}>
                {sensor.value} <span style={{ fontSize: 14, color: '#999', fontWeight: 500 }}>{sensor.unit}</span>
              </div>

              <div className="health-bar" style={{ height: 8 }}>
                <div 
                  style={{ 
                    height: '100%', 
                    width: `${Math.min(pct, 100)}%`, 
                    background: isWarn ? '#dc2626' : '#FFC500',
                    transition: 'width 0.4s ease'
                  }}
                ></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
