import { describe, expect, it } from 'vitest'
import { analyticPeak, diagnoseRK4Step, peak, simulate, type Params } from './sir'

const baseline: Params = { beta: .4, gamma: .1, population: 1_000_000, initialInfected: 1, vaccinated: 0, days: 250, model: 'SIR', sigma: .2 }
describe('SIR RK4 solver', () => {
  it('conserves total population', () => expect(Math.max(...simulate(baseline).map(p => Math.abs(p.S + p.I + p.R - baseline.population)))).toBeLessThan(.01))
  it('matches the R0=4 analytic peak within 1%', () => expect(Math.abs(peak(simulate(baseline)).I - analyticPeak(4, baseline.population)) / analyticPeak(4, baseline.population)).toBeLessThan(.01))
  it('does not grow when R0 is below one', () => expect(peak(simulate({ ...baseline, beta: .08 })).I).toBeLessThan(2))
})

describe('SEIR RK4 solver', () => {
  const exposed: Params = { ...baseline, model: 'SEIR', population: 250_000, initialInfected: 32, vaccinated: 18, days: 120, beta: .36, gamma: .12, sigma: .25 }
  it('starts with the requested compartments and conserves population', () => {
    const points = simulate(exposed)
    expect(points[0]).toMatchObject({ day: 0, E: 0, I: exposed.initialInfected, R: exposed.population * exposed.vaccinated / 100 })
    expect(Math.max(...points.map(point => Math.abs(point.S + point.E + point.I + point.R - exposed.population)))).toBeLessThan(.01)
  })
  it('moves new exposures through exposed to infectious without negative compartments', () => {
    const points = simulate(exposed)
    expect(points[1].E).toBeGreaterThan(0)
    expect(points[1].I).toBeGreaterThan(0)
    expect(points.every(point => point.S >= 0 && point.E >= 0 && point.I >= 0 && point.R >= 0)).toBe(true)
    expect(points).toHaveLength(exposed.days + 1)
  })
})

describe('live RK4 diagnostics', () => {
  it('reports the force-of-infection and recovery derivatives from the chosen state', () => {
    const point = simulate(baseline)[0]
    const diagnostic = diagnoseRK4Step(point, baseline)
    expect(diagnostic.infectedStages[0]).toBeCloseTo(baseline.beta * point.S * point.I / baseline.population - baseline.gamma * point.I, 10)
    expect(diagnostic.next.day).toBeCloseTo(.1, 10)
    expect(diagnostic.next.S + diagnostic.next.I + diagnostic.next.R).toBeCloseTo(baseline.population, 7)
  })
})
