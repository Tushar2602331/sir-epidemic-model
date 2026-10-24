import { useMemo, useState } from 'react'
import { CheckCircle2, Copy, Play, ShieldCheck } from 'lucide-react'
import { formatNumber, peak, r0, simulate, type Params, type Point } from './lib/sir'

const terms = [
  { key: 'S', title: 'Susceptible, S(t)', meaning: 'People who are not immune and can catch the disease.', unit: 'people', formula: 'S changes when new infections occur.' },
  { key: 'I', title: 'Infected, I(t)', meaning: 'People currently infectious and able to spread the disease.', unit: 'people', formula: 'I rises through infection and falls through recovery.' },
  { key: 'R', title: 'Recovered, R(t)', meaning: 'People removed from transmission through recovery, immunity or vaccination.', unit: 'people', formula: 'R increases by gamma times I.' },
  { key: 'beta', title: 'Transmission rate, beta', meaning: 'How strongly contact between a susceptible and infected person produces new infection.', unit: 'per day', formula: 'New infections = beta SI/N.' },
  { key: 'gamma', title: 'Recovery rate, gamma', meaning: 'The fraction of infected people who recover on one day. 1/gamma is the average infectious duration.', unit: 'per day', formula: 'Recoveries = gamma I.' },
  { key: 'R0', title: 'Basic reproduction number, R0', meaning: 'Expected new infections from one typical infected person in a fully susceptible population.', unit: 'dimensionless', formula: 'R0 = beta/gamma.' }
]

export function Glossary() {
  const [selected, setSelected] = useState(terms[0])
  return <div className="glossary"><div className="term-list" role="tablist" aria-label="SIR glossary">{terms.map(term => <button key={term.key} type="button" role="tab" aria-selected={selected.key === term.key} className={selected.key === term.key ? 'active-term' : ''} onClick={() => setSelected(term)}>{term.key}</button>)}</div><article className="term-detail" aria-live="polite"><p className="eyebrow">TERM EXPLAINER</p><h3>{selected.title}</h3><p>{selected.meaning}</p><div><b>Unit</b><span>{selected.unit}</span></div><div><b>In the model</b><span>{selected.formula}</span></div></article></div>
}

export function ProofPanel({ params, point }: { params: Params; point: Point }) {
  const R0 = r0(params)
  const initialS = params.population * (1 - params.vaccinated / 100) - params.initialInfected
  const invariantStart = params.initialInfected + initialS - params.population / R0 * Math.log(initialS / params.population)
  const invariantNow = point.I + point.S - params.population / R0 * Math.log(point.S / params.population)
  const residual = invariantNow - invariantStart
  const [open, setOpen] = useState<'proof' | 'check' | 'threshold'>('proof')
  return <div className="proof-workbench"><div className="proof-tabs" role="tablist" aria-label="Mathematical verification"><button type="button" className={open === 'proof' ? 'active-term' : ''} onClick={() => setOpen('proof')}>Derivation</button><button type="button" className={open === 'check' ? 'active-term' : ''} onClick={() => setOpen('check')}>Live invariant check</button><button type="button" className={open === 'threshold' ? 'active-term' : ''} onClick={() => setOpen('threshold')}>Peak test</button></div>
    {open === 'proof' && <article><h3>Why the closed-form SIR relation is valid</h3><p>Divide the infected equation by the susceptible equation, so time cancels:</p><pre>dI/dS = -1 + N/(R0 S)</pre><p>Integrating from the initial state gives an invariant that must remain constant:</p><pre>I + S - N/R0 ln(S/N) = I0 + S0 - N/R0 ln(S0/N)</pre><p>This is an exact analytical consequence of the SIR equations; RK4 is only used to trace the curve in time.</p></article>}
    {open === 'check' && <article><h3>Numerical check at day {point.day}</h3>{params.model === 'SIR' ? <><div className="proof-numbers"><span>Initial invariant <b>{invariantStart.toFixed(5)}</b></span><span>Current invariant <b>{invariantNow.toFixed(5)}</b></span><span>Difference <b>{residual.toExponential(3)}</b></span></div><p><CheckCircle2 size={16}/> A value near zero verifies that the numerical trajectory obeys the exact SIR invariant.</p></> : <p>The exposed group makes this specific two-variable SIR invariant unavailable. The solver instead checks the exact conservation law S+E+I+R=N.</p>}</article>}
    {open === 'threshold' && <article><h3>Peak condition from the differential equation</h3><p>At the infection peak, dI/dt = 0. Therefore beta S I/N = gamma I, and, for I &gt; 0:</p><pre>Speak = N/R0 = {formatNumber(params.population / R0)}</pre><p>Current S is <b>{formatNumber(point.S)}</b>. The outbreak grows whenever R0 S/N is greater than 1; it is currently <b>{(R0 * point.S / params.population).toFixed(4)}</b>.</p></article>}
  </div>
}

