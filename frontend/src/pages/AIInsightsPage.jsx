/**
 * AIInsightsPage — Explainable AI Models & Job-Fit Matching Engine
 * Connects to: /analytics/demand-forecast, /analytics/pricing-recommendation, /analytics/job-fit
 */
import { useState, useEffect } from 'react'
import { Brain, Sparkles, TrendingUp, DollarSign, Wrench, CheckCircle2 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { FeatureSelectionBar } from './DashboardPage'

const API = 'http://localhost:8000/api/v1'

export default function AIInsightsPage() {
  const [category, setCategory] = useState('Excavator')
  const [region, setRegion] = useState('North')
  const [days, setDays] = useState(30)
  const [forecast, setForecast] = useState([])
  const [summary, setSummary] = useState(null)
  const [pricing, setPricing] = useState(null)
  const [loading, setLoading] = useState(false)

  // Job Fit Form State
  const [jobType, setJobType] = useState('excavation')
  const [weightTons, setWeightTons] = useState(10)
  const [durationDays, setDurationDays] = useState(7)
  const [jobFitResults, setJobFitResults] = useState(null)

  useEffect(() => {
    async function loadAIData() {
      setLoading(true)
      try {
        const [fRes, pRes] = await Promise.all([
          fetch(`${API}/analytics/demand-forecast?category=${category}&region=${region}&days=${days}`),
          fetch(`${API}/analytics/pricing-recommendation?category=${category}`)
        ])

        if (fRes.ok) {
          const data = await fRes.json()
          setForecast(data.forecasts || [])
          setSummary(data.summary || null)
        }
        if (pRes.ok) {
          setPricing(await pRes.json())
        }
      } catch (err) {
        console.error('AI Insights load error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAIData()
  }, [category, region, days])

  const handleJobFitSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API}/analytics/job-fit?job_type=${jobType}&weight_tons=${weightTons}&duration_days=${durationDays}`, {
        method: 'POST'
      })
      if (res.ok) {
        setJobFitResults(await res.json())
      }
    } catch (err) {
      console.error('Job fit error:', err)
    }
  }

  return (
    <div className="page-content">
      <FeatureSelectionBar 
        category={category} setCategory={setCategory}
        region={region} setRegion={setRegion}
        days={days} setDays={setDays}
        isLoading={loading} demandSummary={summary}
      />

      {/* Demand Forecast Chart */}
      <div className="chart-card full-width" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Machine Learning Demand Forecast Model</h3>
            <p className="card-subtitle">Predicted fleet demand with 95% confidence intervals</p>
          </div>
          <span className="badge badge-active"><Brain size={12} /> Model: XGBoost Regressor</span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={forecast} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="aiConfGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFC500" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#FFC500" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
            <XAxis dataKey="day" stroke="#999" fontSize={10} />
            <YAxis stroke="#999" fontSize={11} />
            <Tooltip />
            <Area type="monotone" dataKey="confidence_upper" stroke="none" fill="url(#aiConfGrad)" name="Upper Bound" />
            <Area type="monotone" dataKey="confidence_lower" stroke="none" fill="rgba(255,197,0,0.05)" name="Lower Bound" />
            <Area type="monotone" dataKey="predicted_demand" stroke="#FFC500" strokeWidth={2.5} fill="none" name="Predicted Demand" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* AI Job-Fit Recommender Section */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">AI Job-Fit Equipment Matcher</h3>
              <p className="card-subtitle">Match site requirements to ideal machine capacity</p>
            </div>
            <Sparkles size={18} style={{ color: '#FFC500' }} />
          </div>

          <form onSubmit={handleJobFitSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#666' }}>Job Task Type</label>
              <select 
                className="filter-select" 
                style={{ width: '100%', marginTop: 4 }}
                value={jobType} 
                onChange={(e) => setJobType(e.target.value)}
              >
                <option value="excavation">Excavation & Trenching</option>
                <option value="loading">Material Loading</option>
                <option value="grading">Site Grading</option>
                <option value="lifting">Heavy Lifting</option>
                <option value="hauling">Material Hauling</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#666' }}>Target Payload (Tons)</label>
                <input 
                  type="number" 
                  className="filter-select"
                  style={{ width: '100%', marginTop: 4 }} 
                  value={weightTons}
                  onChange={(e) => setWeightTons(Number(e.target.value))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#666' }}>Duration (Days)</label>
                <input 
                  type="number" 
                  className="filter-select"
                  style={{ width: '100%', marginTop: 4 }} 
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}>
              Calculate Job Fit
            </button>
          </form>
        </div>

        {/* Results Box */}
        <div className="chart-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Recommendation Results</h3>
              <p className="card-subtitle">Scored by health, capacity, and cost</p>
            </div>
          </div>

          {jobFitResults ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {jobFitResults.recommendations.map((rec, idx) => (
                <div key={idx} style={{ padding: 12, background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#2E2725' }}>{rec.name} ({rec.category})</span>
                    <span className="badge badge-active">Fit Score: {rec.fit_score}%</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{rec.reason}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Est. Cost: ₹{rec.estimated_cost?.toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
              Submit parameters to run AI job-fit matching engine
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
