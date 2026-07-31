/**
 * CustomerLayout — Customer Portal Shell
 * Separate sidebar, header, and navigation from Admin.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, ShoppingCart, Brain, Search, FileText, MapPin,
  CreditCard, Receipt, LifeBuoy, Bell, User, Settings, LogOut, Bot
} from 'lucide-react'

// Customer Page Imports
import CustomerDashboard from '../pages/customer/CustomerDashboard'
import BookEquipmentPage from '../pages/customer/BookEquipmentPage'
import AIRecommendationPage from '../pages/customer/AIRecommendationPage'
import CustomerAIAssistant from '../pages/customer/CustomerAIAssistant'
import SearchEquipmentPage from '../pages/customer/SearchEquipmentPage'
import MyRentalsPage from '../pages/customer/MyRentalsPage'
import TrackEquipmentPage from '../pages/customer/TrackEquipmentPage'
import PaymentsPage from '../pages/customer/PaymentsPage'
import InvoicesPage from '../pages/customer/InvoicesPage'
import SupportPage from '../pages/customer/SupportPage'
import NotificationsPage from '../pages/customer/NotificationsPage'
import ProfilePage from '../pages/customer/ProfilePage'
import CustomerSettingsPage from '../pages/customer/CustomerSettingsPage'

const CustomerSidebar = ({ activePage, setActivePage }) => {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const navItems = [
    { section: 'Overview' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { section: 'AI Assistant' },
    { id: 'ai-assistant', label: 'AI Rental Assistant', icon: Bot, badge: 'AI' },
    { id: 'ai-recommend', label: 'AI Recommendation', icon: Brain },
    { section: 'Rental' },
    { id: 'book', label: 'Book Equipment', icon: ShoppingCart },
    { id: 'search', label: 'Search Equipment', icon: Search },
    { section: 'My Orders' },
    { id: 'rentals', label: 'My Rentals', icon: FileText, badge: null },
    { id: 'track', label: 'Track Equipment', icon: MapPin },
    { section: 'Finance' },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'invoices', label: 'Invoices', icon: Receipt },
    { section: 'Help' },
    { id: 'support', label: 'Support', icon: LifeBuoy },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { section: 'Account' },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <aside className="sidebar customer-sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon" style={{ background: '#FFC500', color: '#000' }}>CAT</div>
        <div>
          <h1>Caterpillar Dealer</h1>
          <span>Customer Portal</span>
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
              {item.badge && (
                <span className="nav-badge" style={{
                  background: item.id === 'ai-assistant' ? '#FFC500' : undefined,
                  color: item.id === 'ai-assistant' ? '#000000' : undefined,
                  fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4
                }}>
                  {item.id === 'ai-assistant' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#16a34a' }} />}
                  {item.badge}
                </span>
              )}
            </a>
          )
        })}
      </nav>
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <a className="nav-item" onClick={() => { logout(); navigate('/login', { replace: true }) }} style={{ color: '#dc2626' }}>
          <LogOut className="nav-icon" />
          <span>Sign Out</span>
        </a>
      </div>
    </aside>
  )
}

export default function CustomerLayout() {
  const [activePage, setActivePage] = useState('dashboard')
  const { user } = useAuth()

  const userName = user?.name || localStorage.getItem('userName') || 'Customer'
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const pageTitle = {
    dashboard: 'Customer Dashboard',
    'ai-assistant': 'AI Rental Assistant',
    book: 'Book Equipment',
    search: 'Search Equipment',
    rentals: 'My Rentals',
    track: 'Track Equipment',
    payments: 'Payments',
    invoices: 'Invoices',
    support: 'Support Center',
    notifications: 'Notifications',
    profile: 'My Profile',
    settings: 'Settings',
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <CustomerDashboard onNavigate={setActivePage} />
      case 'ai-assistant': return <CustomerAIAssistant />
      case 'book': return <BookEquipmentPage onNavigate={setActivePage} />
      case 'search': return <SearchEquipmentPage onNavigate={setActivePage} />
      case 'rentals': return <MyRentalsPage onNavigate={setActivePage} />
      case 'track': return <TrackEquipmentPage />
      case 'payments': return <PaymentsPage />
      case 'invoices': return <InvoicesPage />
      case 'support': return <SupportPage />
      case 'notifications': return <NotificationsPage />
      case 'profile': return <ProfilePage />
      case 'settings': return <CustomerSettingsPage />
      default: return <CustomerDashboard onNavigate={setActivePage} />
    }
  }

  return (
    <div className="app-layout">
      <CustomerSidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="main-content">
        <header className="header">
          <h2 className="header-title">{pageTitle[activePage] || 'Dashboard'}</h2>
          <div className="header-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => setActivePage('notifications')} style={{ background:'rgba(255,255,255,0.08)', color:'#fff', border:'1px solid rgba(255,255,255,0.15)', borderRadius:6 }}>
              <Bell size={14} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width:34, height:34, borderRadius:4, background:'#FFC500', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#000' }}>
                {initials}
              </div>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{userName}</span>
            </div>
          </div>
        </header>
        {renderPage()}
      </main>
    </div>
  )
}
