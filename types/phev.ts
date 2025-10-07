export interface Car {
  id: number
  name: string
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface PhevEntry {
  id: number
  date: string
  cost: number
  km_driven: number
  notes: string | null
  car_id: number | null
  created_at: string
}

export interface PhevStats {
  totalKm: number
  totalCost: number
  entryCount: number
  costPerKm: number
  averageCostPerEntry: number
  averageKmPerEntry: number
  firstDate: string | null
  latestDate: string | null
}

export interface CarSummary {
  car: Car | null
  stats: PhevStats
  monthlyGroups: MonthlyGroup[]
  yearlyGroups: YearlyGroup[]
}

export interface MonthlyGroup {
  month: string // Format: YYYY-MM
  totalKm: number
  totalCost: number
  entries: PhevEntry[]
}

export interface YearlyGroup {
  year: string // Format: YYYY
  totalKm: number
  totalCost: number
  entryCount: number
  months: MonthlyGroup[]
}
