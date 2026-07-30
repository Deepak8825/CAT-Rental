/**
 * SearchEquipmentPage — Browse available equipment catalog
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Search, Filter, Truck } from 'lucide-react'

const API = 'http://localhost:8000/api/v1'

export default function SearchEquipmentPage({ onNavigate }) {
  const { authFetch } = useAuth()
  const [equipment, setEquipment] = useState([])
  const [category, setCategory] = useState('')
  const [maxRate, setMaxRate] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchEquipment = async () => {
    setLoading(true)
    try {
      let url = `${API}/customer/inventory/search?limit=30`
      if (category) url += `&category=${category}`
      if (maxRate) url += `&max_rate=${maxRate}`
      const res = await authFetch(url)
      if (res.ok) setEquipment(await res.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchEquipment() }, [category])

  return (
    <div className="page-content">
      <div className="feature-filter-bar" style={{ marginBottom: 20 }}>
        <div className="filter-controls-group">
          <div className="filter-group">
            <label className="filter-label"><Filter size={15} /> Category:</label>
            <div className="filter-pills">
              {['', 'Excavator', 'Loader', 'Crane', 'Bulldozer', 'Dump Truck', 'Forklift'].map(c => (
                <button key={c} className={`filter-pill ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
                  {c || 'All'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="chart-card full-width" style={{ padding: 40, textAlign: 'center' }}>Loading equipment...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {equipment.map(eq => (
            <div key={eq.id} className="chart-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 6, background: '#FFC500', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={20} style={{ color: '#000' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#2E2725', fontSize: 14 }}>{eq.name}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>{eq.category} • {eq.model}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                {[
                  ['Daily Rate', `₹${eq.daily_rate?.toLocaleString()}`],
                  ['Health', `${eq.health_score}%`],
                  ['Power', eq.engine_power_hp ? `${eq.engine_power_hp}HP` : 'N/A'],
                  ['Capacity', eq.max_load_capacity ? `${eq.max_load_capacity}t` : 'N/A'],
                ].map(([l, v], i) => (
                  <div key={i} style={{ padding: 6, background: '#FAFAFA', borderRadius: 4, fontSize: 11 }}>
                    <span style={{ color: '#999' }}>{l}: </span>
                    <span style={{ fontWeight: 700, color: '#2E2725' }}>{v}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={() => onNavigate('book')}>
                Request Quote
              </button>
            </div>
          ))}
          {equipment.length === 0 && (
            <div className="chart-card" style={{ gridColumn: 'span 3', padding: 40, textAlign: 'center', color: '#999' }}>
              No equipment found for this filter
            </div>
          )}
        </div>
      )}
    </div>
  )
}
