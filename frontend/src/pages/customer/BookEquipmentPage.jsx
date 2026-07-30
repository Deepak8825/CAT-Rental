/**
 * BookEquipmentPage — Multi-step booking wizard
 */
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ChevronRight, ChevronLeft, CheckCircle2, Loader2 } from 'lucide-react'

const API = 'http://localhost:8000/api/v1'

export default function BookEquipmentPage({ onNavigate }) {
  const { authFetch } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    job_type: 'excavation',
    construction_type: 'construction',
    project_duration_days: 7,
    location: '',
    budget_per_day: '',
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

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const body = {
        ...form,
        project_duration_days: Number(form.project_duration_days),
        budget_per_day: form.budget_per_day ? Number(form.budget_per_day) : null,
        digging_depth_m: form.digging_depth_m ? Number(form.digging_depth_m) : null,
        payload_tons: form.payload_tons ? Number(form.payload_tons) : null,
        end_date: null,
      }
      const res = await authFetch(`${API}/customer/bookings`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setResult(await res.json())
        setStep(5)
      } else {
        const err = await res.json()
        setError(err.detail || 'Failed to create booking')
      }
    } catch (e) {
      setError('Network error')
    }
    setLoading(false)
  }

  const steps = ['Job Details', 'Site & Requirements', 'Options', 'Review', 'Confirmed']

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

      {/* Step 1: Job Details */}
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

      {/* Step 2: Site & Requirements */}
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
              <label>Budget Per Day (₹)</label>
              <input type="number" value={form.budget_per_day} onChange={e => updateForm('budget_per_day', e.target.value)} placeholder="e.g. 15000" />
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

      {/* Step 3: Options */}
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
            <button className="btn btn-primary" onClick={() => setStep(4)}>Review <ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="chart-card full-width">
          <div className="card-header"><h3 className="card-title">Review Your Booking</h3></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['Job Type', form.job_type],
              ['Construction', form.construction_type],
              ['Duration', `${form.project_duration_days} days`],
              ['Start Date', form.start_date],
              ['Location', form.location],
              ['Terrain', form.terrain_type],
              ['Budget', form.budget_per_day ? `₹${form.budget_per_day}/day` : 'Flexible'],
              ['Depth', form.digging_depth_m ? `${form.digging_depth_m}m` : 'N/A'],
              ['Payload', form.payload_tons ? `${form.payload_tons}t` : 'N/A'],
              ['Operator', form.operator_required ? '✅ Yes' : '❌ No'],
              ['Fuel', form.fuel_included ? '✅ Included' : '❌ Not included'],
              ['Delivery', form.delivery_required ? '✅ Yes' : '❌ No'],
            ].map(([label, value], i) => (
              <div key={i} style={{ padding: 10, background: '#FAFAFA', borderRadius: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#666' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#2E2725' }}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => setStep(3)}><ChevronLeft size={14} /> Back</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : 'Submit Booking Request'}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Confirmation */}
      {step === 5 && result && (
        <div className="chart-card full-width" style={{ textAlign: 'center', padding: 40 }}>
          <CheckCircle2 size={48} style={{ color: '#16a34a', marginBottom: 16 }} />
          <h3 style={{ fontSize: 20, fontWeight: 800, color: '#2E2725', marginBottom: 8 }}>Booking Request Submitted!</h3>
          <p style={{ color: '#666', marginBottom: 4 }}>Booking ID: <strong>{result.booking_id?.slice(0, 8)}</strong></p>
          <p style={{ color: '#666', marginBottom: 24 }}>{result.message}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => onNavigate('rentals')}>View My Rentals</button>
            <button className="btn btn-secondary" onClick={() => { setStep(1); setResult(null); setForm(prev => ({ ...prev, start_date: '', location: '' })) }}>Book Another</button>
          </div>
        </div>
      )}
    </div>
  )
}
