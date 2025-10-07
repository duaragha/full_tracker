import { Pool } from 'pg'
import { Car, PhevEntry, PhevStats, CarSummary, MonthlyGroup, YearlyGroup } from '@/types/phev'

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false // Railway internal network doesn't need SSL
})

// Helper to normalize date fields to strings and numbers
function normalizeEntry(entry: any): PhevEntry {
  return {
    ...entry,
    date: entry.date instanceof Date ? entry.date.toISOString().split('T')[0] : entry.date,
    cost: Number(entry.cost),
    km_driven: Number(entry.km_driven)
  }
}

// Helper to normalize car dates
function normalizeCar(car: any): Car {
  return {
    ...car,
    start_date: car.start_date instanceof Date ? car.start_date.toISOString().split('T')[0] : car.start_date,
    end_date: car.end_date instanceof Date ? car.end_date.toISOString().split('T')[0] : car.end_date
  }
}

// Cars
export async function getCars(): Promise<Car[]> {
  const result = await pool.query<Car>(
    'SELECT * FROM cars ORDER BY created_at ASC'
  )
  return result.rows.map(normalizeCar)
}

export async function addCar(name: string, startDate?: string): Promise<Car> {
  const result = await pool.query<Car>(
    'INSERT INTO cars (name, start_date, updated_at) VALUES ($1, $2, NOW()) RETURNING *',
    [name, startDate || new Date().toISOString().split('T')[0]]
  )
  return normalizeCar(result.rows[0])
}

export async function updateCar(id: number, updates: Partial<Car>): Promise<void> {
  const { name, start_date, end_date } = updates

  await pool.query(
    `UPDATE cars
     SET
       name = COALESCE($1, name),
       start_date = COALESCE($2, start_date),
       end_date = $3,
       updated_at = NOW()
     WHERE id = $4`,
    [name, start_date, end_date, id]
  )
}

export async function deleteCar(id: number): Promise<void> {
  // Set car_id to NULL for all entries belonging to this car
  await pool.query(
    'UPDATE phev_tracker SET car_id = NULL WHERE car_id = $1',
    [id]
  )

  // Delete the car
  await pool.query('DELETE FROM cars WHERE id = $1', [id])
}

// PHEV Entries
export async function getEntries(): Promise<PhevEntry[]> {
  const result = await pool.query<PhevEntry>(
    'SELECT * FROM phev_tracker ORDER BY date DESC'
  )
  return result.rows.map(normalizeEntry)
}

export async function getEntriesByCar(carId: number): Promise<PhevEntry[]> {
  const result = await pool.query<PhevEntry>(
    'SELECT * FROM phev_tracker WHERE car_id = $1 ORDER BY date DESC',
    [carId]
  )
  return result.rows.map(normalizeEntry)
}

export async function getUnassignedEntries(): Promise<PhevEntry[]> {
  const result = await pool.query<PhevEntry>(
    'SELECT * FROM phev_tracker WHERE car_id IS NULL ORDER BY date DESC'
  )
  return result.rows.map(normalizeEntry)
}

export async function addEntry(entry: Omit<PhevEntry, 'id' | 'created_at'>): Promise<PhevEntry> {
  const { date, cost, km_driven, notes, car_id } = entry

  const result = await pool.query<PhevEntry>(
    'INSERT INTO phev_tracker (date, cost, km_driven, notes, car_id, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
    [date, cost, km_driven, notes || '', car_id]
  )
  return normalizeEntry(result.rows[0])
}

export async function updateEntry(id: number, updates: Partial<PhevEntry>): Promise<void> {
  const { date, cost, km_driven, notes, car_id } = updates

  await pool.query(
    `UPDATE phev_tracker
     SET
       date = COALESCE($1, date),
       cost = COALESCE($2, cost),
       km_driven = COALESCE($3, km_driven),
       notes = COALESCE($4, notes),
       car_id = $5
     WHERE id = $6`,
    [date, cost, km_driven, notes, car_id, id]
  )
}

export async function deleteEntry(id: number): Promise<void> {
  await pool.query('DELETE FROM phev_tracker WHERE id = $1', [id])
}

export async function assignEntryToCar(entryId: number, carId: number | null): Promise<void> {
  await pool.query(
    'UPDATE phev_tracker SET car_id = $1 WHERE id = $2',
    [carId, entryId]
  )
}

export async function bulkAssignEntries(entryIds: number[], carId: number): Promise<void> {
  await pool.query(
    'UPDATE phev_tracker SET car_id = $1 WHERE id = ANY($2)',
    [carId, entryIds]
  )
}