export function ImpactSandbox({ params, onApply }: { params: Params; onApply: (values: Partial<Params>) => void }) {
  const options: Array<{ title: string; detail: string; update: Partial<Params> }> = [
    { title: 'No action', detail: 'Keep the current settings as a reference.', update: {} },
    { title: 'Reduce contacts 40%', detail: 'Models distancing, masks or isolation by reducing beta.', update: { beta: params.beta * .6 } },
    { title: 'Vaccinate 50%', detail: 'Makes half the population immune before day zero.', update: { vaccinated: 50 } },
    { title: 'Fast recovery', detail: 'Models quicker detection and treatment by doubling gamma.', update: { gamma: Math.min(.5, params.gamma * 2) } }
  ]
  const [selected, setSelected] = useState(0)
  const scenario = options[selected]
  const simulated = useMemo(() => simulate({ ...params, ...scenario.update }), [params, scenario])
  const result = peak(simulated)
  return <div className="impact-sandbox"><div className="impact-options">{options.map((option, index) => <button type="button" key={option.title} className={selected === index ? 'impact-selected' : ''} onClick={() => setSelected(index)}><span>{index + 1}</span><b>{option.title}</b><small>{option.detail}</small></button>)}</div><article className="impact-result"><p className="eyebrow">PREDICTED OUTCOME</p><h3>{scenario.title}</h3><div className="impact-metrics"><span>Peak infected <b>{formatNumber(result.I)}</b></span><span>Peak day <b>{result.day}</b></span><span>R0 <b>{(Number(scenario.update.beta ?? params.beta) / Number(scenario.update.gamma ?? params.gamma)).toFixed(2)}</b></span></div><button className="small-primary" type="button" onClick={() => onApply(scenario.update)}><Play size={15}/> Apply to simulator</button></article></div>
}

export function CodeStudio({ matlab }: { matlab: string }) {
  const [view, setView] = useState<'code' | 'guide'>('code')
  const [copied, setCopied] = useState(false)
  const copy = async () => { await navigator.clipboard.writeText(matlab); setCopied(true); window.setTimeout(() => setCopied(false), 1800) }
  return <div className="code-studio"><div className="proof-tabs"><button type="button" className={view === 'code' ? 'active-term' : ''} onClick={() => setView('code')}>Generated code</button><button type="button" className={view === 'guide' ? 'active-term' : ''} onClick={() => setView('guide')}>How to run it</button><button className="copy-studio" type="button" onClick={copy}><Copy size={15}/>{copied ? 'Copied' : 'Copy MATLAB'}</button></div>{view === 'code' ? <pre className="generated-code">{matlab}</pre> : <ol className="code-guide"><li>Open MATLAB and create a new script.</li><li>Paste the generated code and run it.</li><li><code>ode45</code> solves the exact ODE system numerically with adaptive step sizes.</li><li>The plot shows each compartment over time; <code>max</code> reports the infection peak.</li></ol>}</div>
}
