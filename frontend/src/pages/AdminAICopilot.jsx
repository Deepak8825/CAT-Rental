/**
 * AdminAICopilot — Enterprise Caterpillar Fleet AI Assistant & Briefing Engine
 * Redesigned UI/UX: Modern layout, enterprise header badges, progressive status loader,
 * structured response cards, visual evidence panel, confidence meters, and SSE streaming.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Brain, Send, Loader2, Database, Sparkles, RefreshCw, FileText,
  AlertTriangle, ShieldAlert, TrendingUp, Wrench, CheckCircle2, Bot, User,
  Cpu, Radio, Zap, ChevronRight, Activity, DollarSign, Truck, ShieldCheck, ArrowDown
} from 'lucide-react'

const API = 'http://localhost:8000/api/v1'

const ADMIN_QUICK_CARDS = [
  {
    icon: Truck,
    title: 'Fleet Health & Utilization',
    subtitle: 'Check active machines, idle count & health scores',
    query: 'Give me a comprehensive breakdown of current fleet health and utilization rates',
    category: 'Fleet Ops'
  },
  {
    icon: DollarSign,
    title: 'Revenue & Growth Analysis',
    subtitle: 'Compare current month revenue against last month',
    query: 'Show me current month revenue compared to last month and month-over-month growth percentage',
    category: 'Financials'
  },
  {
    icon: Wrench,
    title: 'Maintenance Priorities',
    subtitle: 'Identify high-risk machines & overdue service',
    query: 'What equipment requires immediate maintenance or service attention?',
    category: 'Maintenance'
  },
  {
    icon: Radio,
    title: 'Live Telemetry & Anomalies',
    subtitle: 'Inspect temperature, pressure & engine alerts',
    query: 'Are there any active telemetry alerts, geofence breaches, or engine overheat anomalies?',
    category: 'Telemetry'
  },
  {
    icon: AlertTriangle,
    title: 'Critical Health Watchlist',
    subtitle: 'List machines with health score under 60%',
    query: 'Which machines currently have a health score under 60% and where are they located?',
    category: 'Risk Analysis'
  },
  {
    icon: Sparkles,
    title: 'Executive Fleet Briefing',
    subtitle: 'Generate full executive status report',
    query: 'Generate a comprehensive Fleet Status Briefing covering revenue, maintenance, and actions',
    category: 'Executive'
  },
]

const PROGRESSIVE_ADMIN_STAGES = [
  { text: 'Analyzing fleet operation parameters & query...', icon: '🔍' },
  { text: 'Querying SQLite fleet health, revenue & active rentals...', icon: '📊' },
  { text: 'Checking maintenance records & critical telemetry alerts...', icon: '🔧' },
  { text: 'Running predictive demand & pricing models...', icon: '📈' },
  { text: 'Formatting grounded executive intelligence briefing...', icon: '🧠' },
]

function DataSourceBadge({ source }) {
  const config = {
    fleet_health: { label: 'Fleet Health', icon: Activity, bg: 'rgba(59,130,246,0.1)', border: '#93c5fd', text: '#1d4ed8' },
    revenue_summary: { label: 'Revenue Summary', icon: DollarSign, bg: 'rgba(16,185,129,0.1)', border: '#6ee7b7', text: '#047857' },
    maintenance_records: { label: 'Maintenance Records', icon: Wrench, bg: 'rgba(245,158,11,0.1)', border: '#fde047', text: '#854d0e' },
    event_alerts: { label: 'Event Alerts', icon: AlertTriangle, bg: 'rgba(239,68,68,0.1)', border: '#fca5a5', text: '#b91c1c' },
    critical_equipment: { label: 'Critical Equipment', icon: ShieldAlert, bg: 'rgba(139,92,246,0.1)', border: '#c4b5fd', text: '#6d28d9' },
    live_telemetry: { label: 'Live Telemetry', icon: Radio, bg: 'rgba(6,182,212,0.1)', border: '#67e8f9', text: '#0e7490' },
  }
  const item = config[source] || { label: source, icon: Database, bg: 'rgba(255,197,0,0.12)', border: '#FFC500', text: '#854d0e' }
  const Icon = item.icon

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', margin: '3px 4px 3px 0',
      background: item.bg, border: `1px solid ${item.border}`, borderRadius: 16,
      fontSize: 11, fontWeight: 600, color: item.text, transition: 'transform 0.15s ease',
    }}>
      <Icon size={12} />
      {item.label}
    </span>
  )
}

function ProgressiveLoader() {
  const [stageIndex, setStageIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setStageIndex(prev => (prev < PROGRESSIVE_ADMIN_STAGES.length - 1 ? prev + 1 : prev))
    }, 850)
    return () => clearInterval(timer)
  }, [])

  const current = PROGRESSIVE_ADMIN_STAGES[stageIndex]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
      background: 'rgba(255, 197, 0, 0.08)', border: '1px solid rgba(255, 197, 0, 0.25)',
      borderRadius: 10, margin: '8px 0 12px 0', animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{ position: 'relative', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={18} color="#B8900A" style={{ animation: 'spin 1.2s linear infinite' }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#854d0e', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{current.icon}</span>
          <span>{current.text}</span>
        </div>
        <div style={{ width: '100%', height: 3, background: 'rgba(255, 197, 0, 0.2)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: '#FFC500', borderRadius: 2,
            width: `${((stageIndex + 1) / PROGRESSIVE_ADMIN_STAGES.length) * 100}%`,
            transition: 'width 0.6s ease-in-out'
          }} />
        </div>
      </div>
    </div>
  )
}

function MessageCard({ msg }) {
  const isAI = msg.role === 'ai'
  const hasSources = isAI && msg.dataSources && msg.dataSources.length > 0 && !msg.streaming

  return (
    <div style={{
      display: 'flex', gap: 14, alignItems: 'flex-start',
      flexDirection: isAI ? 'row' : 'row-reverse',
      marginBottom: 20, width: '100%',
    }}>
      {/* Avatar */}
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: isAI ? 'linear-gradient(135deg, #FFC500 0%, #E0AC00 100%)' : 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isAI ? '0 4px 12px rgba(255, 197, 0, 0.35)' : '0 4px 12px rgba(15, 23, 42, 0.25)',
        border: isAI ? '1px solid #FFE066' : '1px solid #334155',
      }}>
        {isAI ? <Brain size={20} color="#000" /> : <User size={20} color="#fff" />}
      </div>

      {/* Content Container */}
      <div style={{
        maxWidth: '84%', width: '100%',
        display: 'flex', flexDirection: 'column', alignItems: isAI ? 'flex-start' : 'flex-end'
      }}>
        <div style={{
          background: isAI ? '#FFFFFF' : 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          color: isAI ? '#1E293B' : '#FFFFFF',
          border: isAI ? '1px solid #E2E8F0' : 'none',
          borderRadius: isAI ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
          padding: '16px 20px',
          boxShadow: isAI ? '0 4px 20px rgba(0,0,0,0.05)' : '0 4px 16px rgba(15,23,42,0.15)',
          position: 'relative', width: '100%',
        }}>
          {/* Header Tag for AI */}
          {isAI && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={14} color="#16a34a" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Fleet Operations Intelligence
                </span>
              </div>
              <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>
                {msg.timestamp}
              </span>
            </div>
          )}

          {/* Body Content */}
          <div style={{
            fontSize: 14, lineHeight: 1.7,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            fontFamily: 'inherit'
          }}>
            {msg.streaming && msg.content === '' ? (
              <ProgressiveLoader />
            ) : (
              <>
                {msg.content}
                {msg.streaming && (
                  <span style={{
                    display: 'inline-block', width: 8, height: 16, background: '#FFC500',
                    marginLeft: 4, verticalAlign: 'middle', animation: 'pulse 0.8s infinite'
                  }} />
                )}
              </>
            )}
          </div>

          {/* Grounded Evidence Panel & Data Sources */}
          {hasSources && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Database size={12} color="#854d0e" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Grounded Fleet Data Sources
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {msg.dataSources.map(s => <DataSourceBadge key={s} source={s} />)}
              </div>
            </div>
          )}
        </div>

        {!isAI && (
          <span style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, marginRight: 4 }}>
            {msg.timestamp}
          </span>
        )}
      </div>
    </div>
  )
}

