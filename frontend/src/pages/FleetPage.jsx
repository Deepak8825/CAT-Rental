/**
 * FleetPage — Equipment Fleet Management
 * Connects to: /equipment/, /equipment/fleet-overview, /equipment/categories
 */
import { useState, useEffect } from 'react'
import { Truck, Package, Shield, Activity, Wrench, Search, Filter, RefreshCw } from 'lucide-react'

const API = 'http://localhost:8000/api/v1'

export default function FleetPage() {
  const [equipment, setEquipment] = useState([])
  const [overview, setOverview] = useState(null)
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [equipRes, overRes, catRes] = await Promise.all([
        fetch(`${API}/equipment/${selectedCategory !== 'ALL' ? `?category=${encodeURIComponent(selectedCategory)}` : ''}`),
        fetch(`${API}/equipment/fleet-overview`),
        fetch(`${API}/equipment/categories`)
      ])

      if (equipRes.ok) setEquipment(await equipRes.json())
      if (overRes.ok) setOverview(await overRes.json())
      if (catRes.ok) setCategories(await catRes.json())
    } catch (err) {
      console.error('Fleet page fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedCategory])

  const filteredEquipment = equipment.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status) => {
    const s = String(status).toLowerCase()
    if (s === 'available') return <span className="badge badge-available">Available</span>
    if (s === 'rented') return <span className="badge badge-rented">Rented</span>
    if (s === 'maintenance') return <span className="badge badge-maintenance">Maintenance</span>
    return <span className="badge badge-completed">{status}</span>
  }

  return (
    <div className="page-content">
      {/* Overview Cards */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon"><Truck size={22} /></div>
          <div className="stat-label">Total Equipment</div>
          <div className="stat-value">{overview?.total_equipment || equipment.length || '—'}</div>
          <div className="stat-change positive">Fleet Active</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><Package size={22} /></div>
          <div className="stat-label">Available Units</div>
          <div className="stat-value">{overview?.status_distribution?.available || '—'}</div>
          <div className="stat-change positive">Ready for Rent</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon"><Activity size={22} /></div>
          <div className="stat-label">Currently Rented</div>
          <div className="stat-value">{overview?.status_distribution?.rented || '—'}</div>
          <div className="stat-change positive">Generating Revenue</div>
        </div>
        <div className="stat-card violet">
          <div className="stat-icon"><Shield size={22} /></div>
          <div className="stat-label">Avg Health Score</div>
          <div className="stat-value">{overview?.average_health_score ? `${overview.average_health_score}%` : '—'}</div>
          <div className="stat-change positive">Operational</div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="feature-filter-bar" style={{ marginBottom: 20 }}>
        <div className="filter-controls-group">
          <div className="filter-group">
            <label className="filter-label"><Filter size={15} /> Category:</label>
            <div className="filter-pills">
              <button 
                className={`filter-pill ${selectedCategory === 'ALL' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('ALL')}
              >
                All
              </button>
              {categories.map(c => (
                <button
                  key={c.category}
                  className={`filter-pill ${selectedCategory === c.category ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(c.category)}
                >
                  {c.category} ({c.total})
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="search-bar" style={{ background: '#FFF', border: '1px solid #E5E5E5' }}>
            <Search size={15} style={{ color: '#666' }} />
            <input 
              placeholder="Filter by name, serial, category..." 
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

      {/* Equipment Table */}
      <div className="chart-card full-width">
        <div className="card-header">
          <div>
            <h3 className="card-title">Equipment Inventory</h3>
            <p className="card-subtitle">Real-time status and health metrics from backend</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 12px' }}></div>
            Loading equipment fleet...
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Equipment Name</th>
                <th>Category</th>
                <th>Serial Number</th>
                <th>Daily Rate</th>
                <th>Health Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredEquipment.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                    No equipment matching filters
                  </td>
                </tr>
              ) : (
                filteredEquipment.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 700, color: '#2E2725' }}>{item.name}</td>
                    <td>{item.category}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.serial_number || 'N/A'}</td>
                    <td style={{ fontWeight: 600 }}>₹{item.daily_rate?.toLocaleString()}/day</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="health-bar" style={{ width: 60 }}>
                          <div 
                            className={`health-bar-fill ${item.health_score >= 80 ? 'excellent' : item.health_score >= 50 ? 'good' : 'poor'}`} 
                            style={{ width: `${item.health_score}%` }}
                          ></div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{item.health_score}%</span>
                      </div>
                    </td>
                    <td>{getStatusBadge(item.status)}</td>
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
