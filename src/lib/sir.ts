export type Model = 'SIR' | 'SEIR'
export interface Params { beta: number; gamma: number; population: number; initialInfected: number; vaccinated: number; days: number; model: Model; sigma: number }
export interface Point { day: number; S: number; E: number; I: number; R: number }

const derivative = (state: number[], params: Params): number[] => {
  if (params.model === 'SEIR') {
    const [S, E, I] = state
    const infection = params.beta * S * I / params.population
    return [-infection, infection - params.sigma * E, params.sigma * E - params.gamma * I, params.gamma * I]
  }
  const [S, I] = state
  const infection = params.beta * S * I / params.population
  return [-infection, infection - params.gamma * I, params.gamma * I]
}

function rk4Stages(state: number[], step: number, params: Params) {
  const k1 = derivative(state, params)
  const k2 = derivative(state.map((value, index) => value + step * k1[index] / 2), params)
  const k3 = derivative(state.map((value, index) => value + step * k2[index] / 2), params)
  const k4 = derivative(state.map((value, index) => value + step * k3[index]), params)
  const next = state.map((value, index) => Math.max(0, value + step * (k1[index] + 2 * k2[index] + 2 * k3[index] + k4[index]) / 6))
  return { k1, k2, k3, k4, next }
}
function rk4(state: number[], step: number, params: Params) { return rk4Stages(state, step, params).next }

export function diagnoseRK4Step(point: Point, params: Params, step = 0.1) {
  const state = params.model === 'SEIR' ? [point.S, point.E, point.I, point.R] : [point.S, point.I, point.R]
  const stages = rk4Stages(state, step, params)
  const infectedIndex = params.model === 'SEIR' ? 2 : 1
  const infectedStages = [stages.k1, stages.k2, stages.k3, stages.k4].map(stage => stage[infectedIndex])
  const next = params.model === 'SEIR'
    ? { day: point.day + step, S: stages.next[0], E: stages.next[1], I: stages.next[2], R: stages.next[3] }
    : { day: point.day + step, S: stages.next[0], E: 0, I: stages.next[1], R: stages.next[2] }
  return { step, infectedStages, next }
}

export function simulate(params: Params): Point[] {
  const vaccinatedPeople = params.population * params.vaccinated / 100
  let state = params.model === 'SEIR'
    ? [params.population - vaccinatedPeople - params.initialInfected, 0, params.initialInfected, vaccinatedPeople]
    : [params.population - vaccinatedPeople - params.initialInfected, params.initialInfected, vaccinatedPeople]
  const points: Point[] = []
  const step = 0.1
  const totalSteps = Math.round(params.days / step)
  for (let tick = 0; tick <= totalSteps; tick += 1) {
    if (tick % 10 === 0) points.push(params.model === 'SEIR'
      ? { day: tick / 10, S: state[0], E: state[1], I: state[2], R: state[3] }
      : { day: tick / 10, S: state[0], E: 0, I: state[1], R: state[2] })
    state = rk4(state, step, params)
  }
  return points
}
export const peak = (points: Point[]) => points.reduce((highest, point) => point.I > highest.I ? point : highest, points[0])
export const r0 = (params: Params) => params.beta / params.gamma
export const effectiveR = (params: Params) => r0(params) * (1 - params.vaccinated / 100)
export const analyticPeak = (reproductionNumber: number, population: number) => reproductionNumber <= 1 ? 0 : population * (1 - (1 + Math.log(reproductionNumber)) / reproductionNumber)
export const formatNumber = (value: number) => Math.round(value).toLocaleString('en-IN')