// Statistics
export async function calculateStatsForCar(carId: number | null): Promise<PhevStats> {
  const query = carId
    ? 'SELECT * FROM phev_tracker WHERE car_id = $1'
    : 'SELECT * FROM phev_tracker'

  const result = carId
    ? await pool.query<PhevEntry>(query, [carId])
    : await pool.query<PhevEntry>(query)

  return calculateStatsFromEntries(result.rows.map(normalizeEntry))
}

export async function calculateAllTimeStats(): Promise<PhevStats> {
  const result = await pool.query<PhevEntry>('SELECT * FROM phev_tracker')
  return calculateStatsFromEntries(result.rows.map(normalizeEntry))
}

function calculateStatsFromEntries(entries: PhevEntry[]): PhevStats {
  const totalKm = entries.reduce((sum, entry) => sum + Number(entry.km_driven), 0)
  const totalCost = entries.reduce((sum, entry) => sum + Number(entry.cost), 0)
  const entryCount = entries.length

  const costPerKm = totalKm > 0 ? totalCost / totalKm : 0
  const averageCostPerEntry = entryCount > 0 ? totalCost / entryCount : 0
  const averageKmPerEntry = entryCount > 0 ? totalKm / entryCount : 0

  const dates = entries.map(e => e.date).filter(Boolean).sort()
  const firstDate = dates.length > 0 ? dates[0] : null
  const latestDate = dates.length > 0 ? dates[dates.length - 1] : null

  return {
    totalKm,
    totalCost,
    entryCount,
    costPerKm,
    averageCostPerEntry,
    averageKmPerEntry,
    firstDate,
    latestDate
  }
}

export async function getCarSummaries(): Promise<CarSummary[]> {
  const cars = await getCars()
  const entries = await getEntries()

  // Group entries by car_id
  const entriesByCarId = new Map<number | null, PhevEntry[]>()

  entries.forEach(entry => {
    const carId = entry.car_id
    if (!entriesByCarId.has(carId)) {
      entriesByCarId.set(carId, [])
    }
    entriesByCarId.get(carId)!.push(entry)
  })

  // Create summaries for each car
  const summaries: CarSummary[] = []

  // Add summaries for existing cars
  for (const car of cars) {
    const carEntries = entriesByCarId.get(car.id) || []
    summaries.push({
      car,
      stats: calculateStatsFromEntries(carEntries),
      monthlyGroups: groupByMonth(carEntries),
      yearlyGroups: groupByYear(carEntries)
    })
  }

  // Add summary for unassigned entries
  const unassignedEntries = entriesByCarId.get(null) || []
  if (unassignedEntries.length > 0) {
    summaries.push({
      car: null,
      stats: calculateStatsFromEntries(unassignedEntries),
      monthlyGroups: groupByMonth(unassignedEntries),
      yearlyGroups: groupByYear(unassignedEntries)
    })
  }

  return summaries
}

function groupByMonth(entries: PhevEntry[]): MonthlyGroup[] {
  const groups = new Map<string, PhevEntry[]>()

  entries.forEach(entry => {
    const month = entry.date.slice(0, 7) // YYYY-MM
    if (!groups.has(month)) {
      groups.set(month, [])
    }
    groups.get(month)!.push(entry)
  })

  return Array.from(groups.entries())
    .map(([month, monthEntries]) => ({
      month,
      totalKm: monthEntries.reduce((sum, e) => sum + Number(e.km_driven), 0),
      totalCost: monthEntries.reduce((sum, e) => sum + Number(e.cost), 0),
      entries: monthEntries.sort((a, b) => b.date.localeCompare(a.date))
    }))
    .sort((a, b) => b.month.localeCompare(a.month))
}

function groupByYear(entries: PhevEntry[]): YearlyGroup[] {
  const years = new Map<string, PhevEntry[]>()

  entries.forEach(entry => {
    const year = entry.date.slice(0, 4) // YYYY
    if (!years.has(year)) {
      years.set(year, [])
    }
    years.get(year)!.push(entry)
  })

  return Array.from(years.entries())
    .map(([year, yearEntries]) => ({
      year,
      totalKm: yearEntries.reduce((sum, e) => sum + Number(e.km_driven), 0),
      totalCost: yearEntries.reduce((sum, e) => sum + Number(e.cost), 0),
      entryCount: yearEntries.length,
      months: groupByMonth(yearEntries)
    }))
    .sort((a, b) => b.year.localeCompare(a.year))
}