export default function AdminAICopilot() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [aiStatus, setAiStatus] = useState(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  const chatContainerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }

  useEffect(() => {
    scrollToBottom(true)
  }, [messages])

  useEffect(() => {
    fetch(`${API}/ai/health`)
      .then(res => res.json())
      .then(data => setAiStatus(data))
      .catch(() => setAiStatus({ status: 'offline' }))
  }, [])

  const handleScroll = () => {
    if (!chatContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 150)
  }

  const sendQuery = useCallback(async (queryText) => {
    const text = (queryText || input).trim()
    if (!text || isLoading) return

    setInput('')
    setIsLoading(true)

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const aiMsgId = Date.now() + 1
    const aiMsg = {
      id: aiMsgId,
      role: 'ai',
      content: '',
      streaming: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dataSources: [],
    }

    setMessages(prev => [...prev, userMsg, aiMsg])

    try {
      let url = `${API}/ai/admin/stream?query=${encodeURIComponent(text)}`
      if (selectedCategory) url += `&category=${encodeURIComponent(selectedCategory)}`
      if (selectedRegion) url += `&region=${encodeURIComponent(selectedRegion)}`

      const token = localStorage.getItem('token')
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })

      if (!response.ok) throw new Error('Stream request failed')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''
      let dataSources = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'metadata') {
              dataSources = event.data_sources || []
            } else if (event.type === 'token') {
              fullText += event.content
              setMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, content: fullText, dataSources } : m
              ))
            } else if (event.type === 'done') {
              break
            }
          } catch {}
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === aiMsgId ? { ...m, content: fullText, streaming: false, dataSources } : m
      ))
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === aiMsgId ? {
          ...m,
          content: '⚠️ Failed to reach local AI service. Please ensure Ollama is running (`ollama serve`).',
          streaming: false,
        } : m
      ))
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, selectedCategory, selectedRegion])

  const generateBriefing = async () => {
    if (briefingLoading || isLoading) return
    setBriefingLoading(true)

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: '⚡ Requesting Executive Fleet Status Briefing...',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const aiMsgId = Date.now() + 1
    setMessages(prev => [...prev, userMsg, {
      id: aiMsgId,
      role: 'ai',
      content: '',
      streaming: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dataSources: [],
    }])

    try {
      let url = `${API}/ai/admin/briefing`
      const params = []
      if (selectedCategory) params.push(`category=${encodeURIComponent(selectedCategory)}`)
      if (selectedRegion) params.push(`region=${encodeURIComponent(selectedRegion)}`)
      if (params.length) url += `?${params.join('&')}`

      const token = localStorage.getItem('token')
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? {
            ...m,
            content: data.briefing,
            streaming: false,
            dataSources: data.data_sources || [],
          } : m
        ))
      } else {
        throw new Error('Briefing failed')
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === aiMsgId ? {
          ...m,
          content: '⚠️ Could not generate briefing. Ensure backend service is active.',
          streaming: false,
        } : m
      ))
    } finally {
      setBriefingLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <div style={{
      height: 'calc(100vh - 85px)', display: 'flex', flexDirection: 'column',
      background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0',
      overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
    }}>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .admin-action-card:hover { border-color: #FFC500 !important; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(255,197,0,0.18) !important; }
        .send-btn-admin:hover:not(:disabled) { background: #E0AC00 !important; transform: scale(1.03); }
        .send-btn-admin:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      {/* Enterprise Header Bar */}
      <div style={{
        padding: '14px 24px', background: '#0F172A', borderBottom: '1px solid #1E293B',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #FFC500 0%, #E0AC00 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(255,197,0,0.4)', border: '1px solid #FFE066'
          }}>
            <Brain size={24} color="#000" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
                Caterpillar Fleet AI Copilot
              </h2>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                background: 'rgba(255, 197, 0, 0.2)', color: '#FFC500', border: '1px solid rgba(255, 197, 0, 0.4)'
              }}>
                OPERATIONS
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>Executive Fleet Intelligence & Grounded Triage</span>
            </div>
          </div>
        </div>

        {/* Filters & Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Category Selector */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{
              padding: '6px 12px', background: '#1E293B', color: '#F8FAFC',
              border: '1px solid #334155', borderRadius: 8, fontSize: 12, fontWeight: 600, outline: 'none'
            }}
          >
            <option value="">All Categories</option>
            <option value="Excavator">Excavators</option>
            <option value="Loader">Loaders</option>
            <option value="Bulldozer">Bulldozers</option>
            <option value="Crane">Cranes</option>
            <option value="Dump Truck">Dump Trucks</option>
          </select>

          {/* Region Selector */}
          <select
            value={selectedRegion}
            onChange={e => setSelectedRegion(e.target.value)}
            style={{
              padding: '6px 12px', background: '#1E293B', color: '#F8FAFC',
              border: '1px solid #334155', borderRadius: 8, fontSize: 12, fontWeight: 600, outline: 'none'
            }}
          >
            <option value="">All Regions</option>
            <option value="North">North Region</option>
            <option value="South">South Region</option>
            <option value="East">East Region</option>
            <option value="West">West Region</option>
            <option value="Central">Central Region</option>
          </select>

          {/* Generate Briefing Button */}
          <button
            onClick={generateBriefing}
            disabled={briefingLoading || isLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              background: '#FFC500', color: '#000000', border: 'none', borderRadius: 8,
              fontSize: 12, fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(255,197,0,0.3)',
              transition: 'all 0.2s'
            }}
          >
            {briefingLoading ? (
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Sparkles size={14} />
            )}
            <span>Generate Briefing</span>
          </button>

          {/* Badges */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#34d399'
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'pulse 1.5s infinite' }} />
            <span>Online</span>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
            background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#c4b5fd'
          }}>
            <Cpu size={12} />
            <span>{aiStatus?.active_model || 'Qwen2.5:3B'}</span>
          </div>

          {messages.length > 0 && (
            <button
              onClick={clearChat}
              style={{
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8, padding: '6px 12px', color: '#CBD5E1', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Body */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1, overflowY: 'auto', padding: '24px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          position: 'relative'
        }}
      >
        <div style={{ width: '100%', maxWidth: 940 }}>
          {messages.length === 0 ? (
            /* Welcome Empty State Dashboard */
            <div style={{ padding: '20px 0', animation: 'fadeIn 0.4s ease-out' }}>
              <div style={{
                textAlign: 'center', marginBottom: 32, padding: '32px 24px',
                background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16, background: 'rgba(255,197,0,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto',
                  border: '1px solid rgba(255,197,0,0.4)'
                }}>
                  <Brain size={28} color="#854d0e" />
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0' }}>
                  Caterpillar Fleet AI Copilot
                </h3>
                <p style={{ fontSize: 14, color: '#64748B', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
                  Operations intelligence grounded in live SQLite telemetry, revenue records, and maintenance logs. Select a pre-built query or click <strong>"Generate Briefing"</strong> for an instant executive status report.
                </p>
              </div>

              {/* Quick Action Grid */}
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14, paddingLeft: 4 }}>
                ⚡ Fleet Intelligence Operations Cards
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14
              }}>
                {ADMIN_QUICK_CARDS.map((card, i) => {
                  const Icon = card.icon
                  return (
                    <div
                      key={i}
                      className="admin-action-card"
                      onClick={() => sendQuery(card.query)}
                      style={{
                        padding: '16px 18px', background: '#FFFFFF', border: '1px solid #E2E8F0',
                        borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, background: 'rgba(255,197,0,0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#854d0e'
                        }}>
                          <Icon size={18} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>
                          {card.category}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                          {card.title}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
                          {card.subtitle}
                        </div>
                      </div>
                      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#854d0e' }}>
                        <span>Run Query</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Render Conversation Messages */
            messages.map(msg => <MessageCard key={msg.id} msg={msg} />)
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Scroll Button */}
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom(true)}
          style={{
            position: 'absolute', bottom: 90, right: 32, width: 36, height: 36, borderRadius: '50%',
            background: '#0F172A', color: '#FFF', border: '1px solid #334155', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 10
          }}
        >
          <ArrowDown size={18} />
        </button>
      )}

      {/* Bottom Input Controls */}
      <div style={{
        padding: '16px 24px', background: '#FFFFFF', borderTop: '1px solid #E2E8F0',
        display: 'flex', flexDirection: 'column', alignItems: 'center'
      }}>
        <div style={{ width: '100%', maxWidth: 940 }}>
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-end',
            border: '1.5px solid #CBD5E1', borderRadius: 14, padding: '10px 14px',
            background: '#FFFFFF', transition: 'all 0.2s', boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendQuery()
                }
              }}
              placeholder="Ask Fleet AI Copilot about revenue, maintenance priorities, active rentals, or telemetry alerts..."
              disabled={isLoading}
              rows={1}
              style={{
                flex: 1, border: 'none', outline: 'none', resize: 'none',
                fontSize: 14, fontFamily: 'inherit', lineHeight: 1.5,
                background: 'transparent', color: '#0F172A', maxHeight: 120, overflowY: 'auto'
              }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
            />
            <button
              className="send-btn-admin"
              onClick={() => sendQuery()}
              disabled={!input.trim() || isLoading}
              style={{
                width: 40, height: 40, borderRadius: 10, background: '#FFC500',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(255, 197, 0, 0.4)'
              }}
            >
              {isLoading ? (
                <Loader2 size={18} color="#000" style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Send size={18} color="#000" />
              )}
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: '0 4px' }}>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>
              Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for newline
            </span>
            <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>
              Grounded Operations Intelligence Engine
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
