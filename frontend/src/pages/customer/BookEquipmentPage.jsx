/**
 * BookEquipmentPage — 7-step booking wizard supporting multi-equipment single orders with quantity selection
 *
 * Flow: Job Details → Site & Requirements → Options → AI Recommendations & Multi-Selection + Quantities →
 *       Pricing & Quote → Review → Confirmation
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  ChevronRight, ChevronLeft, CheckCircle2, Loader2, Brain, Search,
  Fuel, TrendingUp, Shield, AlertTriangle, Sparkles, Truck,
  Star, ArrowRight, Plus, Check, Trash2, Minus
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

  // Multi-equipment Cart State (with quantity)
  const [selectedEquipments, setSelectedEquipments] = useState([])

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

  // Toggle machine selection in cart
  const toggleSelectMachine = (rec) => {
    const eqId = rec.equipment_id || rec.id
    setSelectedEquipments(prev => {
      const exists = prev.some(e => e.equipment_id === eqId)
      if (exists) {
        return prev.filter(e => e.equipment_id !== eqId)
      } else {
        const item = {
          equipment_id: eqId,
          equipment_name: rec.equipment_name || rec.name,
          equipment_model: rec.equipment_model || rec.model,
          category: rec.category,
          daily_rate: rec.daily_rate,
          health_score: rec.health_score || 100,
          fit_score: rec.fit_score != null ? rec.fit_score : 95.0,
          confidence: rec.confidence != null ? rec.confidence : 90.0,
          quantity: 1, // Default quantity = 1
        }
        return [...prev, item]
      }
    })
  }

  // Update item quantity in cart
  const updateQuantity = (eqId, delta) => {
    setSelectedEquipments(prev => {
      return prev.map(item => {
        if (item.equipment_id === eqId) {
          const newQty = Math.max(1, (item.quantity || 1) + delta)
          return { ...item, quantity: newQty }
        }
        return item
      })
    })
  }

  // ─── Fetch AI Recommendations ──────────────────────
  const fetchRecommendations = async () => {
    setRecLoading(true)
    setError('')
    setRecommendations([])
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
        const recs = data.recommendations || []
        setRecommendations(recs)
        // Auto-select primary recommendation if cart is empty
        if (recs.length > 0 && selectedEquipments.length === 0) {
          const primary = recs[0]
          setSelectedEquipments([{
            equipment_id: primary.equipment_id,
            equipment_name: primary.equipment_name,
            equipment_model: primary.equipment_model,
            category: primary.category,
            daily_rate: primary.daily_rate,
            health_score: primary.health_score,
            fit_score: primary.fit_score,
            confidence: primary.confidence,
            quantity: 1,
          }])
        }
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
    } catch (e) {
      console.error('Fetch inventory error:', e)
    }
    setInventoryLoading(false)
  }

  // ─── Fetch Dynamic Quote for Selected Cart ────────
  const fetchCartQuote = async () => {
    if (selectedEquipments.length === 0) return
    setQuoteLoading(true)
    setError('')
    try {
      const totalUnits = selectedEquipments.reduce((sum, e) => sum + (e.quantity || 1), 0)
      const totalDailyRate = selectedEquipments.reduce((sum, e) => sum + (e.daily_rate || 0) * (e.quantity || 1), 0)
      const duration = Number(form.project_duration_days) || 1
      const base = totalDailyRate * duration
      const transport = form.delivery_required ? 5000 * totalUnits : 0
      const operator = form.operator_required ? 2500 * totalUnits * duration : 0
      const insurance = form.insurance_required ? base * 0.05 : 0
      const subtotal = base + transport + operator + insurance
      const tax = subtotal * 0.18
      const total = subtotal + tax

      setQuote({
        base_price: base,
        daily_rate: totalDailyRate,
        transport_cost: transport,
        insurance_cost: insurance,
        operator_cost: operator,
        tax_amount: tax,
        total_price: total,
        item_count: selectedEquipments.length,
        total_units: totalUnits,
      })
      setStep(5)
    } catch (e) {
      setError('Error generating quote')
    }
    setQuoteLoading(false)
  }

  // ─── Submit Booking ───────────────────────────────
  const handleSubmit = async () => {
    if (selectedEquipments.length === 0) {
      setError('Please select at least one machine for your order.')
      return
    }
    setLoading(true)
    setError('')
    try {
      // Expand equipment IDs according to user-selected quantities
      const selectedIds = []
      selectedEquipments.forEach(item => {
        const qty = item.quantity || 1
        for (let i = 0; i < qty; i++) {
          selectedIds.push(item.equipment_id)
        }
      })

      const body = {
        ...form,
        project_duration_days: Number(form.project_duration_days),
        budget_per_day: null,
        digging_depth_m: form.digging_depth_m ? Number(form.digging_depth_m) : null,
        payload_tons: form.payload_tons ? Number(form.payload_tons) : null,
        end_date: null,
        selected_equipment_id: selectedIds[0],
        selected_equipment_ids: selectedIds,
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
      setError('Network error submitting order')
    }
    setLoading(false)
  }

  useEffect(() => {
    if (step === 4 && recommendations.length === 0 && !recLoading) {
      fetchRecommendations()
    }
  }, [step])

  const steps = [
    'Job Details',
    'Site & Requirements',
    'Options',
    'Equipment Selection',
    'Pricing & Quote',
    'Review Order',
    'Confirmation'
  ]

  const totalCartUnits = selectedEquipments.reduce((sum, e) => sum + (e.quantity || 1), 0)
  const totalCartDailyRate = selectedEquipments.reduce((sum, e) => sum + (e.daily_rate || 0) * (e.quantity || 1), 0)

  return (
    <div className="page-content">
      {/* ─── Step Indicator Progress Bar ─── */}
      <div className="booking-stepper full-width">
        {steps.map((label, idx) => {
          const sNum = idx + 1
          const isActive = step === sNum
          const isDone = step > sNum
          return (
            <div key={idx} className={`stepper-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`} onClick={() => { if (isDone) setStep(sNum) }}>
              <div className="stepper-circle">
                {isDone ? <CheckCircle2 size={16} /> : sNum}
              </div>
              <span className="stepper-label">{label}</span>
              {idx < steps.length - 1 && <div className="stepper-line" />}
            </div>
          )
        })}
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* ═══ Step 1: Job Details ═══ */}
      {step === 1 && (
        <div className="chart-card full-width">
          <div className="card-header"><h3 className="card-title">Project & Job Specification</h3></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="login-field">
              <label>Job Type</label>
              <select className="filter-select" style={{ width: '100%' }} value={form.job_type} onChange={e => updateForm('job_type', e.target.value)}>
                <option value="excavation">Excavation & Trenching</option>
                <option value="loading">Material Loading & Handling</option>
                <option value="grading">Site Grading & Levelling</option>
                <option value="lifting">Heavy Lifting & Crane Ops</option>
                <option value="hauling">Material Hauling & Transport</option>
                <option value="compaction">Road & Soil Compaction</option>
                <option value="power">Site Power Generation</option>
              </select>
            </div>
            <div className="login-field">
              <label>Construction Category</label>
              <select className="filter-select" style={{ width: '100%' }} value={form.construction_type} onChange={e => updateForm('construction_type', e.target.value)}>
                <option value="construction">General Infrastructure / Building</option>
                <option value="roadwork">Road & Highway Work</option>
                <option value="mining">Mining & Quarrying</option>
                <option value="demolition">Demolition & Site Clearance</option>
                <option value="agriculture">Agriculture & Landscaping</option>
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
              { key: 'operator_required', label: 'Operator Required', desc: 'Certified operator will be provided for each machine unit' },
              { key: 'fuel_included', label: 'Fuel Included', desc: 'Fuel costs included in the rental price for all units' },
              { key: 'delivery_required', label: 'Delivery Required', desc: 'Machines will be transported to your project site' },
              { key: 'insurance_required', label: 'Insurance Coverage', desc: 'Comprehensive insurance during rental period' },
            ].map(opt => (
              <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, background: form[opt.key] ? '#FFF9E6' : '#FAFAFA', border: `1px solid ${form[opt.key] ? '#FFC500' : '#E5E5E5'}`, borderRadius: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={form[opt.key]} onChange={e => updateForm(opt.key, e.target.checked)} style={{ accentColor: '#FFC500', width: 18, height: 18 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#2E2725' }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)}><ChevronLeft size={14} /> Back</button>
            <button className="btn btn-primary" onClick={() => setStep(4)}>Find & Select Equipment <ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {/* ═══ Step 4: Equipment Selection (Multi-Item + Quantity Control) ═══ */}
      {step === 4 && (
        <div>
          {/* Header & Mode Switcher */}
          <div className="chart-card full-width" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="card-title">Select Equipment & Quantities</h3>
                <p className="card-subtitle">Select multiple machine models and specify the quantity of units needed</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={`btn btn-sm ${browseMode === 'ai' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setBrowseMode('ai')}>
                  <Brain size={14} /> AI Recommendations
                </button>
                <button className={`btn btn-sm ${browseMode === 'browse' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setBrowseMode('browse'); if (inventory.length === 0) fetchInventory() }}>
                  <Search size={14} /> Browse Catalog
                </button>
              </div>
            </div>
          </div>

          {/* Cart Summary Floating Banner */}
          {selectedEquipments.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #2E2725 0%, #1a1614 100%)',
              color: '#FFF', padding: '16px 24px', borderRadius: 12, marginBottom: 20,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            }}>
              <div>
                <div style={{ fontSize: 13, color: '#FFC500', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  🛒 Order Cart: {selectedEquipments.length} Model(s) • {totalCartUnits} Total Machine Unit(s)
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                  {selectedEquipments.map(e => `${e.quantity || 1}x ${e.equipment_name}`).join(' • ')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Combined Daily Rate</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#FFC500' }}>
                    ₹{totalCartDailyRate.toLocaleString()}/day
                  </div>
                </div>
                <button className="btn btn-primary" onClick={fetchCartQuote} disabled={quoteLoading}>
                  {quoteLoading ? <><Loader2 size={14} className="animate-spin" /> Calculating...</> : <>Proceed to Quote <ChevronRight size={14} /></>}
                </button>
              </div>
            </div>
          )}

          {/* AI Recommendations List */}
          {browseMode === 'ai' && (
            <>
              {recLoading ? (
                <div className="chart-card full-width" style={{ padding: 40, textAlign: 'center', color: '#666' }}>
                  <Loader2 size={32} className="animate-spin" style={{ color: '#FFC500', margin: '0 auto 12px' }} />
                  Analyzing job specifications and running Caterpillar AI matching models...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {recommendations.map((rec) => {
                    const cartItem = selectedEquipments.find(e => e.equipment_id === rec.equipment_id)
                    const isSelected = !!cartItem
                    const qty = cartItem?.quantity || 1

                    return (
                      <div key={rec.equipment_id} className="chart-card" style={{
                        border: isSelected ? '2px solid #FFC500' : '1px solid #E5E5E5',
                        background: isSelected ? '#FFFDF5' : '#FFF',
                        padding: 18,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              {rec.is_primary && <span className="ai-rec-badge primary-badge"><Star size={10} /> Top Pick</span>}
                              <span className="ai-rec-badge fit-badge">Fit: {rec.fit_score}%</span>
                            </div>
                            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#2E2725', margin: 0 }}>{rec.equipment_name}</h3>
                            <p style={{ fontSize: 12, color: '#666', margin: '2px 0 0' }}>
                              {rec.equipment_model} • {rec.category} • <strong>₹{rec.daily_rate?.toLocaleString()}/day</strong> per unit
                            </p>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {isSelected && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FFF', border: '1px solid #FFC500', borderRadius: 6, padding: '4px 8px' }}>
                                <span style={{ fontSize: 11, color: '#666', fontWeight: 700 }}>Qty:</span>
                                <button onClick={() => updateQuantity(rec.equipment_id, -1)} style={{ border: 'none', background: '#F3F4F6', borderRadius: 4, width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Minus size={12} />
                                </button>
                                <span style={{ fontWeight: 800, fontSize: 14, minWidth: 20, textAlign: 'center', color: '#2E2725' }}>{qty}</span>
                                <button onClick={() => updateQuantity(rec.equipment_id, 1)} style={{ border: 'none', background: '#F3F4F6', borderRadius: 4, width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Plus size={12} />
                                </button>
                              </div>
                            )}

                            <button
                              className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => toggleSelectMachine(rec)}
                              style={{
                                background: isSelected ? '#16a34a' : undefined,
                                borderColor: isSelected ? '#16a34a' : undefined,
                                color: isSelected ? '#FFF' : undefined,
                                display: 'flex', alignItems: 'center', gap: 6,
                              }}
                            >
                              {isSelected ? <><Check size={14} /> Added to Order</> : <><Plus size={14} /> Add to Order</>}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* Browse Catalog List */}
          {browseMode === 'browse' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {inventory.map(eq => {
                const cartItem = selectedEquipments.find(e => e.equipment_id === eq.id)
                const isSelected = !!cartItem
                const qty = cartItem?.quantity || 1

                return (
                  <div key={eq.id} className="chart-card" style={{
                    padding: 16,
                    border: isSelected ? '2px solid #FFC500' : '1px solid #E5E5E5',
                    background: isSelected ? '#FFFDF5' : '#FFF',
                  }}>
                    <div style={{ fontWeight: 700, color: '#2E2725', fontSize: 14 }}>{eq.name}</div>
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 10 }}>{eq.category} • ₹{eq.daily_rate?.toLocaleString()}/day</div>
                    
                    {isSelected && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10, background: '#FAFAFA', padding: 6, borderRadius: 6 }}>
                        <span style={{ fontSize: 11, color: '#666' }}>Quantity:</span>
                        <button onClick={() => updateQuantity(eq.id, -1)} style={{ border: 'none', background: '#E5E7EB', borderRadius: 4, width: 22, height: 22, cursor: 'pointer' }}>-</button>
                        <span style={{ fontWeight: 800, fontSize: 13 }}>{qty}</span>
                        <button onClick={() => updateQuantity(eq.id, 1)} style={{ border: 'none', background: '#E5E7EB', borderRadius: 4, width: 22, height: 22, cursor: 'pointer' }}>+</button>
                      </div>
                    )}

                    <button
                      className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ width: '100%', background: isSelected ? '#16a34a' : undefined, borderColor: isSelected ? '#16a34a' : undefined, color: isSelected ? '#FFF' : undefined }}
                      onClick={() => toggleSelectMachine({ equipment_id: eq.id, name: eq.name, model: eq.model, category: eq.category, daily_rate: eq.daily_rate })}
                    >
                      {isSelected ? <><Check size={12} /> In Order Cart ({qty})</> : <><Plus size={12} /> Add to Order</>}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => setStep(3)}><ChevronLeft size={14} /> Back</button>
            <button className="btn btn-primary" onClick={fetchCartQuote} disabled={selectedEquipments.length === 0 || quoteLoading}>
              Proceed to Quote ({totalCartUnits} units) <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ═══ Step 5: Pricing & Quote ═══ */}
      {step === 5 && quote && (
        <div className="chart-card full-width">
          <div className="card-header"><h3 className="card-title">Order Quotation Summary</h3></div>
          
          <div style={{ padding: 20, background: 'linear-gradient(135deg, #2E2725 0%, #1a1614 100%)', borderRadius: 12, color: '#FFF', marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#FFC500', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
              Combined Quote ({quote.total_units || quote.item_count} Machine Unit(s) for {form.project_duration_days} Days)
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#FFC500' }}>₹{quote.total_price?.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
              Combined Daily Rate: ₹{quote.daily_rate?.toLocaleString()}/day • Transport & GST 18% Included
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 12, color: '#999', textTransform: 'uppercase', marginBottom: 10 }}>Selected Machines & Quantities ({selectedEquipments.length} Models)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedEquipments.map((eq, i) => (
                <div key={i} style={{ padding: 12, background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#2E2725', fontSize: 14 }}>
                      {eq.equipment_name} <span style={{ color: '#FFC500', background: '#2E2725', padding: '2px 8px', borderRadius: 4, fontSize: 11, marginLeft: 6 }}>Qty: {eq.quantity || 1}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#666' }}>{eq.category} • ₹{eq.daily_rate?.toLocaleString()}/day each (Subtotal: ₹{((eq.daily_rate || 0) * (eq.quantity || 1)).toLocaleString()}/day)</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FFF', border: '1px solid #DDD', borderRadius: 4, padding: 2 }}>
                      <button onClick={() => updateQuantity(eq.equipment_id, -1)} style={{ border: 'none', background: '#F3F4F6', borderRadius: 2, width: 20, height: 20, cursor: 'pointer' }}>-</button>
                      <span style={{ fontWeight: 700, fontSize: 12, padding: '0 4px' }}>{eq.quantity || 1}</span>
                      <button onClick={() => updateQuantity(eq.equipment_id, 1)} style={{ border: 'none', background: '#F3F4F6', borderRadius: 2, width: 20, height: 20, cursor: 'pointer' }}>+</button>
                    </div>
                    <button onClick={() => toggleSelectMachine(eq)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 4 }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => setStep(4)}><ChevronLeft size={14} /> Change Quantities</button>
            <button className="btn btn-primary" onClick={() => setStep(6)}>Review Order Details <ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {/* ═══ Step 6: Review Order ═══ */}
      {step === 6 && (
        <div className="chart-card full-width">
          <div className="card-header"><h3 className="card-title">Final Order Review</h3></div>

          <div style={{ padding: 20, background: '#FFF9E6', border: '1px solid #FFC500', borderRadius: 10, marginBottom: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#2E2725', marginBottom: 4 }}>
              Job: {form.job_type} ({form.project_duration_days} Days)
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>📍 Site Location: {form.location} • Start Date: {form.start_date}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#059669', marginTop: 8 }}>
              Total Order Price: ₹{quote?.total_price?.toLocaleString()} ({totalCartUnits} Machine Unit(s))
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => setStep(5)}><ChevronLeft size={14} /> Back</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ fontSize: 14, padding: '12px 28px' }}>
              {loading ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : <>✅ Confirm & Submit Order</>}
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
          <h3 style={{ fontSize: 22, fontWeight: 800, color: '#2E2725', marginBottom: 8 }}>Order Submitted Successfully!</h3>
          <p style={{ color: '#666', marginBottom: 4 }}>Booking Order ID: <strong>{result.booking_id?.slice(0, 8)}</strong></p>
          <p style={{ color: '#666', marginBottom: 20 }}>{result.message}</p>

          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 8, padding: 16, background: '#FFF9E6', border: '1px solid #FFC500', borderRadius: 10, marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', fontWeight: 700 }}>Ordered Machine Units ({totalCartUnits} Total)</div>
            {selectedEquipments.map((e, idx) => (
              <div key={idx} style={{ fontSize: 13, fontWeight: 700, color: '#2E2725', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Truck size={14} color="#FFC500" /> {e.quantity || 1}x {e.equipment_name} ({e.category})
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => onNavigate('rentals')}>View My Orders & Rentals</button>
            <button className="btn btn-secondary" onClick={() => { setStep(1); setResult(null); setSelectedEquipments([]); setQuote(null); setForm(prev => ({ ...prev, start_date: '', location: '' })) }}>New Booking Order</button>
          </div>
        </div>
      )}
    </div>
  )
}
