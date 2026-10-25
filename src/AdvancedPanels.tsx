import { useMemo, useState } from 'react'
import { Play } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatNumber, peak, r0, simulate, type Params, type Point } from './lib/sir'

const terms = [
  { key: 'S', title: 'Susceptible, S(t)', meaning: 'People who are not immune and can catch the disease.', unit: 'people', formula: 'S changes when new infections occur.' },
  { key: 'I', title: 'Infected, I(t)', meaning: 'People currently infectious and able to spread the disease.', unit: 'people', formula: 'I rises through infection and falls through recovery.' },
  { key: 'R', title: 'Recovered, R(t)', meaning: 'People removed from transmission through recovery, immunity or vaccination.', unit: 'people', formula: 'R increases by gamma times I.' },
  { key: 'beta', title: 'Transmission rate, beta', meaning: 'How strongly contact between a susceptible and infected person produces new infection.', unit: 'per day', formula: 'New infections = beta SI/N.' },
  { key: 'gamma', title: 'Recovery rate, gamma', meaning: 'The fraction of infected people who recover on one day. 1/gamma is the average infectious duration.', unit: 'per day', formula: 'Recoveries = gamma I.' },
  { key: 'R0', title: 'Basic reproduction number, R0', meaning: 'Expected new infections from one typical infected person in a fully susceptible population.', unit: 'dimensionless', formula: 'R0 = beta/gamma.' }
]

export function Glossary({ params, point }: { params: Params; point: Point }) {
  const [selected, setSelected] = useState(terms[0])
  const values: Record<string, string> = { S: formatNumber(point.S), I: formatNumber(point.I), R: formatNumber(point.R), beta: params.beta.toFixed(2), gamma: params.gamma.toFixed(2), R0: (params.beta / params.gamma).toFixed(2) }
  const meanings: Record<string, string> = { S: 'currently susceptible', I: 'currently infectious', R: 'recovered or immune at the selected day', beta: 'transmission rate per day', gamma: 'recovery rate per day', R0: 'new infections per case in a fully susceptible population' }
  return <div className="glossary"><div className="term-list" role="tablist" aria-label="Interactive SIR model values">{terms.map(term => <button key={term.key} type="button" role="tab" aria-selected={selected.key === term.key} className={(selected.key === term.key ? 'active-term ' : '') + 'term-' + term.key} onClick={() => setSelected(term)}><span>{term.key}</span><b>{values[term.key]}</b></button>)}</div><article className="term-detail" aria-live="polite"><h3>{selected.title}</h3><p>{selected.meaning}</p><div><b>Live value</b><span>{values[selected.key]} {selected.key === 'S' || selected.key === 'I' || selected.key === 'R' ? `people ${meanings[selected.key]}` : selected.key === 'R0' ? `— ${meanings[selected.key]}` : `/${selected.unit === 'per day' ? 'day' : ''}`}</span></div><div><b>In the model</b><span>{selected.formula}</span></div></article></div>
}

