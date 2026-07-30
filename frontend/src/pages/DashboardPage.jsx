/**
 * DashboardPage — Main KPI overview with AI demand forecast
 * Connects to: /analytics/demand-forecast, /analytics/dashboard
 */
import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import {
  Package, FileText, DollarSign, Activity, Shield, Wrench,
  ArrowUpRight, ArrowDownRight, Brain, BarChart3,
  AlertTriangle, Clock, MapPin, TrendingUp, Zap,
  ThermometerSun, Gauge, Fuel, Radio, RefreshCw
} from 'lucide-react'

const API = 'http://localhost:8000/api/v1'

// ─── Shared Utility ───────────────────────────────────────
const generateDynamicData = (selectedCategory = 'Excavator', selectedRegion = 'North', forecastDays = 30) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const catMults = { 'Excavator': 1.35, 'Loader': 1.10, 'Crane': 0.75, 'Bulldozer': 0.90, 'Dump Truck': 1.20, 'Forklift': 1.45, 'Generator': 0.65, 'Compactor': 0.50 }
  const regMults = { 'North': 1.20, 'South': 0.85, 'East': 1.05, 'West': 0.95, 'Central': 1.30 }
  const cm = catMults[selectedCategory] || 1.0
  const rm = regMults[selectedRegion] || 1.0
  const combined = cm * rm

  const revenueData = months.map((month, i) => ({
    month,
    revenue: Math.floor((70000 + Math.sin(i / 2) * 35000 + Math.random() * 15000) * combined),
    rentals: Math.floor((35 + Math.sin(i / 2) * 15 + Math.random() * 8) * combined),
    target: Math.floor(100000 * combined),
  }))

  const demandForecast = Array.from({ length: forecastDays }, (_, i) => {
    const base = (5.5 + Math.sin(i / 4) * 2.5) * combined
    const predicted = +(base + (Math.random() * 0.8 - 0.4)).toFixed(1)
    return { day: `Day ${i + 1}`, predicted, upper: +(predicted + 1.8 * Math.sqrt(predicted / 3)).toFixed(1), lower: +Math.max(0.5, predicted - 1.8 * Math.sqrt(predicted / 3)).toFixed(1) }
  })

  const categoryDistribution = [
    { name: 'Excavator', value: Math.round(120 * (selectedCategory === 'Excavator' ? 1.4 : 1.0)), color: '#3b82f6' },
    { name: 'Loader', value: Math.round(85 * (selectedCategory === 'Loader' ? 1.4 : 1.0)), color: '#10b981' },
    { name: 'Crane', value: Math.round(45 * (selectedCategory === 'Crane' ? 1.4 : 1.0)), color: '#f59e0b' },
    { name: 'Bulldozer', value: Math.round(60 * (selectedCategory === 'Bulldozer' ? 1.4 : 1.0)), color: '#8b5cf6' },
    { name: 'Dump Truck', value: Math.round(70 * (selectedCategory === 'Dump Truck' ? 1.4 : 1.0)), color: '#f43f5e' },
    { name: 'Forklift', value: Math.round(55 * (selectedCategory === 'Forklift' ? 1.4 : 1.0)), color: '#06b6d4' },
    { name: 'Generator', value: Math.round(40 * (selectedCategory === 'Generator' ? 1.4 : 1.0)), color: '#f97316' },
    { name: 'Compactor', value: Math.round(25 * (selectedCategory === 'Compactor' ? 1.4 : 1.0)), color: '#ec4899' },
  ]

  const utilizationData = [
    { name: `CAT 320 ${selectedCategory}`, utilization: Math.min(98, Math.round(75 * combined)), idle: Math.max(2, 100 - Math.round(75 * combined)), health: 92, revenue: Math.round(45200 * combined) },
    { name: `Komatsu PC200 ${selectedCategory}`, utilization: Math.min(95, Math.round(68 * combined)), idle: Math.max(5, 100 - Math.round(68 * combined)), health: 85, revenue: Math.round(38100 * combined) },
    { name: `Volvo EC220 ${selectedCategory}`, utilization: Math.min(94, Math.round(62 * combined)), idle: Math.max(6, 100 - Math.round(62 * combined)), health: 96, revenue: Math.round(34500 * combined) },
    { name: `CAT 966 ${selectedCategory}`, utilization: Math.min(90, Math.round(58 * combined)), idle: Math.max(10, 100 - Math.round(58 * combined)), health: 71, revenue: Math.round(28300 * combined) },
    { name: `Liebherr LTM ${selectedCategory}`, utilization: Math.min(99, Math.round(82 * combined)), idle: Math.max(1, 100 - Math.round(82 * combined)), health: 88, revenue: Math.round(62000 * combined) },
    { name: `CAT D8 ${selectedCategory}`, utilization: Math.min(88, Math.round(48 * combined)), idle: Math.max(12, 100 - Math.round(48 * combined)), health: 45, revenue: Math.round(22100 * combined) },
  ]

  const healthData = [
    { range: '90-100%', count: Math.round(180 * combined), fill: '#16a34a' },
    { range: '70-89%', count: Math.round(150 * combined), fill: '#FFC500' },
    { range: '50-69%', count: Math.round(90 * (2 - combined)), fill: '#d97706' },
    { range: '30-49%', count: Math.round(50 * (2 - combined)), fill: '#dc2626' },
    { range: '<30%', count: 30, fill: '#991b1b' },
  ]

  const recentAlerts = [
    { id: 1, type: 'critical', title: 'Engine Overheat', machine: `${selectedCategory} #247 (${selectedRegion})`, time: '3 min ago', detail: 'Temperature: 112°C (threshold: 100°C)' },
    { id: 2, type: 'warning', title: 'Maintenance Due', machine: `${selectedCategory} #189`, time: '15 min ago', detail: 'Scheduled service overdue by 3 days' },
    { id: 3, type: 'info', title: 'Geofence Breach', machine: `${selectedCategory} #312`, time: '42 min ago', detail: `Exited ${selectedRegion} zone at 13:22` },
    { id: 4, type: 'warning', title: 'Low Battery', machine: `${selectedCategory} #156`, time: '1 hr ago', detail: 'Battery voltage: 10.8V (min: 11.5V)' },
    { id: 5, type: 'critical', title: 'Hydraulic Pressure Drop', machine: `${selectedCategory} #078`, time: '2 hr ago', detail: 'Pressure: 1800 PSI (normal: 3000 PSI)' },
  ]

  const aiRecommendations = [
    { id: 1, type: 'demand', title: `Increase ${selectedCategory} inventory in ${selectedRegion} region`, confidence: Math.round(85 + (combined * 5) % 12), impact: combined > 1.1 ? 'critical' : 'high', detail: `Demand forecast shows ${Math.round(25 * combined)}% surge over the next ${forecastDays} days` },
    { id: 2, type: 'pricing', title: `Adjust ${selectedCategory} daily rates for ${selectedRegion}`, confidence: 87, impact: 'medium', detail: `Dynamic demand intensity: ${combined > 1.2 ? 'High' : combined >= 0.9 ? 'Medium' : 'Low'}` },
    { id: 3, type: 'maintenance', title: `Schedule ${selectedCategory} #247 for engine service`, confidence: 95, impact: 'critical', detail: 'Predicted failure in 8 days based on sensor trends' },
    { id: 4, type: 'optimization', title: `Reallocate 3 ${selectedCategory} units to ${selectedRegion}`, confidence: 78, impact: 'medium', detail: `${selectedRegion} region operating at ${Math.round(78 * combined)}% capacity` },
  ]

  return { revenueData, demandForecast, categoryDistribution, utilizationData, healthData, recentAlerts, aiRecommendations, combined }
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null
  return (
    <div className="custom-tooltip">
      <p className="label">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="value">
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color || entry.fill || '#FFC500', marginRight: 4 }}></span>
          {entry.name}: <strong style={{ color: '#2E2725', marginLeft: 4 }}>{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ─── KPI Cards ────────────────────────────────────────────
const KPICards = ({ category, region, multiplier = 1.0, liveData = null }) => {
  const stats = [
    { label: 'Total Fleet Units', value: liveData?.total_equipment ?? Math.round(500 * multiplier), change: `Category: ${category}`, positive: true, color: 'blue', icon: Package },
    { label: 'Active Rentals', value: liveData?.active_rentals ?? Math.round(156 * multiplier), change: `Region: ${region}`, positive: true, color: 'green', icon: FileText },
    { label: 'Revenue (MTD)', value: liveData ? `₹${(liveData.revenue_this_month / 100000).toFixed(1)}L` : `₹${(24.8 * multiplier).toFixed(1)}L`, change: liveData ? `${liveData.revenue_change_pct > 0 ? '+' : ''}${liveData.revenue_change_pct}%` : `+${(15.3 * multiplier).toFixed(1)}%`, positive: true, color: 'amber', icon: DollarSign },
    { label: 'Fleet Utilization', value: `${liveData?.avg_utilization_rate ?? Math.min(96, (73.2 * Math.sqrt(multiplier)).toFixed(1))}%`, change: multiplier > 1.0 ? '+4.2%' : '-2.1%', positive: multiplier > 1.0, color: 'cyan', icon: Activity },
    { label: 'Total Customers', value: liveData?.total_customers ?? Math.round(156 * multiplier), change: '+1.2', positive: true, color: 'violet', icon: Shield },
    { label: 'Pending Maint.', value: liveData?.pending_maintenance ?? Math.round(23 * (2 - Math.min(1.5, multiplier))), change: 'Active', positive: false, color: 'rose', icon: Wrench },
  ]
  return (
    <div className="stats-grid stagger-children">
      {stats.map((stat, i) => {
        const Icon = stat.icon
        return (
          <div key={i} className={`stat-card ${stat.color}`}>
            <div className="stat-icon"><Icon size={22} /></div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
            <div className={`stat-change ${stat.positive ? 'positive' : 'negative'}`}>
              {stat.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {stat.change}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Revenue Chart ────────────────────────────────────────
const RevenueChart = ({ data }) => {
  const [metric, setMetric] = useState('revenue')
  return (
    <div className="chart-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">{metric === 'revenue' ? 'Revenue Trend' : 'Rental Volume Trend'}</h3>
          <p className="card-subtitle">Monthly performance timeline</p>
        </div>
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button type="button" className={`tab ${metric === 'revenue' ? 'active' : ''}`} onClick={() => setMetric('revenue')}>Revenue</button>
          <button type="button" className={`tab ${metric === 'rentals' ? 'active' : ''}`} onClick={() => setMetric('rentals')}>Rentals</button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFC500" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#FFC500" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
          <XAxis dataKey="month" stroke="#999999" fontSize={11} />
          <YAxis stroke="#999999" fontSize={11} tickFormatter={v => metric === 'revenue' ? `₹${(v / 1000).toFixed(0)}K` : v} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey={metric} stroke="#FFC500" strokeWidth={2.5} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 5, fill: '#FFC500', stroke: '#2E2725', strokeWidth: 2 }} name={metric === 'revenue' ? 'Revenue (₹)' : 'Rental Bookings'} />
          <Line type="monotone" dataKey="target" stroke="#CCCCCC" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Target" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Demand Forecast Chart ────────────────────────────────
const DemandForecastChart = ({ data, category, region, days, summary, isLoading }) => (
  <div className="chart-card">
    <div className="card-header">
      <div>
        <h3 className="card-title">AI Demand Forecast — {category}</h3>
        <p className="card-subtitle">{days}-day predicted demand for {region} region</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {isLoading && <div className="loading-spinner"></div>}
        <span className="badge badge-active"><Brain size={12} /> AI Model Live</span>
      </div>
    </div>
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFC500" stopOpacity={0.20} />
            <stop offset="100%" stopColor="#FFC500" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
        <XAxis dataKey="day" stroke="#999999" fontSize={10} interval={days > 30 ? 6 : days > 14 ? 2 : 0} />
        <YAxis stroke="#999999" fontSize={11} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confGrad)" name="Upper Bound" />
        <Area type="monotone" dataKey="lower" stroke="none" fill="rgba(255,197,0,0.04)" name="Lower Bound" />
        <Line type="monotone" dataKey="predicted" stroke="#FFC500" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#FFC500', stroke: '#2E2725', strokeWidth: 2 }} name="Predicted Demand" />
      </AreaChart>
    </ResponsiveContainer>
    {summary && (
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid #E5E5E5', fontSize: 12, color: '#666666' }}>
        <span>Avg Demand: <strong style={{ color: '#2E2725' }}>{summary.avg_predicted_demand}</strong></span>
        <span>Peak Forecast: <strong style={{ color: '#16a34a' }}>{summary.peak_demand || summary.total_expected_rentals}</strong></span>
        <span>Total Expected: <strong style={{ color: '#996400' }}>{summary.total_expected_rentals}</strong></span>
      </div>
    )}
  </div>
)

// ─── Category Chart ───────────────────────────────────────
const CategoryChart = ({ data, selectedCategory }) => (
  <div className="chart-card">
    <div className="card-header">
      <div>
        <h3 className="card-title">Equipment Fleet Composition</h3>
        <p className="card-subtitle">Highlighting active selection ({selectedCategory})</p>
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <ResponsiveContainer width="50%" height={260}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value" stroke="none">
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.name === selectedCategory ? '#FFC500' : entry.color} stroke={entry.name === selectedCategory ? '#2E2725' : 'none'} strokeWidth={entry.name === selectedCategory ? 2 : 0} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ flex: 1 }}>
        {data.map((cat, i) => {
          const isSelected = cat.name === selectedCategory
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', fontSize: 12.5, borderRadius: 4, background: isSelected ? 'rgba(255,197,0,0.12)' : 'transparent', border: isSelected ? '1px solid rgba(255,197,0,0.35)' : '1px solid transparent' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: isSelected ? '#FFC500' : cat.color, flexShrink: 0 }}></span>
              <span style={{ color: isSelected ? '#2E2725' : '#666666', flex: 1, fontWeight: isSelected ? 700 : 400 }}>{cat.name} {isSelected && '(Selected)'}</span>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#2E2725' }}>{cat.value}</span>
            </div>
          )
        })}
      </div>
    </div>
  </div>
)

// ─── Health Distribution Chart ────────────────────────────
const HealthDistributionChart = ({ data }) => (
  <div className="chart-card">
    <div className="card-header">
      <div>
        <h3 className="card-title">Equipment Health Distribution</h3>
        <p className="card-subtitle">Fleet-wide health score breakdown</p>
      </div>
    </div>
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
        <XAxis dataKey="range" stroke="#999999" fontSize={11} />
        <YAxis stroke="#999999" fontSize={11} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" name="Equipment Count" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
)

// ─── Utilization Table ────────────────────────────────────
const UtilizationTable = ({ data, selectedCategory }) => {
  const getHealthClass = (h) => h >= 80 ? 'excellent' : h >= 60 ? 'good' : h >= 40 ? 'fair' : 'poor'
  return (
    <div className="chart-card full-width">
      <div className="card-header">
        <div>
          <h3 className="card-title">Fleet Utilization & Health ({selectedCategory} Units)</h3>
          <p className="card-subtitle">Real-time operating metrics filtered by feature selection</p>
        </div>
        <button className="btn btn-secondary btn-sm"><BarChart3 size={14} /> Export Report</button>
      </div>
      <table className="data-table">
        <thead><tr><th>Equipment</th><th>Utilization</th><th>Working / Idle</th><th>Health Score</th><th>Revenue</th><th>Status</th></tr></thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 600, color: '#2E2725' }}>{item.name}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="health-bar" style={{ width: 80 }}><div className={`health-bar-fill ${getHealthClass(item.utilization)}`} style={{ width: `${item.utilization}%` }}></div></div>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 13, color: '#2E2725' }}>{item.utilization}%</span>
                </div>
              </td>
              <td><span style={{ color: '#16a34a', fontWeight: 600 }}>{item.utilization}%</span>{' / '}<span style={{ color: '#d97706' }}>{item.idle}%</span></td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="health-bar" style={{ width: 60 }}><div className={`health-bar-fill ${getHealthClass(item.health)}`} style={{ width: `${item.health}%` }}></div></div>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, color: '#666666' }}>{item.health}%</span>
                </div>
              </td>
              <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#2E2725' }}>₹{item.revenue.toLocaleString()}</td>
              <td><span className={`badge ${item.health >= 70 ? 'badge-healthy' : item.health >= 40 ? 'badge-warning' : 'badge-critical'}`}>{item.health >= 70 ? 'Healthy' : item.health >= 40 ? 'Fair' : 'Critical'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Alerts Panel ─────────────────────────────────────────
const AlertsPanel = ({ alerts }) => (
  <div className="chart-card">
    <div className="card-header">
      <div>
        <h3 className="card-title">Real-Time Alerts</h3>
        <p className="card-subtitle">Live equipment & system notifications</p>
      </div>
      <span className="nav-badge">{alerts.length}</span>
    </div>
    <div style={{ maxHeight: 340, overflowY: 'auto' }}>
      {alerts.map((alert) => (
        <div key={alert.id} className={`alert-card ${alert.type}`}>
          <div style={{ marginTop: 2 }}>
            {alert.type === 'critical' && <AlertTriangle size={16} />}
            {alert.type === 'warning' && <Clock size={16} />}
            {alert.type === 'info' && <MapPin size={16} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#2E2725' }}>{alert.title}</span>
              <span className="alert-time">{alert.time}</span>
            </div>
            <div style={{ fontSize: 12, color: '#666666', marginBottom: 2 }}>{alert.machine}</div>
            <div style={{ fontSize: 11.5, color: '#999999' }}>{alert.detail}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
)

// ─── AI Recommendations ───────────────────────────────────
const AIRecommendations = ({ recommendations, category, region }) => {
  const getTypeIcon = (type) => ({ demand: TrendingUp, pricing: DollarSign, maintenance: Wrench, optimization: Zap }[type] || Brain)
  const getImpactColor = (impact) => ({ critical: '#dc2626', high: '#d97706', medium: '#2E2725' }[impact] || '#666666')
  return (
    <div className="chart-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">AI Recommendations</h3>
          <p className="card-subtitle">Dynamic suggestions for {category} in {region}</p>
        </div>
        <span className="badge badge-active"><Brain size={12} /> Explainable AI</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {recommendations.map((rec) => {
          const Icon = getTypeIcon(rec.type)
          return (
            <div key={rec.id} style={{ background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: 6, padding: 14, transition: 'all 0.18s', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 4, background: rec.type === 'maintenance' ? 'rgba(220,38,38,0.08)' : 'rgba(255,197,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: rec.type === 'maintenance' ? '#dc2626' : '#2E2725', flexShrink: 0 }}>
                  <Icon size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#2E2725', marginBottom: 4 }}>{rec.title}</div>
                  <div style={{ fontSize: 12, color: '#666666', marginBottom: 8 }}>{rec.detail}</div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#999999' }}>Confidence: <strong style={{ color: '#16a34a' }}>{rec.confidence}%</strong></span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 3, background: `${getImpactColor(rec.impact)}15`, color: getImpactColor(rec.impact), textTransform: 'uppercase', letterSpacing: '0.06em' }}>{rec.impact} impact</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── IoT Sensor Panel ─────────────────────────────────────
const IoTSensorPanel = ({ category }) => {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 2000)
    return () => clearInterval(interval)
  }, [])

  const sensors = [
    { label: 'Engine Temp', value: (85 + Math.sin(tick / 3) * 8 + Math.random() * 3).toFixed(1), unit: '°C', icon: ThermometerSun, max: 120, warn: 100 },
    { label: 'Hydraulic PSI', value: (3000 + Math.sin(tick / 5) * 200 + Math.random() * 50).toFixed(0), unit: 'PSI', icon: Gauge, max: 4000, warn: 2500 },
    { label: 'Battery', value: (12.4 + Math.sin(tick / 4) * 0.5 + Math.random() * 0.2).toFixed(1), unit: 'V', icon: Zap, max: 14.4, warn: 11 },
    { label: 'Fuel Level', value: (65 + Math.sin(tick / 6) * 10 + Math.random() * 5).toFixed(0), unit: '%', icon: Fuel, max: 100, warn: 15 },
    { label: 'RPM', value: (1800 + Math.sin(tick / 2) * 200 + Math.random() * 100).toFixed(0), unit: '', icon: Activity, max: 3000, warn: 2800 },
    { label: 'Vibration', value: (2.5 + Math.sin(tick / 3) * 0.8 + Math.random() * 0.5).toFixed(2), unit: 'g', icon: Radio, max: 8, warn: 5 },
  ]

  return (
    <div className="chart-card full-width" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <div>
          <h3 className="card-title">Live Telemetry Panel</h3>
          <p className="card-subtitle">Real-time telemetry stream from CAT 320 {category} #142</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', animation: 'alertPulse 1.5s infinite', display: 'inline-block' }}></span>
          <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Telemetry Live</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        {sensors.map((sensor, i) => {
          const Icon = sensor.icon
          const val = parseFloat(sensor.value)
          const pct = (val / sensor.max) * 100
          const isWarning = val >= sensor.warn || (sensor.label === 'Fuel Level' && val <= sensor.warn) || (sensor.label === 'Battery' && val <= sensor.warn)
          return (
            <div key={i} style={{ background: '#FAFAFA', border: `1px solid ${isWarning ? 'rgba(220,38,38,0.30)' : '#E5E5E5'}`, borderRadius: 6, padding: 14, textAlign: 'center', transition: 'all 0.25s' }}>
              <Icon size={20} style={{ color: isWarning ? '#dc2626' : '#2E2725', marginBottom: 8 }} />
              <div style={{ fontSize: 10.5, color: '#999999', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{sensor.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: isWarning ? '#dc2626' : '#2E2725', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', transition: 'color 0.3s' }}>
                {sensor.value}<span style={{ fontSize: 10, fontWeight: 500, color: '#999999', marginLeft: 2 }}>{sensor.unit}</span>
              </div>
              <div className="health-bar" style={{ marginTop: 10 }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(pct, 100)}%`, background: isWarning ? '#dc2626' : '#FFC500', transition: 'width 0.5s, background 0.3s' }}></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Feature Selection Bar ────────────────────────────────
export const FeatureSelectionBar = ({ category, setCategory, region, setRegion, days, setDays, isLoading, demandSummary }) => {
  const categories = ['Excavator', 'Loader', 'Crane', 'Bulldozer', 'Dump Truck', 'Forklift', 'Generator', 'Compactor']
  const regions = ['North', 'South', 'East', 'West', 'Central']
  const dayOptions = [7, 14, 30, 60, 90]

  return (
    <div className="feature-filter-bar">
      <div className="filter-controls-group">
        <div className="filter-group">
          <label className="filter-label" htmlFor="dash-category-select">
            <Package size={15} style={{ color: '#2E2725' }} /> Category:
          </label>
          <select id="dash-category-select" className="filter-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label" htmlFor="dash-region-select">
            <MapPin size={15} style={{ color: '#2E2725' }} /> Region:
          </label>
          <select id="dash-region-select" className="filter-select" value={region} onChange={(e) => setRegion(e.target.value)}>
            {regions.map(reg => <option key={reg} value={reg}>{reg}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label"><Clock size={15} style={{ color: '#2E2725' }} /> Forecast Horizon:</label>
          <div className="filter-pills">
            {dayOptions.map(d => (
              <button key={d} type="button" className={`filter-pill ${days === d ? 'active' : ''}`} onClick={() => setDays(d)}>{d} Days</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="loading-spinner"></div>
            <span style={{ fontSize: 12, color: '#666666' }}>Fetching API...</span>
          </div>
        ) : (
          <div className="active-filter-badge">
            <span className="pulse-dot"></span>
            <span>{category} ({region}) • Avg Demand: <strong>{demandSummary?.avg_predicted_demand || '—'}</strong></span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Dashboard Page ───────────────────────────────────────
export default function DashboardPage({ category, setCategory, region, setRegion, days, setDays, isLoading, demandForecast, demandSummary, dashboardData }) {
  const [liveData, setLiveData] = useState(null)

  useEffect(() => {
    fetch(`${API}/analytics/dashboard`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setLiveData(d) })
      .catch(() => {})
  }, [])

  return (
    <div className="page-content">
      <FeatureSelectionBar
        category={category} setCategory={setCategory}
        region={region} setRegion={setRegion}
        days={days} setDays={setDays}
        isLoading={isLoading} demandSummary={demandSummary}
      />
      <KPICards category={category} region={region} multiplier={dashboardData.combined} liveData={liveData} />
      <IoTSensorPanel category={category} />
      <div className="charts-grid">
        <RevenueChart data={dashboardData.revenueData} />
        <DemandForecastChart data={demandForecast.length ? demandForecast : dashboardData.demandForecast} category={category} region={region} days={days} summary={demandSummary} isLoading={isLoading} />
      </div>
      <div className="charts-grid">
        <CategoryChart data={dashboardData.categoryDistribution} selectedCategory={category} />
        <HealthDistributionChart data={dashboardData.healthData} />
      </div>
      <div style={{ marginBottom: 24 }}>
        <UtilizationTable data={dashboardData.utilizationData} selectedCategory={category} />
      </div>
      <div className="charts-grid">
        <AlertsPanel alerts={dashboardData.recentAlerts} />
        <AIRecommendations recommendations={dashboardData.aiRecommendations} category={category} region={region} />
      </div>
    </div>
  )
}
