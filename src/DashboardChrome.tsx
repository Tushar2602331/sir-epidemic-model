import { Activity, AlertTriangle, CheckCircle2, CircleGauge, ShieldAlert, Stethoscope } from 'lucide-react'
import type { Params, Point } from './lib/sir'
import { formatNumber } from './lib/sir'

export function DashboardChrome({ params, point, R0, effectiveR }: { params: Params; point: Point; R0: number; effectiveR: number }) {
  const risky = effectiveR > 1
  const alerts = [
    { title: risky ? 'Transmission risk detected' : 'Transmission under control', detail: risky ? 'Effective reproduction number is above 1.0; active cases can grow.' : 'Effective reproduction number is at or below 1.0.', critical: risky },
    { title: 'Model conservation check', detail: 'The numerical solver preserves the total population at every time step.', critical: false },
    { title: 'Current hospital load signal', detail: formatNumber(point.I) + ' people are infected at day ' + point.day + '.', critical: point.I / params.population > .1 }
  ]
  return <div className="ops-shell"><aside className="ops-rail" aria-label="Dashboard sections"><Activity/><CircleGauge/><Stethoscope/><ShieldAlert/></aside><div className="ops-main"><div className="ops-status"><span><Activity size={14}/> Model active</span><span><CircleGauge size={14}/> R0 {R0.toFixed(2)}</span><span><Stethoscope size={14}/> I {formatNumber(point.I)}</span><span><ShieldAlert size={14}/> Re {effectiveR.toFixed(2)}</span></div><div className="ops-heading"><div><p className="eyebrow">EPIDEMIC OPERATIONS CENTER</p><h3>Simulation control room</h3><p>Adjust assumptions, review alerts, and verify each mathematical prediction.</p></div><span className={risky ? 'ops-badge danger-badge' : 'ops-badge safe-badge'}>{risky ? 'Monitoring required' : 'Stable trajectory'}</span></div><div className="alert-queue"><div className="queue-title"><b>Priority model signals</b><span>live</span></div>{alerts.map((alert, index) => <div className={alert.critical ? 'alert-row alert-critical' : 'alert-row'} key={alert.title}>{alert.critical ? <AlertTriangle size={17}/> : <CheckCircle2 size={17}/>}<div><b>{alert.title}</b><small>{alert.detail}</small></div><span>{index + 1}</span></div>)}</div></div></div>
}

export function ModelDrawer() {
  return <details className="model-drawer"><summary>01 / Model guide</summary><div><h3>SIR model</h3><p><b>S</b> susceptible: people who can catch infection.</p><p><b>I</b> infected: people spreading infection.</p><p><b>R</b> recovered: immune or removed from spread.</p><hr/><code>dS/dt = -beta SI/N</code><code>dI/dt = beta SI/N - gamma I</code><code>dR/dt = gamma I</code><p><b>R0 = beta/gamma</b>: the average secondary cases at the start.</p></div></details>
}