export function ImpactSandbox({ params, onApply }: { params: Params; onApply: (values: Partial<Params>) => void }) {
  const [selected, setSelected] = useState(0)
  const [custom, setCustom] = useState<Partial<Params>>({})
  const options: Array<{ title: string; detail: string; update: Partial<Params> }> = [
    { title: 'Current policy', detail: 'Use current model settings as the reference.', update: {} },
    { title: 'Contact reduction', detail: 'Illustrative distancing and isolation scenario.', update: { beta: params.beta * .6 } },
    { title: 'Vaccination campaign', detail: 'Illustrative pre-outbreak immunity scenario.', update: { vaccinated: 50 } },
    { title: 'Faster recovery', detail: 'Illustrative earlier detection and treatment.', update: { gamma: Math.min(.5, params.gamma * 2) } }
  ]
  const scenario = options[selected]
  const values = { ...params, ...scenario.update, ...custom }
  const update = (field: 'beta' | 'gamma' | 'vaccinated' | 'initialInfected', raw: number) => setCustom(current => ({ ...current, [field]: field === 'gamma' ? Math.max(.02, Math.min(.5, raw)) : field === 'beta' ? Math.max(0, Math.min(1, raw)) : field === 'vaccinated' ? Math.max(0, Math.min(100, raw)) : Math.max(1, Math.min(params.population * (1 - values.vaccinated / 100), raw)) }))
  const simulated = useMemo(() => simulate({ ...params, ...scenario.update, ...custom }), [params, scenario, custom])
  const result = peak(simulated)
  const reproduction = values.beta / values.gamma
  const baseline = useMemo(() => simulate(params), [params])
  const chartRows = simulated.map((point, index) => ({ day: point.day, scenario: point.I, baseline: baseline[Math.min(index, baseline.length - 1)]?.I ?? 0 }))
  const controls: Array<{ field: 'beta' | 'gamma' | 'vaccinated' | 'initialInfected'; label: string; min: number; max: number; step: number }> = [
    { field: 'beta', label: 'Transmission β', min: 0, max: 1, step: .01 },
    { field: 'gamma', label: 'Recovery γ', min: .02, max: .5, step: .01 },
    { field: 'vaccinated', label: 'Vaccinated (%)', min: 0, max: 100, step: 1 },
    { field: 'initialInfected', label: 'Initial infected I₀', min: 1, max: Math.max(1, Math.floor(params.population * (1 - values.vaccinated / 100))), step: 1 }
  ]
  return <div className="impact-sandbox"><div className="impact-options">{options.map((option, index) => <button type="button" key={option.title} className={selected === index ? 'impact-selected' : ''} onClick={() => { setSelected(index); setCustom({}) }}><span>{index + 1}</span><b>{option.title}</b><small>{option.detail}</small></button>)}</div><article className="impact-result"><p className="eyebrow">EDITABLE SCENARIO · ILLUSTRATIVE ASSUMPTIONS</p><h3>{scenario.title}</h3><p>Adjust a slider or enter a value. The projected curve and metrics update immediately.</p><div className="impact-editors">{controls.map(({ field, label, min, max, step }) => <label key={field}><span>{label}</span><div className="impact-input-pair"><input type="range" min={min} max={max} step={step} value={Math.min(max, Math.max(min, values[field]))} onChange={event => update(field, Number(event.target.value))}/><input aria-label={label + ' exact value'} type="number" min={min} max={max} step={step} value={values[field]} onChange={event => update(field, Number(event.target.value))}/></div></label>)}</div><div className="impact-chart" aria-label="Projected infected cases compared with the current baseline"><ResponsiveContainer width="100%" height={260}><AreaChart data={chartRows}><defs><linearGradient id="scenarioFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#32d8be" stopOpacity={.36}/><stop offset="100%" stopColor="#32d8be" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 4" stroke="var(--grid)"/><XAxis dataKey="day" tickFormatter={day => `D${day}`}/><YAxis tickFormatter={value => formatNumber(Number(value))}/><Tooltip labelFormatter={day => `Day ${day}`} formatter={value => [formatNumber(Number(value)), 'infected']}/><Legend/><Area type="monotone" dataKey="scenario" name="Edited scenario" stroke="#32d8be" fill="url(#scenarioFill)" strokeWidth={3}/><Line type="monotone" dataKey="baseline" name="Current baseline" stroke="#ff9f43" strokeWidth={2} strokeDasharray="6 5" dot={false}/></AreaChart></ResponsiveContainer></div><div className="impact-metrics"><span>Scenario peak <b>{formatNumber(result.I)}</b></span><span>Peak day <b>{result.day}</b></span><span>Basic R₀ <b>{reproduction.toFixed(2)}</b></span></div><button className="small-primary" type="button" onClick={() => onApply({ beta: values.beta, gamma: values.gamma, vaccinated: values.vaccinated, initialInfected: values.initialInfected })}><Play size={15}/> Apply edited scenario</button></article></div>
}
export function ManualInputPanel({ params, onChange, effectiveR }: { params: Params; onChange: (field: keyof Params, value: number) => void; effectiveR: number }) {
  const fields: Array<[keyof Params, string, number, number, number]> = [['beta','Transmission rate beta',0,1,.01],['gamma','Recovery rate gamma',.02,.5,.01],['population','Population N',10000,2000000,10000],['initialInfected','Initially infected I0',1,10000,1],['vaccinated','Vaccinated before day 0 (%)',0,100,1],['days','Simulation duration (days)',30,365,1]]
  const meaning = effectiveR > 1 ? 'Outbreak can grow: each infectious case produces more than one new infection on average at the current susceptible share.' : effectiveR < 1 ? 'Outbreak tends to decline: each infectious case produces fewer than one new infection on average at the current susceptible share.' : 'At the threshold: each infectious case replaces itself on average at the current susceptible share.'
  return <div className="manual-panel"><div><p className="eyebrow">MANUAL ENTRY & STATUS GUIDE</p><h3>Enter exact values</h3><p>These number fields update the same values used by the sliders and all calculations.</p></div><div className="manual-fields">{fields.map(([field,label,min,max,step]) => <label key={field}>{label}<input type="number" min={min} max={max} step={step} value={params[field] as number} onChange={event => onChange(field, Number(event.target.value))}/></label>)}</div><aside className={effectiveR > 1 ? 'status-explainer status-growth' : 'status-explainer status-safe'}><b>Status: {effectiveR > 1 ? 'Outbreak can grow' : effectiveR < 1 ? 'Outbreak tends to decline' : 'At growth threshold'}</b><span>{meaning}</span><small>Current Rₑ = R₀ × S(day)/N = {effectiveR.toFixed(3)}</small></aside></div>
}
