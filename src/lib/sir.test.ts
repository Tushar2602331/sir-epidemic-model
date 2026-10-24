import { describe, expect, it } from 'vitest'
import { analyticPeak, peak, simulate, type Params } from './sir'

const baseline: Params = { beta: .4, gamma: .1, population: 1_000_000, initialInfected: 1, vaccinated: 0, days: 250, model: 'SIR', sigma: .2 }
describe('SIR RK4 solver', () => {
  it('conserves total population', () => expect(Math.max(...simulate(baseline).map(p => Math.abs(p.S + p.I + p.R - baseline.population)))).toBeLessThan(.01))
  it('matches the R0=4 analytic peak within 1%', () => expect(Math.abs(peak(simulate(baseline)).I - analyticPeak(4, baseline.population)) / analyticPeak(4, baseline.population)).toBeLessThan(.01))
  it('does not grow when R0 is below one', () => expect(peak(simulate({ ...baseline, beta: .08 })).I).toBeLessThan(2))
})
