/**
 * AnalyticsPage — Utilization & Revenue Performance Deep-Dive
 * Connects to: /rentals/analytics/utilization, /analytics/pricing-recommendation
 */
import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, DollarSign, Activity, Zap } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const API = 'http://localhost:8000/api/v1'

export default function AnalyticsPage() {
  const [utilizationData, setUtilizationData] = useState([])
  const [pricingRec, setPricingRec] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('Excavator')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true)
      try {
        const [utilRes, priceRes] = await Promise.all([
          fetch(`${API}/rentals/analytics/utilization`),
          fetch(`${API}/analytics/pricing-recommendation?category=${selectedCategory}`)
        ])

        if (utilRes.ok) {
          const res = await utilRes.json()
          setUtilizationData(res.fleet_utilization || [])
        }
        if (priceRes.ok) {
          setPricingRec(await priceRes.json())
        }
      } catch (err) {
        console.error('Analytics fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAnalytics()
  }, [selectedCategory])

  const categoryBreakdown = [
    { name: 'Excavator', value: 45, color: '#FFC500' },
    { name: 'Loader', value: 25, color: '#16a34a' },
    { name: 'Crane', value: 15, color: '#d97706' },
    { name: 'Bulldozer', value: 15, color: '#2E2725' },
  ]

  return (
    <div className="page-content">
      {/* Category selector */}
      <div className="feature-filter-bar" style={{ marginBottom: 20 }}>
        <div className="filter-controls-group">
          <div className="filter-group">
            <label className="filter-label">Analytics Category:</label>
            <div className="filter-pills">
              {['Excavator', 'Loader', 'Crane', 'Bulldozer', 'Dump Truck'].map(cat => (
                <button
                  key={cat}
                  className={`filter-pill ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Pricing Card */}
      {pricingRec && (
        <div className="chart-card full-width" style={{ marginBottom: 20, background: '#FFF3CC', border: '1px solid #FFC500' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Zap size={18} style={{ color: '#996400' }} />
                <h4 style={{ fontSize: 14, fontWeight: 800, color: '#2E2725', textTransform: 'uppercase' }}>
                  AI Dynamic Pricing Recommendation — {selectedCategory}
                </h4>
              </div>
              <p style={{ fontSize: 13, color: '#666' }}>{pricingRec.reason}</p>
            </div>
            <div style={{ display: 'flex', gap: 24, textAlign: 'right', marginLeft: 'auto' }}>
              <div>
                <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase' }}>Current Rate</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>₹{pricingRec.current_rate}/day</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#996400', textTransform: 'uppercase', fontWeight: 700 }}>Recommended Rate</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#2E2725' }}>₹{pricingRec.recommended_rate}/day</div>
              </div>
              <div className="badge badge-active" style={{ alignSelf: 'center' }}>
                {pricingRec.change_percentage > 0 ? `+${pricingRec.change_percentage}%` : `${pricingRec.change_percentage}%`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fleet Utilization Bar Chart */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Top Equipment Operating Hours</h3>
              <p className="card-subtitle">Hours logged per unit from telemetry</p>
            </div>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>Loading chart...</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={utilizationData.slice(0, 6)} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis dataKey="name" stroke="#999" fontSize={10} tickFormatter={v => String(v).split(' ')[0]} />
                <YAxis stroke="#999" fontSize={11} />
                <Tooltip />
                <Bar dataKey="operating_hours" fill="#FFC500" name="Operating Hours" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue Share Pie Chart */}
        <div className="chart-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Revenue Contribution by Category</h3>
              <p className="card-subtitle">Category percentage breakdown</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value">
                {categoryBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
