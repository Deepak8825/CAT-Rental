/**
 * BookEquipmentPage — 7-step booking wizard with inline AI recommendations & pricing
 *
 * Flow: Job Details → Site & Requirements → Options → AI Recommendations →
 *       Pricing & Quote → Review → Confirmation
 */
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  ChevronRight, ChevronLeft, CheckCircle2, Loader2, Brain, Search,
  Fuel, TrendingUp, Shield, AlertTriangle, Sparkles, Truck,
  IndianRupee, ReceiptText, Star, ArrowRight
} from 'lucide-react'

const API = 'http://localhost:8000/api/v1'

export default function BookEquipmentPage({ onNavigate }) {
  const { authFetch } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  // AI Recommendations state
  const [recommendations, setRecommendations] = useState([])
  const [recLoading, setRecLoading] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState(null)

  // Quote state
  const [quote, setQuote] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(false)

  // Reasoning expand toggle
  const [expandedReasoning, setExpandedReasoning] = useState(null)

  // Browse inventory state
  const [browseMode, setBrowseMode] = useState('ai') // 'ai' or 'browse'
  const [inventory, setInventory] = useState([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('')

  const [form, setForm] = useState({
    job_type: 'excavation',
    construction_type: 'construction',
    project_duration_days: 7,
    location: '',
    machine_preference: '',
    terrain_type: 'mixed',
    digging_depth_m: '',
    payload_tons: '',
    operator_required: false,
    fuel_included: false,
    delivery_required: true,
    insurance_required: true,
    start_date: '',
    accessories: [],
  })

  const updateForm = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // ─── Fetch AI Recommendations ──────────────────────
  const fetchRecommendations = async () => {
    setRecLoading(true)
    setError('')
    setRecommendations([])
    setSelectedEquipment(null)
    setQuote(null)
    try {
      const body = {
        job_type: form.job_type,
        construction_type: form.construction_type,
        project_duration_days: Number(form.project_duration_days),
        location: form.location,
        budget_per_day: null,
        machine_preference: form.machine_preference || null,
        terrain_type: form.terrain_type || null,
        digging_depth_m: form.digging_depth_m ? Number(form.digging_depth_m) : null,
        payload_tons: form.payload_tons ? Number(form.payload_tons) : null,
      }
      const res = await authFetch(`${API}/customer/bookings/get-recommendations`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        setRecommendations(data.recommendations || [])
      } else {
        const err = await res.json()
        setError(err.detail || 'Failed to get recommendations')
      }
    } catch (e) {
      setError('Network error fetching recommendations')
    }
    setRecLoading(false)
  }

  // ─── Fetch Available Inventory ─────────────────────
  const fetchInventory = async (cat = '') => {
    setInventoryLoading(true)
    try {
      let url = `${API}/customer/inventory/search?limit=30`
      if (cat) url += `&category=${cat}`
      const res = await authFetch(url)
      if (res.ok) setInventory(await res.json())
    } catch {}
    setInventoryLoading(false)
  }

  const handleBrowseSelect = (eq) => {
    const rec = {
      equipment_id: eq.id,
      equipment_name: eq.name,
      equipment_model: eq.model,
      category: eq.category,
      daily_rate: eq.daily_rate,
      health_score: eq.health_score,
      fit_score: null,
      confidence: null,
      engine_power_hp: eq.engine_power_hp,
    }
    setSelectedEquipment(rec)
    fetchQuote(eq.id)
  }

  // ─── Fetch Quote Preview ──────────────────────────
  const fetchQuote = async (equipmentId) => {
    setQuoteLoading(true)
    setError('')
    try {
      const body = {
        equipment_id: equipmentId,
        project_duration_days: Number(form.project_duration_days),
        operator_required: form.operator_required,
        fuel_included: form.fuel_included,
        delivery_required: form.delivery_required,
        insurance_required: form.insurance_required,
        terrain_type: form.terrain_type || null,
      }
      const res = await authFetch(`${API}/customer/bookings/get-quote`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setQuote(await res.json())
        setStep(5)
      } else {
        const err = await res.json()
        setError(err.detail || 'Failed to get quote')
      }
    } catch (e) {
      setError('Network error fetching quote')
    }
    setQuoteLoading(false)
  }

  // ─── Submit Booking ───────────────────────────────
  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const body = {
        ...form,
        project_duration_days: Number(form.project_duration_days),
        budget_per_day: null,
        digging_depth_m: form.digging_depth_m ? Number(form.digging_depth_m) : null,
        payload_tons: form.payload_tons ? Number(form.payload_tons) : null,
        end_date: null,
        selected_equipment_id: selectedEquipment?.equipment_id || null,
      }
      const res = await authFetch(`${API}/customer/bookings`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setResult(await res.json())
        setStep(7)
      } else {
        const err = await res.json()
        setError(err.detail || 'Failed to create booking')
      }
    } catch (e) {
      setError('Network error')
    }
    setLoading(false)
  }

  // Auto-fetch recommendations when entering step 4
  useEffect(() => {
    if (step === 4 && recommendations.length === 0 && !recLoading) {
      fetchRecommendations()
    }
  }, [step])

  const handleSelectMachine = (rec) => {
    setSelectedEquipment(rec)
    fetchQuote(rec.equipment_id)
  }

  const steps = [
    'Job Details',
    'Site & Requirements',
    'Options',
    'AI Recommendations',
    'Pricing & Quote',
    'Review',
    'Confirmed'
  ]

  const getConfidenceColor = (c) => c >= 80 ? '#16a34a' : c >= 60 ? '#d97706' : '#dc2626'
  const getRiskColor = (r) => r < 25 ? '#16a34a' : r < 50 ? '#d97706' : '#dc2626'

  return (
    <div className="page-content">
      {/* Step Indicator */}
      <div className="booking-stepper">
        {steps.map((label, i) => (
          <div key={i} className={`booking-step ${step > i + 1 ? 'completed' : step === i + 1 ? 'active' : ''}`}>
            <div className="booking-step-number">{step > i + 1 ? <CheckCircle2 size={16} /> : i + 1}</div>
            <span className="booking-step-label">{label}</span>
            {i < steps.length - 1 && <div className="booking-step-line"></div>}
          </div>
        ))}
      </div>

      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* ═══ Step 1: Job Details ═══ */}
      {step === 1 && (
        <div className="chart-card full-width">
          <div className="card-header"><h3 className="card-title">Job Details</h3></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="login-field">
              <label>Job Type</label>
              <select className="filter-select" style={{ width: '100%' }} value={form.job_type} onChange={e => updateForm('job_type', e.target.value)}>
                <option value="excavation">Excavation & Trenching</option>
                <option value="loading">Material Loading</option>
                <option value="grading">Site Grading</option>
                <option value="lifting">Heavy Lifting</option>
                <option value="hauling">Material Hauling</option>
                <option value="compaction">Compaction</option>
              </select>
            </div>
            <div className="login-field">
              <label>Construction Type</label>
              <select className="filter-select" style={{ width: '100%' }} value={form.construction_type} onChange={e => updateForm('construction_type', e.target.value)}>
                <option value="construction">Construction</option>
                <option value="road">Road Building</option>
                <option value="mining">Mining</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="agriculture">Agriculture</option>
              </select>
            </div>
            <div className="login-field">
              <label>Project Duration (Days)</label>
              <input type="number" min="1" value={form.project_duration_days} onChange={e => updateForm('project_duration_days', e.target.value)} />
            </div>
            <div className="login-field">
              <label>Start Date</label>
              <input type="date" value={form.start_date} onChange={e => updateForm('start_date', e.target.value)} required />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!form.start_date}>Next <ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {/* ═══ Step 2: Site & Requirements ═══ */}
      {step === 2 && (
        <div className="chart-card full-width">
          <div className="card-header"><h3 className="card-title">Site & Machine Requirements</h3></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="login-field" style={{ gridColumn: 'span 2' }}>
              <label>Project Location</label>
              <input type="text" value={form.location} onChange={e => updateForm('location', e.target.value)} placeholder="e.g. Sector 45, Gurgaon, Haryana" required />
            </div>
            <div className="login-field">
              <label>Terrain Type</label>
              <select className="filter-select" style={{ width: '100%' }} value={form.terrain_type} onChange={e => updateForm('terrain_type', e.target.value)}>
                <option value="clay">Clay</option>
                <option value="rock">Rock</option>
                <option value="sand">Sand</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>

            <div className="login-field">
              <label>Digging Depth (meters)</label>
              <input type="number" step="0.1" value={form.digging_depth_m} onChange={e => updateForm('digging_depth_m', e.target.value)} placeholder="e.g. 6.5" />
            </div>
            <div className="login-field">
              <label>Payload (tons)</label>
              <input type="number" step="0.1" value={form.payload_tons} onChange={e => updateForm('payload_tons', e.target.value)} placeholder="e.g. 20" />
            </div>
            <div className="login-field" style={{ gridColumn: 'span 2' }}>
              <label>Machine Preference (optional)</label>
              <input type="text" value={form.machine_preference} onChange={e => updateForm('machine_preference', e.target.value)} placeholder="e.g. CAT 320 Excavator" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}><ChevronLeft size={14} /> Back</button>
            <button className="btn btn-primary" onClick={() => setStep(3)} disabled={!form.location}>Next <ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {/* ═══ Step 3: Options ═══ */}
      {step === 3 && (
        <div className="chart-card full-width">
          <div className="card-header"><h3 className="card-title">Additional Options</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { key: 'operator_required', label: 'Operator Required', desc: 'Certified operator will be provided with the machine' },
              { key: 'fuel_included', label: 'Fuel Included', desc: 'Diesel/fuel costs included in the rental price' },
              { key: 'delivery_required', label: 'Delivery Required', desc: 'Machine will be transported to your project site' },
              { key: 'insurance_required', label: 'Insurance Coverage', desc: 'Comprehensive insurance during rental period' },
            ].map(opt => (
              <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, background: form[opt.key] ? '#FFF9E6' : '#FAFAFA', border: `1px solid ${form[opt.key] ? '#FFC500' : '#E5E5E5'}`, borderRadius: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={form[opt.key]} onChange={e => updateForm(opt.key, e.target.checked)} style={{ accentColor: '#FFC500', width: 18, height: 18 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#2E2725' }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)}><ChevronLeft size={14} /> Back</button>
            <button className="btn btn-primary" onClick={() => { setRecommendations([]); setSelectedEquipment(null); setQuote(null); setStep(4) }}>
              <Brain size={14} /> Get AI Recommendations <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ═══ Step 4: AI Recommendations ═══ */}
      {step === 4 && (
        <div className="ai-recommendations-section">
          {/* AI Header Banner */}
          <div className="chart-card full-width ai-rec-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="ai-rec-icon-wrap">
                  <Brain size={26} />
                </div>
                <div>
                  <h2 style={{ color: '#FFC500', fontSize: 18, fontWeight: 800, margin: 0 }}>Choose Your Equipment</h2>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '4px 0 0' }}>
                    Pick from AI recommendations or browse all available machines
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Toggle: AI vs Browse */}
          <div className="equipment-choice-tabs">
            <button
              className={`equipment-choice-tab ${browseMode === 'ai' ? 'active' : ''}`}
              onClick={() => setBrowseMode('ai')}
            >
              <Brain size={15} /> AI Recommendations
            </button>
            <button
              className={`equipment-choice-tab ${browseMode === 'browse' ? 'active' : ''}`}
              onClick={() => { setBrowseMode('browse'); if (inventory.length === 0) fetchInventory() }}
            >
              <Search size={15} /> Browse All Equipment
            </button>
          </div>

          {/* === AI Recommendations Tab === */}
          {browseMode === 'ai' && (
            <>
          {/* Loading State */}
          {recLoading && (
            <div className="chart-card full-width ai-analyzing-card">
              <div className="ai-pulse-container">
                <div className="ai-pulse-ring"></div>
                <div className="ai-pulse-ring delay-1"></div>
                <div className="ai-pulse-ring delay-2"></div>
                <Brain size={32} className="ai-pulse-icon" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#2E2725', margin: '20px 0 6px' }}>AI is analyzing your requirements...</h3>
              <p style={{ color: '#666', fontSize: 12 }}>Evaluating equipment health, capacity, terrain compatibility, and budget fit</p>
            </div>
          )}

          {/* Recommendation Cards */}
          {!recLoading && recommendations.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={`chart-card full-width ai-rec-card ${rec.is_primary ? 'primary' : ''} ${selectedEquipment?.equipment_id === rec.equipment_id ? 'selected' : ''}`}
                  id={`rec-card-${idx}`}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        {rec.is_primary && <span className="ai-rec-badge primary-badge"><Star size={10} /> Top Pick</span>}
                        <span className="ai-rec-badge fit-badge">Fit: {rec.fit_score}%</span>
                        {idx < 3 && <span className="ai-rec-badge rank-badge">#{idx + 1}</span>}
                      </div>
                      <h3 style={{ fontSize: 17, fontWeight: 800, color: '#2E2725', margin: 0 }}>{rec.equipment_name}</h3>
                      <p style={{ fontSize: 12, color: '#666', margin: '2px 0 0' }}>
                        {rec.equipment_model} • {rec.category} • ₹{rec.daily_rate?.toLocaleString()}/day
                        {rec.year_manufactured && ` • ${rec.year_manufactured}`}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: getConfidenceColor(rec.confidence), lineHeight: 1 }}>{rec.confidence}%</div>
                      <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>Confidence</div>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="ai-rec-metrics">
                    <div className="ai-rec-metric">
                      <Fuel size={16} style={{ color: '#d97706' }} />
                      <div className="ai-rec-metric-value">{rec.estimated_fuel_per_day?.toFixed(0)}L</div>
                      <div className="ai-rec-metric-label">Fuel/Day</div>
                    </div>
                    <div className="ai-rec-metric">
                      <TrendingUp size={16} style={{ color: '#16a34a' }} />
                      <div className="ai-rec-metric-value">{rec.expected_productivity?.toFixed(0)}%</div>
                      <div className="ai-rec-metric-label">Productivity</div>
                    </div>
                    <div className="ai-rec-metric">
                      <Shield size={16} style={{ color: '#3b82f6' }} />
                      <div className="ai-rec-metric-value">{rec.health_score}%</div>
                      <div className="ai-rec-metric-label">Health</div>
                    </div>
                    <div className="ai-rec-metric">
                      <AlertTriangle size={16} style={{ color: getRiskColor(rec.risk_score) }} />
                      <div className="ai-rec-metric-value">{rec.risk_score?.toFixed(0)}</div>
                      <div className="ai-rec-metric-label">Risk Score</div>
                    </div>
                    {rec.engine_power_hp && (
                      <div className="ai-rec-metric">
                        <Sparkles size={16} style={{ color: '#8b5cf6' }} />
                        <div className="ai-rec-metric-value">{rec.engine_power_hp}HP</div>
                        <div className="ai-rec-metric-label">Power</div>
                      </div>
                    )}
                  </div>

                  {/* Explainable AI Reasoning */}
                  <div className="ai-reasoning-block">
                    <button className="ai-reasoning-toggle" onClick={() => setExpandedReasoning(expandedReasoning === idx ? null : idx)}>
                      🧠 AI Reasoning {expandedReasoning === idx ? '▾' : '▸'}
                    </button>
                    {expandedReasoning === idx && (
                      <ul className="ai-reasoning-list">
                        {(rec.reasoning || []).map((reason, ri) => (
                          <li key={ri}>{reason}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Select Button */}
                  <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className={`btn ${rec.is_primary ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleSelectMachine(rec)}
                      disabled={quoteLoading}
                    >
                      {quoteLoading && selectedEquipment?.equipment_id === rec.equipment_id
                        ? <><Loader2 size={14} className="animate-spin" /> Getting Quote...</>
                        : <>Select This Machine <ArrowRight size={14} /></>
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!recLoading && recommendations.length === 0 && !error && (
            <div className="chart-card full-width" style={{ textAlign: 'center', padding: 40 }}>
              <Truck size={40} style={{ color: '#999', marginBottom: 12 }} />
              <p style={{ color: '#666' }}>No matching equipment found for your job type.</p>
              <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => { setBrowseMode('browse'); if (inventory.length === 0) fetchInventory() }}>
                <Search size={14} /> Browse All Equipment Instead
              </button>
            </div>
          )}
            </>
          )}

          {/* === Browse All Equipment Tab === */}
          {browseMode === 'browse' && (
            <>
              {/* Category Filter */}
              <div className="feature-filter-bar" style={{ marginBottom: 16 }}>
                <div className="filter-controls-group">
                  <div className="filter-group">
                    <label className="filter-label">Category:</label>
                    <div className="filter-pills">
                      {['', 'Excavator', 'Loader', 'Crane', 'Bulldozer', 'Dump Truck', 'Forklift', 'Compactor'].map(c => (
                        <button key={c} className={`filter-pill ${categoryFilter === c ? 'active' : ''}`} onClick={() => { setCategoryFilter(c); fetchInventory(c) }}>
                          {c || 'All'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {inventoryLoading ? (
                <div className="chart-card full-width" style={{ padding: 40, textAlign: 'center', color: '#666' }}>Loading equipment...</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  {inventory.map(eq => (
                    <div key={eq.id} className={`chart-card browse-eq-card ${selectedEquipment?.equipment_id === eq.id ? 'selected' : ''}`} style={{ padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 6, background: '#FFC500', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Truck size={20} style={{ color: '#000' }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: '#2E2725', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{eq.name}</div>
                          <div style={{ fontSize: 11, color: '#666' }}>{eq.category} • {eq.model}</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                        {[
                          ['Rate', `₹${eq.daily_rate?.toLocaleString()}/day`],
                          ['Health', `${eq.health_score}%`],
                          ['Power', eq.engine_power_hp ? `${eq.engine_power_hp}HP` : 'N/A'],
                          ['Capacity', eq.max_load_capacity ? `${eq.max_load_capacity}t` : 'N/A'],
                        ].map(([l, v], i) => (
                          <div key={i} style={{ padding: 5, background: '#FAFAFA', borderRadius: 4, fontSize: 11 }}>
                            <span style={{ color: '#999' }}>{l}: </span>
                            <span style={{ fontWeight: 700, color: '#2E2725' }}>{v}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ width: '100%' }}
                        onClick={() => handleBrowseSelect(eq)}
                        disabled={quoteLoading}
                      >
                        {quoteLoading && selectedEquipment?.equipment_id === eq.id
                          ? <><Loader2 size={14} className="animate-spin" /> Getting Quote...</>
                          : <>Select & Get Quote <ArrowRight size={12} /></>
                        }
                      </button>
                    </div>
                  ))}
                  {inventory.length === 0 && (
                    <div className="chart-card" style={{ gridColumn: 'span 3', padding: 40, textAlign: 'center', color: '#999' }}>
                      No equipment found for this category
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => setStep(3)}><ChevronLeft size={14} /> Back to Options</button>
            {browseMode === 'ai' && (
              <button className="btn btn-secondary" onClick={fetchRecommendations} disabled={recLoading}>
                {recLoading ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />} Refresh Recommendations
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ Step 5: Pricing & Quote ═══ */}
      {step === 5 && quote && (
        <div className="quote-section">
          {/* Selected Machine Summary */}
          <div className="chart-card full-width" style={{ borderLeft: '4px solid #FFC500', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, background: '#FFC500', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Truck size={22} style={{ color: '#000' }} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#2E2725', margin: 0 }}>Selected: {quote.equipment_name}</h3>
                <p style={{ fontSize: 12, color: '#666', margin: '2px 0 0' }}>{quote.equipment_model} • ₹{quote.daily_rate?.toLocaleString()}/day × {quote.duration_days} days</p>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="chart-card full-width quote-breakdown-card">
            <div className="card-header" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ReceiptText size={20} style={{ color: '#FFC500' }} />
                <h3 className="card-title" style={{ margin: 0 }}>Dynamic Price Breakdown</h3>
              </div>
            </div>

            <div className="quote-breakdown">
              <div className="quote-line">
                <span className="quote-line-label">Base Rate ({quote.duration_days} days)</span>
                <span className="quote-line-value">₹{quote.base_price?.toLocaleString()}</span>
              </div>
              <div className="quote-line sub">
                <span className="quote-line-label">↳ Demand Multiplier (Seasonal)</span>
                <span className="quote-line-value">×{quote.demand_multiplier?.toFixed(2)}</span>
              </div>
              <div className="quote-line sub">
                <span className="quote-line-label">↳ Health Multiplier ({selectedEquipment?.health_score}%)</span>
                <span className="quote-line-value">×{quote.health_multiplier?.toFixed(2)}</span>
              </div>
              {quote.transport_cost > 0 && (
                <div className="quote-line">
                  <span className="quote-line-label">🚛 Transport & Delivery</span>
                  <span className="quote-line-value">₹{quote.transport_cost?.toLocaleString()}</span>
                </div>
              )}
              {quote.insurance_cost > 0 && (
                <div className="quote-line">
                  <span className="quote-line-label">🛡️ Insurance Coverage</span>
                  <span className="quote-line-value">₹{quote.insurance_cost?.toLocaleString()}</span>
                </div>
              )}
              {quote.operator_cost > 0 && (
                <div className="quote-line">
                  <span className="quote-line-label">👷 Operator ({quote.duration_days} days)</span>
                  <span className="quote-line-value">₹{quote.operator_cost?.toLocaleString()}</span>
                </div>
              )}
              {quote.fuel_estimate > 0 && (
                <div className="quote-line">
                  <span className="quote-line-label">⛽ Fuel Estimate</span>
                  <span className="quote-line-value">₹{quote.fuel_estimate?.toLocaleString()}</span>
                </div>
              )}
              <div className="quote-line">
                <span className="quote-line-label">📋 GST (18%)</span>
                <span className="quote-line-value">₹{quote.tax_amount?.toLocaleString()}</span>
              </div>
              {quote.discount_amount > 0 && (
                <div className="quote-line discount">
                  <span className="quote-line-label">🎉 {quote.discount_reason || 'Discount'}</span>
                  <span className="quote-line-value" style={{ color: '#16a34a' }}>-₹{quote.discount_amount?.toLocaleString()}</span>
                </div>
              )}
              <div className="quote-total-line">
                <span className="quote-total-label">
                  <IndianRupee size={18} /> Total Price
                </span>
                <span className="quote-total-value">₹{quote.total_price?.toLocaleString()}</span>
              </div>
            </div>

            {/* AI Price Explanation */}
            <div className="ai-price-explanation">
              <Sparkles size={14} style={{ color: '#FFC500', flexShrink: 0 }} />
              <p>{quote.price_explanation}</p>
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => setStep(4)}><ChevronLeft size={14} /> Choose Different Machine</button>
            <button className="btn btn-primary" onClick={() => setStep(6)}>Accept Quote & Review <ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {/* ═══ Step 6: Review & Confirm ═══ */}
      {step === 6 && (
        <div className="chart-card full-width">
          <div className="card-header"><h3 className="card-title">Review Your Booking</h3></div>

          {/* Job Details Summary */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#999', textTransform: 'uppercase', marginBottom: 8 }}>Job Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['Job Type', form.job_type],
                ['Construction', form.construction_type],
                ['Duration', `${form.project_duration_days} days`],
                ['Start Date', form.start_date],
                ['Location', form.location],
                ['Terrain', form.terrain_type],
                ['Payload', form.payload_tons ? `${form.payload_tons}t` : 'N/A'],
              ].map(([label, value], i) => (
                <div key={i} style={{ padding: 10, background: '#FAFAFA', borderRadius: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#666' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#2E2725' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Equipment */}
          {selectedEquipment && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#999', textTransform: 'uppercase', marginBottom: 8 }}>
                Selected Equipment {selectedEquipment.fit_score != null ? '(AI Recommended)' : '(Your Selection)'}
              </h4>
              <div style={{ padding: 14, background: '#FFF9E6', border: '1px solid #FFC500', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 6, background: '#FFC500', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={20} style={{ color: '#000' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#2E2725' }}>{selectedEquipment.equipment_name}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>
                    {selectedEquipment.equipment_model} • {selectedEquipment.category}
                    {selectedEquipment.fit_score != null && ` • Fit: ${selectedEquipment.fit_score}%`}
                  </div>
                </div>
                {selectedEquipment.confidence != null && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#666' }}>Confidence</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: getConfidenceColor(selectedEquipment.confidence) }}>{selectedEquipment.confidence}%</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Options Summary */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#999', textTransform: 'uppercase', marginBottom: 8 }}>Options</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['Operator', form.operator_required ? '✅ Yes' : '❌ No'],
                ['Fuel', form.fuel_included ? '✅ Included' : '❌ Not included'],
                ['Delivery', form.delivery_required ? '✅ Yes' : '❌ No'],
                ['Insurance', form.insurance_required ? '✅ Yes' : '❌ No'],
              ].map(([label, value], i) => (
                <div key={i} style={{ padding: 10, background: '#FAFAFA', borderRadius: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#666' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#2E2725' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Summary */}
          {quote && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#999', textTransform: 'uppercase', marginBottom: 8 }}>Pricing</h4>
              <div style={{ padding: 16, background: 'linear-gradient(135deg, #2E2725 0%, #1a1614 100%)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Total Quote</div>
                  <div style={{ color: '#FFC500', fontSize: 28, fontWeight: 800 }}>₹{quote.total_price?.toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Daily Rate</div>
                  <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>₹{quote.daily_rate?.toLocaleString()}/day</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => setStep(5)}><ChevronLeft size={14} /> Back</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ fontSize: 14, padding: '12px 28px' }}>
              {loading ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : <>✅ Confirm & Submit Booking</>}
            </button>
          </div>
        </div>
      )}

      {/* ═══ Step 7: Confirmation ═══ */}
      {step === 7 && result && (
        <div className="chart-card full-width" style={{ textAlign: 'center', padding: 40 }}>
          <div className="confirmation-checkmark">
            <CheckCircle2 size={52} />
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: '#2E2725', marginBottom: 8 }}>Booking Confirmed!</h3>
          <p style={{ color: '#666', marginBottom: 4 }}>Booking ID: <strong>{result.booking_id?.slice(0, 8)}</strong></p>
          <p style={{ color: '#666', marginBottom: 6 }}>Status: <span className="ai-rec-badge primary-badge">{result.status}</span></p>
          <p style={{ color: '#666', marginBottom: 24 }}>{result.message}</p>

          {selectedEquipment && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 20px', background: '#FFF9E6', border: '1px solid #FFC500', borderRadius: 8, marginBottom: 24 }}>
              <Truck size={18} style={{ color: '#FFC500' }} />
              <span style={{ fontWeight: 700, color: '#2E2725', fontSize: 13 }}>{selectedEquipment.equipment_name}</span>
              {quote && <span style={{ color: '#666', fontSize: 12 }}>• ₹{quote.total_price?.toLocaleString()}</span>}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => onNavigate('rentals')}>View My Rentals</button>
            <button className="btn btn-secondary" onClick={() => { setStep(1); setResult(null); setRecommendations([]); setSelectedEquipment(null); setQuote(null); setForm(prev => ({ ...prev, start_date: '', location: '' })) }}>Book Another</button>
          </div>
        </div>
      )}
    </div>
  )
}
