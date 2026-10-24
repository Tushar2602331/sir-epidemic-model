import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ExternalLink, LoaderCircle, RefreshCw } from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { peak, type Params, type Point } from './lib/sir'

const locations = [
  { id: 'IND', name: 'India' },
  { id: 'USA', name: 'United States' },
  { id: 'BRA', name: 'Brazil' },
  { id: 'GBR', name: 'United Kingdom' }
]
const endpoint = 'https://ourworldindata.org/grapher/new-covid-cases-smoothed.csv'

function parseCsv(text: string, code: string) {
  const lines = text.trim().split(/\r?\n/)
  const headings = lines[0].split(',')
  const codeIndex = headings.indexOf('Code')
  const dayIndex = headings.indexOf('Day')
  const valueIndex = headings.length - 1
  return lines.slice(1).map(line => line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) ?? []).filter(row => row[codeIndex] === code).map(row => ({ day: row[dayIndex], observed: Number(row[valueIndex]) || 0 })).filter(row => row.observed > 0)
}

export function HistoricalValidation({ simulation }: { simulation: Point[] }) {
  const [country, setCountry] = useState('IND')
  const [records, setRecords] = useState<Array<{ day: string; observed: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch(endpoint)
      if (!response.ok) throw new Error('Dataset unavailable')
      setRecords(parseCsv(await response.text(), country))
    } catch { setError('Live source could not be reached. Check your connection, then retry.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [country])
  const rows = useMemo(() => {
    const selected = records.slice(0, Math.min(160, records.length))
    if (!selected.length) return []
    const observedPeak = Math.max(...selected.map(row => row.observed))
    const simulationPeak = peak(simulation).I || 1
    return selected.map((row, index) => ({ label: index + 1, reported: row.observed, model: (simulation[Math.min(index, simulation.length - 1)]?.I ?? 0) / simulationPeak * observedPeak }))
  }, [records, simulation])
  const nrmse = useMemo(() => {
    if (!rows.length) return null
    const maximum = Math.max(...rows.map(row => row.reported)) || 1
    const mse = rows.reduce((sum, row) => sum + Math.pow(row.reported - row.model, 2), 0) / rows.length
    return Math.sqrt(mse) / maximum
  }, [rows])
  return <div className="validation-panel"><div className="validation-toolbar"><div><p className="eyebrow">LIVE REFERENCE DATA</p><h3>Historical COVID-19 shape comparison</h3><p>Reported daily cases are compared with the simulated infected curve after peak normalisation.</p></div><label>Location<select value={country} onChange={event => setCountry(event.target.value)}>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><button type="button" onClick={() => void load()} aria-label="Refresh live source"><RefreshCw size={16}/> Refresh</button></div>{loading ? <p className="source-state"><LoaderCircle size={17}/> Loading the current OWID dataset…</p> : error ? <p className="source-state source-error"><AlertCircle size={17}/>{error}</p> : <><div className="validation-chart"><ResponsiveContainer width="100%" height={310}><LineChart data={rows}><CartesianGrid strokeDasharray="3 3" stroke="var(--grid)"/><XAxis dataKey="label" label={{ value: 'days after first reported case', position: 'insideBottom', offset: -3 }}/><YAxis/><Tooltip/><Legend/><Line dataKey="reported" name="Reported 7-day average" stroke="#2ac4e8" strokeWidth={2.5} dot={false}/><Line dataKey="model" name="SIR infected shape" stroke="#ff9f43" strokeWidth={2.5} strokeDasharray="6 5" dot={false}/></LineChart></ResponsiveContainer></div><div className="validation-notes"><span><b>Sample</b>{rows.length} observed days</span><span><b>Normalised RMSE</b>{nrmse === null ? '—' : nrmse.toFixed(3)}</span><span><b>Source</b><a href="https://ourworldindata.org/covid-cases" target="_blank" rel="noreferrer">OWID / WHO <ExternalLink size={13}/></a></span></div><p className="validation-disclaimer">This is a transparent shape comparison, not a clinical fit: reported confirmed cases depend on testing and reporting, whereas SIR I(t) represents active infections. Use it to assess qualitative timing and curve shape; formal calibration requires fitting beta, gamma, reporting rate, and initial conditions to a chosen window.</p></>}</div>
}
