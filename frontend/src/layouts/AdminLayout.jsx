/**
 * AdminLayout — Existing Admin Dashboard Shell
 * Wraps the existing 10 admin pages with sidebar and header.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Truck, Users, FileText, Settings,
  BarChart3, Brain, Bell, Search, Wrench, Radio, LogOut
} from 'lucide-react'

// Page Imports
import DashboardPage from '../pages/DashboardPage'
import FleetPage from '../pages/FleetPage'
import RentalsPage from '../pages/RentalsPage'
import CustomersPage from '../pages/CustomersPage'
import AnalyticsPage from '../pages/AnalyticsPage'
import AIInsightsPage from '../pages/AIInsightsPage'
import MaintenancePage from '../pages/MaintenancePage'
import AlertsPage from '../pages/AlertsPage'
import IoTSensorsPage from '../pages/IoTSensorsPage'
import SettingsPage from '../pages/SettingsPage'

// ─── Dynamic Data Generator ────────────────────────────
const generateDynamicData = (selectedCategory = 'Excavator', selectedRegion = 'North', forecastDays = 30) => {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const catMults = { 'Excavator':1.35,'Loader':1.10,'Crane':0.75,'Bulldozer':0.90,'Dump Truck':1.20,'Forklift':1.45,'Generator':0.65,'Compactor':0.50 }
  const regMults = { 'North':1.20,'South':0.85,'East':1.05,'West':0.95,'Central':1.30 }
  const cm = catMults[selectedCategory] || 1.0, rm = regMults[selectedRegion] || 1.0
  const combined = cm * rm

  const revenueData = months.map((month,i) => ({
    month,
    revenue: Math.floor((70000+Math.sin(i/2)*35000+Math.random()*15000)*combined),
    rentals: Math.floor((35+Math.sin(i/2)*15+Math.random()*8)*combined),
    target: Math.floor(100000*combined),
  }))
  const demandForecast = Array.from({length:forecastDays},(_,i) => {
    const base = (5.5+Math.sin(i/4)*2.5)*combined
    const predicted = +(base+(Math.random()*0.8-0.4)).toFixed(1)
    return { day:`Day ${i+1}`, predicted, upper:+(predicted+1.8*Math.sqrt(predicted/3)).toFixed(1), lower:+Math.max(0.5,predicted-1.8*Math.sqrt(predicted/3)).toFixed(1) }
  })
  const categoryDistribution = [
    { name:'Excavator', value:Math.round(120*(selectedCategory==='Excavator'?1.4:1.0)), color:'#3b82f6' },
    { name:'Loader', value:Math.round(85*(selectedCategory==='Loader'?1.4:1.0)), color:'#10b981' },
    { name:'Crane', value:Math.round(45*(selectedCategory==='Crane'?1.4:1.0)), color:'#f59e0b' },
    { name:'Bulldozer', value:Math.round(60*(selectedCategory==='Bulldozer'?1.4:1.0)), color:'#8b5cf6' },
    { name:'Dump Truck', value:Math.round(70*(selectedCategory==='Dump Truck'?1.4:1.0)), color:'#f43f5e' },
    { name:'Forklift', value:Math.round(55*(selectedCategory==='Forklift'?1.4:1.0)), color:'#06b6d4' },
    { name:'Generator', value:Math.round(40*(selectedCategory==='Generator'?1.4:1.0)), color:'#f97316' },
    { name:'Compactor', value:Math.round(25*(selectedCategory==='Compactor'?1.4:1.0)), color:'#ec4899' },
  ]
  const utilizationData = [
    { name:`CAT 320 ${selectedCategory}`, utilization:Math.min(98,Math.round(75*combined)), idle:Math.max(2,100-Math.round(75*combined)), health:92, revenue:Math.round(45200*combined) },
    { name:`Komatsu PC200 ${selectedCategory}`, utilization:Math.min(95,Math.round(68*combined)), idle:Math.max(5,100-Math.round(68*combined)), health:85, revenue:Math.round(38100*combined) },
    { name:`Volvo EC220 ${selectedCategory}`, utilization:Math.min(94,Math.round(62*combined)), idle:Math.max(6,100-Math.round(62*combined)), health:96, revenue:Math.round(34500*combined) },
    { name:`CAT 966 ${selectedCategory}`, utilization:Math.min(90,Math.round(58*combined)), idle:Math.max(10,100-Math.round(58*combined)), health:71, revenue:Math.round(28300*combined) },
    { name:`Liebherr LTM ${selectedCategory}`, utilization:Math.min(99,Math.round(82*combined)), idle:Math.max(1,100-Math.round(82*combined)), health:88, revenue:Math.round(62000*combined) },
    { name:`CAT D8 ${selectedCategory}`, utilization:Math.min(88,Math.round(48*combined)), idle:Math.max(12,100-Math.round(48*combined)), health:45, revenue:Math.round(22100*combined) },
  ]
  const healthData = [
    { range:'90-100%', count:Math.round(180*combined), fill:'#16a34a' },
    { range:'70-89%', count:Math.round(150*combined), fill:'#FFC500' },
    { range:'50-69%', count:Math.round(90*(2-combined)), fill:'#d97706' },
    { range:'30-49%', count:Math.round(50*(2-combined)), fill:'#dc2626' },
    { range:'<30%', count:30, fill:'#991b1b' },
  ]
  const recentAlerts = [
    { id:1, type:'critical', title:'Engine Overheat', machine:`${selectedCategory} #247 (${selectedRegion})`, time:'3 min ago', detail:'Temperature: 112°C (threshold: 100°C)' },
    { id:2, type:'warning', title:'Maintenance Due', machine:`${selectedCategory} #189`, time:'15 min ago', detail:'Scheduled service overdue by 3 days' },
    { id:3, type:'info', title:'Geofence Breach', machine:`${selectedCategory} #312`, time:'42 min ago', detail:`Exited ${selectedRegion} zone at 13:22` },
    { id:4, type:'warning', title:'Low Battery', machine:`${selectedCategory} #156`, time:'1 hr ago', detail:'Battery voltage: 10.8V (min: 11.5V)' },
    { id:5, type:'critical', title:'Hydraulic Pressure Drop', machine:`${selectedCategory} #078`, time:'2 hr ago', detail:'Pressure: 1800 PSI (normal: 3000 PSI)' },
  ]
  const aiRecommendations = [
    { id:1, type:'demand', title:`Increase ${selectedCategory} inventory in ${selectedRegion}`, confidence:Math.round(85+(combined*5)%12), impact:combined>1.1?'critical':'high', detail:`Demand surge ${Math.round(25*combined)}% next ${forecastDays} days` },
    { id:2, type:'pricing', title:`Adjust ${selectedCategory} rates for ${selectedRegion}`, confidence:87, impact:'medium', detail:`Demand intensity: ${combined>1.2?'High':combined>=0.9?'Medium':'Low'}` },
    { id:3, type:'maintenance', title:`Schedule ${selectedCategory} #247 for service`, confidence:95, impact:'critical', detail:'Predicted failure in 8 days' },
    { id:4, type:'optimization', title:`Reallocate 3 ${selectedCategory} to ${selectedRegion}`, confidence:78, impact:'medium', detail:`${selectedRegion} at ${Math.round(78*combined)}% capacity` },
  ]
  return { revenueData, demandForecast, categoryDistribution, utilizationData, healthData, recentAlerts, aiRecommendations, combined }
}

// ─── Sidebar ─────────────────────────────────────────────
const AdminSidebar = ({ activePage, setActivePage }) => {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const navItems = [
    { section: 'Main' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'fleet', label: 'Fleet Overview', icon: Truck },
    { id: 'rentals', label: 'Rentals', icon: FileText, badge: 12 },
    { id: 'customers', label: 'Customers', icon: Users },
    { section: 'Intelligence' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'ai', label: 'AI Insights', icon: Brain, badge: 4 },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, badge: 7 },
    { section: 'System' },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: 3 },
    { id: 'iot', label: 'IoT Sensors', icon: Radio },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">SR</div>
        <div>
          <h1>Caterpillar Dealer</h1>
          <span>Fleet Administration</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item, i) => {
          if (item.section) return <div key={i} className="nav-section-title">{item.section}</div>
          const Icon = item.icon
          return (
            <a key={item.id} className={`nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => setActivePage(item.id)}>
              <Icon className="nav-icon" />
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </a>
          )
        })}
      </nav>
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <a className="nav-item" onClick={handleLogout} style={{ color: '#dc2626' }}>
          <LogOut className="nav-icon" />
          <span>Sign Out</span>
        </a>
      </div>
    </aside>
  )
}

// ─── Admin Layout Component ──────────────────────────────
export default function AdminLayout() {
  const [activePage, setActivePage] = useState('dashboard')
  const [selectedCategory, setSelectedCategory] = useState('Excavator')
  const [selectedRegion, setSelectedRegion] = useState('North')
  const [forecastDays, setForecastDays] = useState(30)
  const [isLoading, setIsLoading] = useState(false)
  const [demandForecast, setDemandForecast] = useState([])
  const [demandSummary, setDemandSummary] = useState(null)
  const [dashboardData, setDashboardData] = useState(() => generateDynamicData('Excavator', 'North', 30))

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    const fetchForecastData = async () => {
      try {
        const url = `http://localhost:8000/api/v1/analytics/demand-forecast?category=${encodeURIComponent(selectedCategory)}&region=${encodeURIComponent(selectedRegion)}&days=${forecastDays}`
        const res = await fetch(url)
        if (res.ok) {
          const json = await res.json()
          if (isMounted && json.forecasts) {
            setDemandForecast(json.forecasts.map(f => ({ day: f.day || f.date, predicted: f.predicted_demand, upper: f.confidence_upper, lower: f.confidence_lower })))
            setDemandSummary(json.summary)
          }
        } else { throw new Error('API error') }
      } catch {
        const fallback = generateDynamicData(selectedCategory, selectedRegion, forecastDays)
        if (isMounted) {
          setDemandForecast(fallback.demandForecast)
          setDemandSummary({ avg_predicted_demand: (fallback.demandForecast.reduce((a,c) => a+c.predicted,0)/fallback.demandForecast.length).toFixed(1), total_expected_rentals: Math.round(fallback.demandForecast.reduce((a,c) => a+c.predicted,0)), peak_demand: Math.max(...fallback.demandForecast.map(f => f.predicted)) })
        }
      } finally {
        if (isMounted) { setDashboardData(generateDynamicData(selectedCategory, selectedRegion, forecastDays)); setIsLoading(false) }
      }
    }
    fetchForecastData()
    return () => { isMounted = false }
  }, [selectedCategory, selectedRegion, forecastDays])

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardPage category={selectedCategory} setCategory={setSelectedCategory} region={selectedRegion} setRegion={setSelectedRegion} days={forecastDays} setDays={setForecastDays} isLoading={isLoading} demandForecast={demandForecast} demandSummary={demandSummary} dashboardData={dashboardData} />
      case 'fleet': return <FleetPage />
      case 'rentals': return <RentalsPage />
      case 'customers': return <CustomersPage />
      case 'analytics': return <AnalyticsPage />
      case 'ai': return <AIInsightsPage />
      case 'maintenance': return <MaintenancePage />
      case 'alerts': return <AlertsPage />
      case 'iot': return <IoTSensorsPage />
      case 'settings': return <SettingsPage />
      default: return <DashboardPage category={selectedCategory} setCategory={setSelectedCategory} region={selectedRegion} setRegion={setSelectedRegion} days={forecastDays} setDays={setForecastDays} isLoading={isLoading} demandForecast={demandForecast} demandSummary={demandSummary} dashboardData={dashboardData} />
    }
  }

  const pageTitle = { dashboard:'Admin Dashboard', fleet:'Fleet Overview', rentals:'Rentals', customers:'Customers', analytics:'Analytics', ai:'AI Intelligence', maintenance:'Maintenance', alerts:'Alerts', iot:'IoT Sensors', settings:'Settings' }

  return (
    <div className="app-layout">
      <AdminSidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="main-content">
        <header className="header">
          <h2 className="header-title">{pageTitle[activePage] || 'Dashboard'}</h2>
          <div className="header-actions">
            <div className="search-bar">
              <Search size={15} style={{ color: 'rgba(255,255,255,0.45)' }} />
              <input placeholder="Search equipment, rentals, customers..." />
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setActivePage('alerts')} style={{ background:'rgba(255,255,255,0.08)', color:'#fff', border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, position:'relative' }}>
              <Bell size={14} />
              <span className="nav-badge" style={{ marginLeft:0, fontSize:9, padding:'1px 5px' }}>3</span>
            </button>
            <div style={{ width:34, height:34, borderRadius:4, background:'#FFC500', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, cursor:'pointer', color:'#000' }}>AD</div>
          </div>
        </header>
        {renderPage()}
      </main>
    </div>
  )
}
